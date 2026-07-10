// The data store: loads the meal-plan data, holds it in memory, and saves it back.
//
// Load order (same as the budget tracker):
//   1. GitHub (live, via the Contents API) if a token is configured — freshest, gives the SHA.
//   2. The committed data file over the network (read-only fallback, no token).
//   3. A local cache in localStorage (offline / unsaved edits).
//
// Save: writes to GitHub when a token is set (auto-save), and always keeps a local cache
// so nothing is lost between sessions even before a save reaches GitHub.

import { gh, toBase64 } from './github.js';

// Full repo path used when WRITING via the GitHub API.
const DATA_PATH = 'docs/meals/data/meals.json';
// Relative path used when READING over plain HTTP (read-only, no token).
const DATA_URL = './data/meals.json';
// Distinct cache keys so the meal planner and budget tracker don't collide.
const LS_CACHE = 'sunshine.meals.cache';
const LS_DIRTY = 'sunshine.meals.dirty';

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
    throw new Error('Could not load meal-plan data from GitHub, network, or cache.');
  },

  // Fill in any missing structure so the rest of the app can assume a shape.
  _normalise(d) {
    d = d || {};
    d.meta = d.meta || {};
    d.mealPlan = d.mealPlan || {};
    d.derived = d.derived || {};
    d.connections = d.connections || [];
    d.tubSchedule = d.tubSchedule || {};
    d.recipes = d.recipes || [];
    d.snacks = d.snacks || { selected: [], available: [] };
    d.snacks.selected = d.snacks.selected || [];
    d.snacks.available = d.snacks.available || [];
    d.pantry = d.pantry || {};
    d.shopping = d.shopping || {};
    d.shopping.have = d.shopping.have || {};
    d.shopping.got = d.shopping.got || {};
    d.shopping.checked = d.shopping.checked || {};
    d.custom = d.custom || {};
    d.custom.items = d.custom.items || [];
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
  async commit(message = 'Update meal plan') {
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

  // --- lookups -------------------------------------------------------------
  recipe(id) { return this.data.recipes.find(r => r.id === id); },

  // Resolve a meal-plan slot id to a display meal: a real recipe, a derived/leftover
  // meal (pointing back at its parent recipe), or a free slot.
  resolveMeal(id) {
    if (!id) return null;
    const direct = this.recipe(id);
    if (direct) return { id, recipe: direct, label: direct.name, emoji: direct.emoji };
    const der = this.data.derived[id];
    if (der) {
      const parent = der.of ? this.recipe(der.of) : null;
      return { id, recipe: parent, derived: der, label: der.label, emoji: der.emoji, note: der.note };
    }
    return { id, label: id, emoji: '🍽️' };
  },

  // --- mutations -----------------------------------------------------------
  toggleSnack(snackId) {
    const sel = this.data.snacks.selected;
    const i = sel.indexOf(snackId);
    if (i >= 0) sel.splice(i, 1); else sel.push(snackId);
    return this.commit(`Snacks updated — ${this.data.snacks.selected.length} picked`);
  },

  setHave(key, qty) {
    qty = Math.max(0, Number(qty) || 0);
    if (qty) this.data.shopping.have[key] = qty;
    else delete this.data.shopping.have[key];
    return this.commit('Update cupboard amounts');
  },

  toggleGot(key) {
    const g = this.data.shopping.got;
    if (g[key]) delete g[key]; else g[key] = true;
    return this.commit('Update what you already have');
  },

  toggleChecked(key) {
    const c = this.data.shopping.checked;
    if (c[key]) delete c[key]; else c[key] = true;
    return this.commit('Tick off shopping');
  },

  generateShoppingList(today) {
    this.data.shopping.generated = today;
    return this.commit('Generate shopping list 🛒');
  },

  resetShoppingList() {
    this.data.shopping.have = {};
    this.data.shopping.got = {};
    this.data.shopping.checked = {};
    this.data.shopping.generated = null;
    // Drop this week's one-off extras; keep the pinned (permanent) ones for next time.
    this.data.custom.items = this.data.custom.items.filter(i => i.permanent);
    return this.commit('Shopping done — list reset 🎉');
  },

  // --- custom / household items --------------------------------------------
  customKey(id) { return `x_${id}`; },

  addCustomItem(name) {
    name = (name || '').trim();
    if (!name) return Promise.resolve({ saved: false });
    const id = 'c_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) + '_' +
      Math.random().toString(36).slice(2, 6);
    this.data.custom.items.push({ id, name, permanent: false });
    return this.commit(`Add to list — ${name}`);
  },

  removeCustomItem(id) {
    const item = this.data.custom.items.find(i => i.id === id);
    this.data.custom.items = this.data.custom.items.filter(i => i.id !== id);
    delete this.data.shopping.checked[this.customKey(id)];
    return this.commit(`Remove from list — ${item ? item.name : id}`);
  },

  toggleCustomPermanent(id) {
    const item = this.data.custom.items.find(i => i.id === id);
    if (item) item.permanent = !item.permanent;
    return this.commit(`${item && item.permanent ? 'Pin' : 'Unpin'} — ${item ? item.name : id}`);
  }
};
