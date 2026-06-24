// The data store: loads Sunnyside data, holds it in memory, and saves it back.
//
// Load order:
//   1. GitHub (live, via the Contents API) if a token is configured — always freshest, gives us the file SHA.
//   2. The committed data file fetched over the network (read-only fallback, no token).
//   3. A local cache in localStorage (offline / unsaved edits).
//
// Save: writes to GitHub when a token is set (auto-save), and always keeps a local cache
// so nothing is lost between sessions even before a save.

import { gh, toBase64 } from './github.js';

const DATA_PATH = 'docs/data/sunnyside.json';
const PHOTO_DIR = 'docs/photos';
const LS_CACHE = 'sunnyside.cache';
const LS_DIRTY = 'sunnyside.dirty';

export const store = {
  data: null,
  sha: null,          // GitHub blob SHA of the data file (needed to update it)
  source: 'none',     // where the current data came from
  dirty: false,       // unsaved changes exist

  listeners: new Set(),
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  _emit() { this.listeners.forEach(fn => fn()); },

  async load() {
    // Try GitHub first if configured (gives us the SHA for future saves).
    if (gh.configured) {
      try {
        const file = await gh.getFile(DATA_PATH);
        if (file) {
          this.data = JSON.parse(file.contentText);
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
    // Fallback: fetch the committed file over the network (read-only without a token).
    try {
      const res = await fetch(`./data/sunnyside.json?_=${Date.now()}`);
      if (res.ok) {
        this.data = await res.json();
        this.source = gh.configured ? 'github' : 'readonly';
        this._mergeDirtyCache();
        this._emit();
        return;
      }
    } catch (e) {
      console.warn('Network load failed:', e);
    }
    // Last resort: local cache.
    const cached = localStorage.getItem(LS_CACHE);
    if (cached) {
      this.data = JSON.parse(cached);
      this.source = 'cache';
      this.dirty = localStorage.getItem(LS_DIRTY) === '1';
      this._emit();
      return;
    }
    throw new Error('Could not load Sunnyside data from GitHub, network, or cache.');
  },

  // If we have newer unsaved edits cached locally, prefer them over the freshly loaded copy.
  _mergeDirtyCache() {
    if (localStorage.getItem(LS_DIRTY) === '1') {
      const cached = localStorage.getItem(LS_CACHE);
      if (cached) {
        this.data = JSON.parse(cached);
        this.dirty = true;
      }
    }
  },

  // Mark data changed: cache locally immediately, then (if possible) auto-save to GitHub.
  async commit(message = 'Update Sunnyside data') {
    this.data.meta = this.data.meta || {};
    this.data.meta.updated = new Date().toISOString().slice(0, 10);
    localStorage.setItem(LS_CACHE, JSON.stringify(this.data));
    localStorage.setItem(LS_DIRTY, '1');
    this.dirty = true;
    this._emit();

    if (!gh.configured) return { saved: false, reason: 'no-token' };

    try {
      // Make sure we have the file's current SHA (load may have come from a fallback).
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

  // Throw away any local browser copy and re-fetch fresh from GitHub.
  async discardLocalAndReload() {
    localStorage.removeItem(LS_CACHE);
    localStorage.setItem(LS_DIRTY, '0');
    this.dirty = false;
    this.sha = null;
    await this.load();
  },

  // Upload a photo file to docs/photos and return its repo-relative path.
  // Without a token we fall back to embedding a data URL on the record.
  async savePhoto(id, dataUrl) {
    const ext = (dataUrl.match(/^data:image\/(\w+);/) || [, 'png'])[1];
    const base64 = dataUrl.split(',')[1];
    const path = `${PHOTO_DIR}/${id}.${ext}`;
    if (!gh.configured) return dataUrl; // embed inline when read-only
    // Look up an existing sha so we can overwrite (binary-safe: don't decode the image).
    let sha = null;
    try { sha = await gh.getSha(path); } catch (_) {}
    await gh.putFile(path, base64, `Add photo for ${id}`, sha);
    return `photos/${id}.${ext}`;
  },

  // Upload an album photo under a unique filename (so multiple per Sim never clash).
  async saveGalleryPhoto(id, dataUrl) {
    const ext = (dataUrl.match(/^data:image\/(\w+);/) || [, 'jpg'])[1];
    const base64 = dataUrl.split(',')[1];
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${PHOTO_DIR}/${id}-${rand}.${ext}`;
    if (!gh.configured) return dataUrl; // embed inline when read-only
    await gh.putFile(path, base64, `Add album photo for ${id}`, null);
    return `photos/${id}-${rand}.${ext}`;
  },

  // --- rotation play tracking (shared by Households, Rotation dashboard) ----
  async setRotation(val) {
    val = Math.max(1, Math.floor(val) || 1);
    this.data.meta = this.data.meta || {};
    this.data.meta.rotation = val;
    await this.commit(`Set rotation to ${val}`);
  },
  // Bump a household's days played this rotation. When every household reaches 3/3
  // the rotation rolls over and all reset to 0.
  async playDay(householdId, delta) {
    const h = this.household(householdId);
    if (!h) return;
    h.daysThisRotation = Math.max(0, Math.min(3, (h.daysThisRotation || 0) + delta));
    if (delta > 0 && this.data.households.every(x => (x.daysThisRotation || 0) >= 3)) {
      this.data.meta = this.data.meta || {};
      this.data.meta.rotation = (this.data.meta.rotation || 1) + 1;
      this.data.households.forEach(x => x.daysThisRotation = 0);
    }
    await this.commit(`Play day at ${h.name}`);
  },

  // --- deletion (also unhooks the id from anyone who referenced it) --------
  deletePerson(id) {
    this.data.people = this.data.people.filter(p => p.id !== id);
    this.data.people.forEach(p => {
      if (p.parents) p.parents = p.parents.filter(x => x !== id);
      if (p.partners) p.partners = p.partners.filter(x => x.id !== id);
      if (p.relationships) p.relationships = p.relationships.filter(r => r.id !== id);
    });
    this.data.pets.forEach(pt => { if (pt.ownerId === id) pt.ownerId = ''; });
  },
  deletePet(id) {
    this.data.pets = this.data.pets.filter(p => p.id !== id);
    this.data.people.forEach(p => { if (p.relationships) p.relationships = p.relationships.filter(r => r.id !== id); });
  },
  deleteHousehold(id) {
    this.data.households = this.data.households.filter(h => h.id !== id);
    this.data.people.forEach(p => { if (p.household === id) p.household = ''; });
    this.data.pets.forEach(p => { if (p.household === id) p.household = ''; });
  },

  // --- lookups -------------------------------------------------------------
  person(id) { return this.data.people.find(p => p.id === id); },
  pet(id) { return this.data.pets.find(p => p.id === id); },
  node(id) { return this.person(id) || this.pet(id); },
  family(id) { return this.data.families.find(f => f.id === id); },
  household(id) { return this.data.households.find(h => h.id === id); },

  childrenOf(id) {
    return this.data.people.filter(p => (p.parents || []).includes(id))
      .sort((a, b) => (a.birthOrder ?? 1e9) - (b.birthOrder ?? 1e9)); // stable: ties keep data order
  },
  siblingsOf(person) {
    if (!person.parents || !person.parents.length) return [];
    return this.data.people.filter(p =>
      p.id !== person.id && (p.parents || []).some(par => person.parents.includes(par)))
      .sort((a, b) => (a.birthOrder ?? 1e9) - (b.birthOrder ?? 1e9));
  },
  petsOf(id) { return this.data.pets.filter(p => p.ownerId === id); },

  familyColour(id) {
    const p = this.node(id);
    if (!p) return '#a89f94';
    const fam = this.family(p.family);
    return fam ? fam.colour : '#a89f94';
  }
};
