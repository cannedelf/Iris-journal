// The data store: loads Pink to Leaf data, holds it in memory, saves it back to GitHub.
//
// Load order (same as the meal planner / budget tracker):
//   1. GitHub (live, via the Contents API) if a token is configured.
//   2. The committed data file over the network (read-only fallback, no token).
//   3. A local cache in localStorage (offline / unsaved edits).

import { gh, toBase64 } from './github.js';
import { isoDate } from './plants.js';

const DATA_PATH = 'docs/plants/data/plants.json';   // repo path for WRITES
const DATA_URL = './data/plants.json';              // relative path for read-only READS
const PHOTO_DIR = 'docs/plants/photos';
const LS_CACHE = 'sunshine.plants.cache';
const LS_DIRTY = 'sunshine.plants.dirty';

export const store = {
  data: null,
  sha: null,
  source: 'none',     // github | readonly | cache
  dirty: false,

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
    throw new Error('Could not load plant data from GitHub, network, or cache.');
  },

  // Fill in any missing structure so the rest of the app can assume a shape.
  _normalise(d) {
    d = d || {};
    d.meta = d.meta || {};
    d.meta.morningStreak = d.meta.morningStreak || { count: 0, lastDate: null };
    d.bumClubs = d.bumClubs || {};
    d.plants = d.plants || [];
    for (const p of d.plants) {
      p.watering = p.watering || {};
      p.feeding = p.feeding || {};
      p.misting = p.misting || { needed: false };
      p.care = p.care || [];
      p.growth = p.growth || [];
      p.gallery = p.gallery || [];
    }
    d.fertiliser = d.fertiliser || { rounds: [] };
    d.cruise = d.cruise || { sitter: [] };
    d.incoming = d.incoming || [];
    d.dream = d.dream || [];
    d.environment = d.environment || [];
    return d;
  },

  _mergeDirtyCache() {
    if (localStorage.getItem(LS_DIRTY) === '1') {
      const cached = localStorage.getItem(LS_CACHE);
      if (cached) { this.data = this._normalise(JSON.parse(cached)); this.dirty = true; }
    }
  },

  // Mark data changed: cache locally immediately, then (if possible) auto-save to GitHub.
  async commit(message = 'Update plants') {
    this.data.meta = this.data.meta || {};
    this.data.meta.updated = isoDate(new Date());
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
  plant(id) { return (this.data.plants || []).find(p => p.id === id); },

  // --- add a plant ---------------------------------------------------------
  // Turns a name into a unique lowercase id (carole, carole_2, …).
  _makeId(name) {
    const base = (name || 'plant').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'plant';
    if (!this.plant(base)) return base;
    let n = 2; while (this.plant(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  },

  addPlant(f) {
    const name = (f.name || '').trim();
    if (!name) return Promise.resolve({ saved: false, reason: 'no-name' });
    const id = this._makeId(name);
    const bumClub = ['dry', 'moist', 'wet', 'water'].includes(f.bumClub) ? f.bumClub : 'moist';
    const isWater = bumClub === 'water';
    const p = {
      id, name,
      emoji: (f.emoji || '🌿').trim() || '🌿',
      musicianEmoji: (f.musicianEmoji || '').trim(),
      namedAfter: (f.namedAfter || '').trim(),
      species: (f.species || '').trim(),
      location: (f.location || '').trim(),
      room: f.room || '',
      pot: (f.pot || '').trim(),
      bumClub,
      watering: {
        text: (f.wateringText || '').trim(),
        intervalDays: Number(f.intervalDays) || (isWater ? 3 : 7),
        lastWatered: null,
        ...(isWater ? { label: 'Water change' } : {}),
        ...(f.dailyCheck ? { dailyCheck: true } : {})
      },
      light: (f.light || '').trim(),
      feeding: {
        text: (f.feedingText || '').trim(),
        firstFeed: (f.firstFeed || '').trim(),
        lastFed: null,
        ...(f.feedSkip ? { skip: true } : {})
      },
      misting: f.mistNeeded
        ? { needed: true, text: (f.mistingText || '').trim() || 'Mist regularly for humidity.', lastMisted: null }
        : { needed: false },
      special: (f.special || '').trim(),
      notes: (f.notes || '').trim(),
      care: [],
      growth: [],
      gallery: []
    };
    this.data.plants.push(p);
    return this.commit(`Add plant — ${name} 🌿`).then(res => ({ ...res, id }));
  },

  removePlant(id) {
    const p = this.plant(id); if (!p) return Promise.resolve({ saved: false });
    this.data.plants = this.data.plants.filter(x => x.id !== id);
    return this.commit(`Remove plant — ${p.name}`);
  },

  // --- care actions --------------------------------------------------------
  // date: an ISO string ("2026-08-08"), or omit for today, or null to clear the log.
  waterPlant(id, date) {
    const p = this.plant(id); if (!p) return Promise.resolve({ saved: false });
    p.watering.lastWatered = date === null ? null : (date || isoDate(new Date()));
    const verb = p.watering.label === 'Water change' ? 'Water changed' : 'Watered';
    return this.commit(date === null ? `Cleared ${p.name}'s watering` : `${verb} ${p.name} 💧`);
  },

  feedPlant(id, date) {
    const p = this.plant(id); if (!p) return Promise.resolve({ saved: false });
    p.feeding.lastFed = date === null ? null : (date || isoDate(new Date()));
    return this.commit(date === null ? `Cleared ${p.name}'s feed` : `Fed ${p.name} 🧴`);
  },

  mistPlant(id, date) {
    const p = this.plant(id); if (!p) return Promise.resolve({ saved: false });
    p.misting = p.misting || {};
    p.misting.lastMisted = date === null ? null : (date || isoDate(new Date()));
    return this.commit(date === null ? `Cleared ${p.name}'s misting` : `Misted ${p.name} 💦`);
  },

  // --- growth log ----------------------------------------------------------
  addGrowthNote(id, { note, leaves, src }) {
    const p = this.plant(id); if (!p) return Promise.resolve({ saved: false });
    const entry = { date: isoDate(new Date()) };
    if (note) entry.note = note;
    if (leaves != null && leaves !== '') entry.leaves = Number(leaves);
    if (src) { entry.src = src; p.gallery.unshift({ src, caption: note || '', date: entry.date }); }
    p.growth.unshift(entry);
    return this.commit(`Growth note for ${p.name} 🌱`);
  },

  removeGrowthNote(id, index) {
    const p = this.plant(id); if (!p) return Promise.resolve({ saved: false });
    p.growth.splice(index, 1);
    return this.commit(`Tidy ${p.name}'s growth log`);
  },

  // Upload a growth photo under a unique filename and return its repo-relative path.
  // Without a token we fall back to embedding the data URL inline on the record.
  async savePhoto(id, dataUrl) {
    const ext = (dataUrl.match(/^data:image\/(\w+);/) || [, 'jpg'])[1];
    const base64 = dataUrl.split(',')[1];
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${PHOTO_DIR}/${id}-${rand}.${ext}`;
    if (!gh.configured) return dataUrl; // embed inline when read-only
    await gh.putFile(path, base64, `Add growth photo for ${id}`, null);
    return `photos/${id}-${rand}.${ext}`;
  },

  // --- good morning streak -------------------------------------------------
  sayGoodMorning() {
    const s = this.data.meta.morningStreak = this.data.meta.morningStreak || { count: 0, lastDate: null };
    const todayISO = isoDate(new Date());
    if (s.lastDate === todayISO) return Promise.resolve({ saved: true, already: true });
    const yesterday = isoDate(new Date(Date.now() - 86400000));
    s.count = s.lastDate === yesterday ? (s.count || 0) + 1 : 1;
    s.lastDate = todayISO;
    return this.commit(`Good morning Stevie ☀️ (${s.count} day streak)`);
  }
};
