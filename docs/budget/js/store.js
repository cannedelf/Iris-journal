// The data store: loads the budget data, holds it in memory, and saves it back.
//
// Load order:
//   1. GitHub (live, via the Contents API) if a token is configured — freshest, gives the SHA.
//   2. The committed data file over the network (read-only fallback, no token).
//   3. A local cache in localStorage (offline / unsaved edits).
//
// Save: writes to GitHub when a token is set (auto-save), and always keeps a local cache
// so nothing is lost between sessions even before a save reaches GitHub.

import { gh, toBase64 } from './github.js';

// Full repo path used when WRITING via the GitHub API.
const DATA_PATH = 'docs/budget/data/budget.json';
// Relative path used when READING over plain HTTP (read-only, no token).
const DATA_URL = './data/budget.json';
const LS_CACHE = 'sunshine.cache';
const LS_DIRTY = 'sunshine.dirty';

let nextId = 1;
function makeId() {
  // Time-free, collision-resistant enough for a personal tracker.
  return 'spend_' + (nextId++).toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

export const store = {
  data: null,
  sha: null,          // GitHub blob SHA of the data file (needed to update it)
  source: 'none',     // where the current data came from: github | readonly | cache
  dirty: false,       // unsaved changes exist

  listeners: new Set(),
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  _emit() { this.listeners.forEach(fn => fn()); },

  async load() {
    if (gh.configured) {
      try {
        const file = await gh.getFile(DATA_PATH);
        if (file) {
          this.data = this._normalise(JSON.parse(file.contentText));
          this.sha = file.sha;
          this.source = 'github';
          this._mergeDirtyCache();
          this._emit();
          return;
        }
      } catch (e) {
        console.warn('GitHub load failed, falling back:', e);
      }
    }
    try {
      const res = await fetch(`${DATA_URL}?_=${Date.now()}`);
      if (res.ok) {
        this.data = this._normalise(await res.json());
        this.source = gh.configured ? 'github' : 'readonly';
        this._mergeDirtyCache();
        this._emit();
        return;
      }
    } catch (e) {
      console.warn('Network load failed:', e);
    }
    const cached = localStorage.getItem(LS_CACHE);
    if (cached) {
      this.data = this._normalise(JSON.parse(cached));
      this.source = 'cache';
      this.dirty = localStorage.getItem(LS_DIRTY) === '1';
      this._emit();
      return;
    }
    throw new Error('Could not load budget data from GitHub, network, or cache.');
  },

  // Fill in any missing structure so the rest of the app can assume a shape.
  _normalise(d) {
    d = d || {};
    d.meta = d.meta || {};
    d.meta.weeklyBudget = d.meta.weeklyBudget ?? 50;
    d.meta.categories = d.meta.categories || [];
    d.meta.funds = d.meta.funds || {};
    d.meta.debts = d.meta.debts || {};
    d.meta.cardHistory = d.meta.cardHistory || [];
    d.entries = d.entries || [];
    // Migrate the Golden Drawer's old single `trip` into the new trips[] queue.
    const h = d.meta.funds.holiday;
    if (h) {
      h.trips = h.trips || [];
      h.funded = h.funded || [];
      if (h.trip && h.trip.name && !h.trips.length) {
        h.trips.push({ id: 'trip_' + Math.random().toString(36).slice(2, 7), name: h.trip.name, emoji: '✈️', target: h.trip.target, fundBy: null });
      }
      delete h.trip;
    }
    return d;
  },

  _mergeDirtyCache() {
    if (localStorage.getItem(LS_DIRTY) === '1') {
      const cached = localStorage.getItem(LS_CACHE);
      if (cached) {
        this.data = this._normalise(JSON.parse(cached));
        this.dirty = true;
      }
    }
  },

  // Mark data changed: cache locally immediately, then (if possible) auto-save to GitHub.
  // Returns { saved, reason? } so the UI can show what happened.
  async commit(message = 'Update budget') {
    this.data.meta = this.data.meta || {};
    this.data.meta.updated = new Date().toISOString().slice(0, 10);
    localStorage.setItem(LS_CACHE, JSON.stringify(this.data));
    localStorage.setItem(LS_DIRTY, '1');
    this.dirty = true;
    this._emit();

    if (!gh.configured) return { saved: false, reason: 'no-token' };

    try {
      if (!this.sha) { const ex = await gh.getFile(DATA_PATH); this.sha = ex && ex.sha; }
      const json = JSON.stringify(this.data, null, 2);
      this.sha = await gh.putFile(DATA_PATH, toBase64(json), message, this.sha);
      this.dirty = false;
      localStorage.setItem(LS_DIRTY, '0');
      this._emit();
      return { saved: true };
    } catch (e) {
      console.error('Auto-save failed:', e);
      return { saved: false, reason: 'error', error: e };
    }
  },

  async discardLocalAndReload() {
    localStorage.removeItem(LS_CACHE);
    localStorage.setItem(LS_DIRTY, '0');
    this.dirty = false;
    this.sha = null;
    await this.load();
  },

  // --- entries -------------------------------------------------------------
  category(key) { return this.data.meta.categories.find(c => c.key === key); },

  async addEntry({ date, amount, category, note }) {
    const entry = {
      id: makeId(),
      date,
      amount: Math.round(Number(amount) * 100) / 100,
      category,
      note: (note || '').trim()
    };
    this.data.entries.push(entry);
    const cat = this.category(category);
    const res = await this.commit(`Log £${entry.amount.toFixed(2)} — ${cat ? cat.label : category}`);
    return { entry, res };
  },

  async updateEntry(id, patch) {
    const e = this.data.entries.find(x => x.id === id);
    if (!e) return { saved: false };
    if (patch.amount != null) patch.amount = Math.round(Number(patch.amount) * 100) / 100;
    Object.assign(e, patch);
    return this.commit(`Edit spend — ${e.note || e.category}`);
  },

  async deleteEntry(id) {
    const e = this.data.entries.find(x => x.id === id);
    this.data.entries = this.data.entries.filter(x => x.id !== id);
    return this.commit(`Delete spend — ${e ? (e.note || e.category) : id}`);
  },

  // --- meta / settings -----------------------------------------------------
  async setBudgets(patch) {
    Object.assign(this.data.meta, patch);
    return this.commit('Update budgets');
  },

  async setCategories(categories) {
    this.data.meta.categories = categories;
    return this.commit('Update categories');
  },

  // --- funds & debts trackers ---------------------------------------------
  _round(n) { return Math.round((Number(n) || 0) * 100) / 100; },

  // Record a month-end sort: top up the funds, log the card total, remember the tier.
  async recordSort({ chase, holiday, card, periodKey, tier, leftover }) {
    const f = this.data.meta.funds;
    if (f.emergency) f.emergency.balance = this._round((f.emergency.balance || 0) + chase);
    if (f.holiday) f.holiday.balance = this._round((f.holiday.balance || 0) + holiday);
    const hist = this.data.meta.cardHistory;
    const existing = hist.find(h => h.period === periodKey);
    if (existing) existing.amount = this._round(card);
    else hist.push({ period: periodKey, amount: this._round(card) });
    if (tier) this.data.meta.lastSort = { tier, leftover: this._round(leftover), period: periodKey };
    return this.commit('Record month-end sort');
  },

  // Remember the current tier for the Home badge, without moving any money.
  async pinTier({ tier, leftover, periodKey }) {
    this.data.meta.lastSort = { tier, leftover: this._round(leftover), period: periodKey };
    return this.commit('Update tier badge');
  },

  // Log a savings movement: money in (from external), out (spent), or between accounts.
  // `to`/`from` empty = external; a fund key = that account.
  async addTransfer({ to, from, amount, note }) {
    const amt = this._round(amount);
    const f = this.data.meta.funds;
    const toF = f[to], fromF = f[from];
    if (toF) toF.balance = this._round((toF.balance || 0) + amt);
    if (fromF) fromF.balance = this._round((fromF.balance || 0) - amt);
    const n = note ? ` (${note})` : '';
    let msg;
    if (fromF && toF) msg = `Move £${amt.toFixed(2)}: ${fromF.label} → ${toF.label}${n}`;
    else if (fromF) msg = `Spend £${amt.toFixed(2)} from ${fromF.label}${n}`;
    else if (toF) msg = `Add £${amt.toFixed(2)} to ${toF.label}${n}`;
    else msg = `Savings movement £${amt.toFixed(2)}${n}`;
    return this.commit(msg);
  },

  // --- Golden Drawer holiday queue ----------------------------------------
  _hol() { const h = this.data.meta.funds.holiday; if (h) { h.trips = h.trips || []; h.funded = h.funded || []; } return h; },
  _tripId() { return 'trip_' + Math.random().toString(36).slice(2, 7); },

  async addTrip({ name, emoji, target, fundBy }) {
    const h = this._hol(); if (!h) return { saved: false };
    h.trips.push({ id: this._tripId(), name, emoji: emoji || '✈️', target: this._round(target), fundBy: fundBy || null });
    return this.commit(`Add trip: ${name}`);
  },
  async updateTrip(id, patch) {
    const h = this._hol(); if (!h) return { saved: false };
    const t = h.trips.find(x => x.id === id); if (!t) return { saved: false };
    if (patch.target != null) patch.target = this._round(patch.target);
    Object.assign(t, patch);
    return this.commit(`Edit trip: ${t.name}`);
  },
  async removeTrip(id) {
    const h = this._hol(); if (!h) return { saved: false };
    const t = h.trips.find(x => x.id === id);
    h.trips = h.trips.filter(x => x.id !== id);
    return this.commit(`Remove trip: ${t ? t.name : id}`);
  },
  // Move a trip up (-1) or down (+1) the queue.
  async moveTrip(id, dir) {
    const h = this._hol(); if (!h) return { saved: false };
    const i = h.trips.findIndex(x => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= h.trips.length) return { saved: false };
    [h.trips[i], h.trips[j]] = [h.trips[j], h.trips[i]];
    return this.commit(`Reorder trips`);
  },
  // Book a funded trip: archive it as a trophy and take its cost out of the drawer.
  async bookTrip(id, date) {
    const h = this._hol(); if (!h) return { saved: false };
    const t = h.trips.find(x => x.id === id); if (!t) return { saved: false };
    h.trips = h.trips.filter(x => x.id !== id);
    h.funded.push({ id: t.id, name: t.name, emoji: t.emoji, target: this._round(t.target), fundedDate: date });
    h.balance = this._round((h.balance || 0) - (Number(t.target) || 0));
    return this.commit(`🏆 Booked ${t.name}!`);
  },
  async setHolidayRate(rate) {
    const h = this._hol(); if (!h) return { saved: false };
    h.monthlyRate = this._round(rate);
    return this.commit('Update holiday savings rate');
  },

  // Log a Widdle repayment; it feeds the holiday fund.
  async addWiddlePayment({ date, amount }) {
    const w = this.data.meta.debts.widdle;
    if (!w) return { saved: false };
    w.payments = w.payments || [];
    w.payments.push({ date, amount: this._round(amount) });
    const h = this.data.meta.funds.holiday;
    if (h) h.balance = this._round((h.balance || 0) + amount);
    return this.commit(`Widdle repayment £${this._round(amount).toFixed(2)}`);
  },

  // Manually set (or clear) the start date of the pay period anchored in `key` ("YYYY-MM").
  async setPeriodOverride(key, date) {
    this.data.meta.periodOverrides = this.data.meta.periodOverrides || {};
    if (date) this.data.meta.periodOverrides[key] = date;
    else delete this.data.meta.periodOverrides[key];
    return this.commit(date ? `Start month ${key} on ${date}` : `Clear early start for ${key}`);
  },

  async setNovunaEndDate(date) {
    if (!this.data.meta.debts.novuna) return { saved: false };
    this.data.meta.debts.novuna.endDate = date || null;
    return this.commit('Set Novuna end date');
  },

  // Merge edits into a fund (balance/target/monthly) from settings.
  async setFund(key, patch) {
    this.data.meta.funds[key] = { ...(this.data.meta.funds[key] || {}), ...patch };
    return this.commit(`Update ${key} fund`);
  }
};
