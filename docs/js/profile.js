// Profile cards: the full, photo-album-style view of a Sim or pet, plus editing.
// Opens as a slide-over panel. Navigation chips (parents / partner / children / siblings)
// let you move up and down the generations.

import { store } from './store.js';
import {
  ASPIRATIONS, STAR_SIGNS, SKILLS, LIFE_STAGES, PERSONALITY, CAREER_TRACKS, OTH,
  BODY_FRAMES, REL_TYPES, PET_SPECIES, SIM_TYPES, typeMeta, glyphFor,
  BADGE_TYPES, BADGE_LEVELS, BADGE_EMOJI
} from './constants.js';

const panel = () => document.getElementById('panel');
const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byName = (a, b) => (a.display || a.name || '').toLowerCase().localeCompare((b.display || b.name || '').toLowerCase());
const sortedPeople = () => [...store.data.people].sort(byName);
const sortedPets = () => [...store.data.pets].sort(byName);

export function openProfile(id) {
  const node = store.node(id);
  if (!node) return;
  const p = panel();
  p.classList.add('open');
  p.innerHTML = store.pet(id) ? petView(node) : simView(node);
  wireView(node);
}

function closePanel() { panel().classList.remove('open'); panel().innerHTML = ''; }

// ---------- creating new Sims & pets ---------------------------------------
function uid(prefix) { let id; do { id = prefix + '_' + Math.random().toString(36).slice(2, 8); } while (store.node(id)); return id; }

function blankSim() {
  return {
    id: uid('sim'), kind: 'sim', type: 'Human', name: '', display: '', emoji: '👶',
    family: '', household: '', preMarriageName: '', lifeStage: 'Baby', daysRemaining: null, generation: '',
    photo: null, aspiration: '', secondaryAspiration: '', lifetimeWant: '', starSign: '',
    personality: {}, turnOn1: '', turnOn2: '', turnOff: '', oth: '', bodyFrame: '',
    career: {}, skills: {}, genetics: {}, parents: [], partners: [], relationships: [],
    moments: [], lockedWants: [], fears: [], car: '', carNotes: '', _isNew: true
  };
}
function blankPet() {
  return {
    id: uid('pet'), name: '', emoji: '🐾', species: '', breed: '', ownerId: '', household: '',
    starSign: '', collar: '', personality: [], kibbled: false, kibbledNote: '',
    petBestFriend: false, petBestFriendNote: '', photo: null, moments: [], _isNew: true
  };
}
export function openNewSim() { const s = blankSim(); panel().classList.add('open'); panel().innerHTML = simEditor(s); wireEditor(s, false); }
export function openNewPet() { const p = blankPet(); panel().classList.add('open'); panel().innerHTML = petEditor(p); wireEditor(p, true); }

// ---------- households -----------------------------------------------------
function householdEditor(h) {
  return `<form class="editor" id="editForm">
    <div class="editor-head"><h2>${h._isNew ? 'New household' : 'Edit ' + esc(h.name)}</h2>
      <div class="editor-actions"><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save</button></div></div>
    <fieldset><legend>🏠 Household</legend>
      ${row('Name', textField('name', h.name, 'Sunshine Cottage'))}
      ${row('Emoji', textField('emoji', h.emoji, '🏠'))}
      ${row('Location', textField('location', h.location, 'Sunnyside, near the shops'))}
      ${row('Key features', textField('features', h.features, 'Yellow door, art studio…'))}
      ${row('Moved in', textField('movedIn', h.movedIn, 'e.g. 2026-06-07'))}
    </fieldset>
    <div class="editor-foot">${h._isNew ? '' : '<button type="button" data-delete-hh class="danger">🗑 Delete</button>'}<span class="spacer"></span><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save changes</button></div>
  </form>`;
}
// ---------- community lots --------------------------------------------------
function lotEditor(l) {
  return `<form class="editor" id="editForm">
    <div class="editor-head"><h2>${l._isNew ? 'New community lot' : 'Edit ' + esc(l.name)}</h2>
      <div class="editor-actions"><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save</button></div></div>
    <fieldset><legend>🏘️ Community Lot</legend>
      ${row('Name', textField('name', l.name, 'The Golden Anchor'))}
      ${row('Emoji', textField('emoji', l.emoji, '🍺'))}
      ${row('Status', textField('status', l.status, 'Open / Needs Revamp / Not Built…'))}
      ${row('Notes', textField('notes', l.notes, ''))}
    </fieldset>
    <div class="editor-foot">${l._isNew ? '' : '<button type="button" data-delete-lot class="danger">🗑 Delete</button>'}<span class="spacer"></span><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save changes</button></div>
  </form>`;
}
export function openNewLot() { const l = { name: '', emoji: '🏠', status: '', notes: '', _isNew: true }; panel().classList.add('open'); panel().innerHTML = lotEditor(l); wireLotEditor(l, -1); }
export function openLot(index) { const l = (store.data.lots || [])[index]; if (!l) return; panel().classList.add('open'); panel().innerHTML = lotEditor(l); wireLotEditor(l, index); }
function wireLotEditor(l, index) {
  const form = document.getElementById('editForm');
  form.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', closePanel));
  const del = form.querySelector('[data-delete-lot]');
  if (del) del.addEventListener('click', async () => {
    if (!confirm(`Delete the "${l.name}" lot?`)) return;
    store.data.lots.splice(index, 1);
    await store.commit(`Delete lot ${l.name}`);
    window.dispatchEvent(new CustomEvent('data-updated'));
    closePanel();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    l.name = val(form, 'name'); l.emoji = val(form, 'emoji'); l.status = val(form, 'status'); l.notes = val(form, 'notes');
    if (l._isNew) { delete l._isNew; store.data.lots = store.data.lots || []; store.data.lots.push(l); }
    const res = await store.commit(`Update lot ${l.name || ''}`);
    window.dispatchEvent(new CustomEvent('data-updated'));
    closePanel();
    if (!res.saved) flashSaveWarning(res.reason);
  });
}

export function openNewHousehold() { const h = { id: uid('hh'), name: '', emoji: '🏠', location: '', features: '', movedIn: '', _isNew: true }; panel().classList.add('open'); panel().innerHTML = householdEditor(h); wireHouseholdEditor(h); }
export function openHousehold(id) { const h = store.household(id); if (!h) return; panel().classList.add('open'); panel().innerHTML = householdEditor(h); wireHouseholdEditor(h); }

function wireHouseholdEditor(h) {
  const form = document.getElementById('editForm');
  form.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', closePanel));
  const del = form.querySelector('[data-delete-hh]');
  if (del) del.addEventListener('click', async () => {
    if (!confirm(`Delete the "${h.name}" household? The Sims aren't deleted — they're just left without a home set.`)) return;
    store.deleteHousehold(h.id);
    await store.commit(`Delete household ${h.name}`);
    window.dispatchEvent(new CustomEvent('data-updated'));
    closePanel();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const isNew = !!h._isNew;
      h.name = val(form, 'name'); h.emoji = val(form, 'emoji'); h.location = val(form, 'location');
      h.features = val(form, 'features'); h.movedIn = val(form, 'movedIn');
      if (isNew) { delete h._isNew; store.data.households.push(h); }
      const res = await store.commit(`${isNew ? 'Add' : 'Update'} household ${h.name || ''}`);
      window.dispatchEvent(new CustomEvent('data-updated'));
      closePanel();
      if (!res.saved) flashSaveWarning(res.reason);
    } catch (err) { alert('Could not save: ' + err.message); btn.disabled = false; btn.textContent = 'Save changes'; }
  });
}

// ---------- shared bits ----------------------------------------------------
function photoBlock(node) {
  const fam = store.family(node.family) || {};
  if (node.photo) return `<div class="photo" style="border-color:${fam.colour}"><img src="${esc(node.photo)}" alt=""></div>`;
  return `<div class="photo placeholder" style="border-color:${fam.colour};background:${fam.soft || '#eee'}"><span>${esc(node.emoji || '👤')}</span></div>`;
}

function chip(id) {
  const n = store.node(id);
  if (!n) return `<span class="rel-chip missing">${esc(id)}</span>`;
  return `<button class="rel-chip" data-open="${esc(id)}" style="border-color:${store.familyColour(id)}">${esc(n.emoji || '👤')} ${esc(n.display || n.name)}</button>`;
}

function bar(label, val, max = 10) {
  const pct = Math.round((Number(val) || 0) / max * 100);
  return `<div class="bar-row"><span class="bar-label">${esc(label)}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
    <span class="bar-val">${val == null ? '–' : val}</span></div>`;
}

// ---------- Sim view -------------------------------------------------------
function simView(s) {
  const fam = store.family(s.family) || {};
  const hh = store.household(s.household);
  const parents = (s.parents || []).map(chip).join(' ') || '<span class="muted">—</span>';
  const partner = (s.partners || []).map(pr => chip(pr.id)).join(' ') || '<span class="muted">—</span>';
  const kids = store.childrenOf(s.id).map(c => chip(c.id)).join(' ') || '<span class="muted">—</span>';
  const sibs = store.siblingsOf(s).map(c => chip(c.id)).join(' ') || '<span class="muted">—</span>';
  const pets = store.petsOf(s.id).map(pt => chip(pt.id)).join(' ') || '<span class="muted">—</span>';
  const pTotal = PERSONALITY.reduce((t, a) => t + (Number(s.personality?.[a.key]) || 0), 0);
  const g = s.genetics || {};

  const isAnc = s.kind === 'ancestor';

  const moments = (s.moments || []).length
    ? `<table class="moments"><tbody>${s.moments.map(m =>
        `<tr><td class="mr">${esc(m.rotation || '')}</td><td>${esc(m.event)}<span class="mn">${esc(m.notes || '')}</span></td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No moments logged yet.</p>';

  const rels = (s.relationships || []).length
    ? `<table class="rels"><tbody>${s.relationships.map(r =>
        `<tr><td>${chip(r.id)}</td><td>${esc(r.type || '')}</td><td>${bolts(r.bolts)}</td><td class="mn">${esc(r.notes || '')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No relationships logged yet.</p>';

  const head = `
    <div class="profile-head">
      <button class="close" data-close>✕</button>
      <button class="edit" data-edit>✎ Edit</button>
      ${photoBlock(s)}
      <div class="head-text">
        <h2>${esc(s.emoji || '')} ${esc(s.name)} ${(s.type && s.type !== 'Human') ? `<span class="type-tag">${typeMeta(s.type).emoji} ${esc(s.type)}</span>` : ''} ${s.adopted ? '<span class="type-tag">❤️ Adopted</span>' : ''} ${s.yellowBow ? '<span class="type-tag">🎀</span>' : ''}</h2>
        <p class="head-sub">${[fam.name && fam.emoji + ' ' + fam.name, hh && hh.name, s.generation].filter(Boolean).map(esc).join(' · ')}</p>
        ${isAnc ? `<p class="anc-banner">Ancestor node — origin point for genetics (non-playable)</p>` : ''}
        ${s.oneLiner ? `<p class="oneliner">“${esc(s.oneLiner)}”</p>` : ''}
      </div>
    </div>`;

  if (isAnc) {
    return `<div class="profile" style="--fam:${fam.colour || '#a89f94'}">
      ${head}
      <div class="nav-block">
        <div><strong>💍 Partner</strong> ${partner}</div>
        <div><strong>⬇ Children</strong> ${kids}</div>
      </div>
      ${ancestorBody(g)}
    </div>`;
  }

  const currentLevel = s.career?.levelName ? `${s.career.levelName}${s.career.level ? ' — Level ' + s.career.level : ''}` : (s.career?.level || '');

  return `
  <div class="profile" style="--fam:${fam.colour || '#a89f94'}">
    ${head}
    <nav class="profile-tabs">
      <button data-ptab="overview" class="active">📋 Overview</button>
      <button data-ptab="career">💼 Career</button>
      <button data-ptab="rel">💕 Relationships</button>
      <button data-ptab="genetics">🧬 Genetics</button>
      <button data-ptab="history">📖 History</button>
    </nav>

    <div class="ptab" data-panel="overview">
      <section><h3>Identity</h3>
        <dl class="kv">
          ${kv('Display name', s.display)}
          ${kv('Household', hh ? hh.name : '')}
          ${kv('Family', fam.name)}
          ${kv('Pre-marriage name', s.preMarriageName)}
          ${kv('Life stage', s.lifeStage)}
          ${kv('Days remaining', s.daysRemaining)}
          ${kv('Generation', s.generation)}
          ${s.yellowBow ? kv('Club', '🎀 Yellow bow club') : ''}
        </dl>
      </section>
      ${lifespanView(s)}
      <section><h3>Sims 2 Mechanics</h3>
        <dl class="kv">
          ${kv('Aspiration', s.aspiration)}
          ${kv('Secondary', s.secondaryAspiration)}
          ${kv('Lifetime want', s.lifetimeWant)}
          ${kv('Star sign', s.starSign ? `${s.starSign} ${glyphFor(s.starSign)}` : '')}
          ${kv('Turn on 1', s.turnOn1)}
          ${kv('Turn on 2', s.turnOn2)}
          ${kv('Turn off', s.turnOff)}
          ${kv('One True Hobby', s.oth)}
          ${kv('Body frame', s.bodyFrame)}
        </dl>
        <h4>Personality <span class="${pTotal === 25 ? 'ok' : 'warn'}">(total ${pTotal}/25)</span></h4>
        ${PERSONALITY.map(a => bar(a.high, s.personality?.[a.key])).join('')}
      </section>
      ${trackerView(s)}
    </div>

    <div class="ptab" data-panel="career" hidden>
      <section><h3>Career</h3>
        <dl class="kv">
          ${kv('Track', s.career?.track)}
          ${kv('Current level', currentLevel)}
          ${kv('Top of career', s.career?.top)}
          ${kv('Degree', s.career?.degree)}
        </dl>
        <p class="future-note">⏳ Promotion requirements — coming soon!</p>
      </section>
      <section><h3>Skills</h3>
        ${SKILLS.map(k => bar(k[0].toUpperCase() + k.slice(1), s.skills?.[k])).join('')}
      </section>
      ${badgesView(s)}
    </div>

    <div class="ptab" data-panel="rel" hidden>
      <div class="nav-block">
        <div><strong>⬆ Parents</strong> ${parents}</div>
        <div><strong>💍 Partner</strong> ${partner}</div>
        <div><strong>⬇ Children</strong> ${kids}</div>
        <div><strong>↔ Siblings</strong> ${sibs}</div>
        <div><strong>🐾 Pets</strong> ${pets}</div>
      </div>
      <section><h3>Relationships</h3>${rels}</section>
    </div>

    <div class="ptab" data-panel="genetics" hidden>
      <section><h3>Genetics 🧬</h3>
        <dl class="kv">
          ${kv('Hair (visible)', g.hairVisible)}
          ${kv('Hair (hidden)', g.hairHidden)}
          ${kv('Eyes (visible)', g.eyesVisible)}
          ${kv('Eyes (hidden)', g.eyesHidden)}
          ${kv('Skin tone', g.skin)}
          ${kv('Freckles', g.freckles)}
          ${kv('Notable features', g.notable)}
          ${kv('From mum', g.fromMum)}
          ${kv('From dad', g.fromDad)}
        </dl>
        ${g.notes ? `<p class="gen-notes">${esc(g.notes)}</p>` : ''}
        <button class="predict-link" data-predict="${esc(s.id)}">🧬 Open in Predictor with ${esc(s.display || s.name)}</button>
      </section>
    </div>

    <div class="ptab" data-panel="history" hidden>
      <section><h3>Key Moments 📖</h3>${moments}</section>
      ${(s.lockedWants || []).length || (s.fears || []).length ? `<section><h3>Locked Wants & Fears</h3>
        <ul class="wants">${(s.lockedWants || []).map(w => `<li>🔒 ${esc(w)}</li>`).join('')}
        ${(s.fears || []).map(w => `<li>⚠️ ${esc(w)}</li>`).join('')}</ul></section>` : ''}
      ${s.car ? `<section><h3>Car 🚗</h3><dl class="kv">${kv('Car', s.car)}${kv('Notes', s.carNotes)}</dl></section>` : ''}
    </div>
  </div>`;
}

function ancestorBody(g) {
  return `<section><h3>Genetics they pass down 🧬</h3>
    <dl class="kv">
      ${kv('Hair', g.hairVisible)}
      ${kv('Eyes', g.eyesVisible)}
      ${kv('Skin tone', g.skin)}
      ${kv('Freckles', g.freckles)}
      ${kv('Notable', g.notable)}
    </dl>
    ${g.notes ? `<p class="gen-notes">${esc(g.notes)}</p>` : ''}
  </section>`;
}

function petView(pt) {
  const fam = store.family((store.node(pt.ownerId) || {}).family) || {};
  const hh = store.household(pt.household);
  return `
  <div class="profile pet-profile" style="--fam:${fam.colour || '#a89f94'}">
    <div class="profile-head">
      <button class="close" data-close>✕</button>
      <button class="edit" data-edit>✎ Edit</button>
      ${photoBlock(pt)}
      <div class="head-text">
        <h2>${esc(pt.emoji || '🐾')} ${esc(pt.name)}</h2>
        <p class="head-sub">${[pt.species, pt.breed].filter(Boolean).map(esc).join(' · ')}</p>
      </div>
    </div>
    <div class="nav-block"><div><strong>Owner</strong> ${pt.ownerId ? chip(pt.ownerId) : '<span class="muted">—</span>'}</div></div>
    <section><h3>Pet Details</h3>
      <dl class="kv">
        ${kv('Household', hh ? hh.name : '')}
        ${kv('Star sign', pt.starSign)}
        ${kv('Collar', pt.collar)}
        ${kv('Personality', (pt.personality || []).join(', '))}
        ${kv('Kibbled?', pt.kibbled ? 'Yes — ' + (pt.kibbledNote || '') : 'No')}
        ${kv('Pet Best Friend?', pt.petBestFriend ? 'YES — ' + (pt.petBestFriendNote || '') : (pt.petBestFriendNote || 'No'))}
      </dl>
    </section>
    <section><h3>Key Moments 📖</h3>
      ${(pt.moments || []).length ? `<table class="moments"><tbody>${pt.moments.map(m =>
        `<tr><td>${esc(m.event)}<span class="mn">${esc(m.notes || '')}</span></td></tr>`).join('')}</tbody></table>`
        : '<p class="muted">No moments yet.</p>'}
    </section>
  </div>`;
}

// 🏆 Lifetime-want progress tracker (e.g. Iris's 20 pet best friends).
function trackerView(s) {
  const t = s.tracker;
  if (!t || !(t.target || (t.items || []).length)) return '';
  const items = t.items || [];
  const done = items.filter(i => i.done).length;
  const target = t.target || items.length || 0;
  const pct = target ? Math.min(100, Math.round(done / target * 100)) : 0;
  const rows = items.map(i => `<li>${i.done ? '✅' : '⬜'} ${i.id && store.node(i.id) ? chip(i.id) : esc(i.label || i.id)}</li>`).join('');
  return `<section><h3>🏆 Lifetime Want Progress</h3>
    ${s.lifetimeWant ? `<p class="lw-want">${esc(s.lifetimeWant)}</p>` : ''}
    <div class="lw-bar"><span style="width:${pct}%"></span></div>
    <p class="lw-count">${done}/${target}</p>
    ${items.length ? `<ul class="lw-list">${rows}</ul>` : '<p class="muted">No progress logged yet — add some in Edit.</p>'}
  </section>`;
}

// 🏅 OFB talent badges.
function badgesView(s) {
  const b = s.badges || {};
  const earned = Object.entries(b).filter(([, lvl]) => lvl && lvl !== 'None');
  if (!earned.length) return '';
  return `<section><h3>🏅 Badges</h3>
    <ul class="badge-list">${earned.map(([name, lvl]) => `<li>${BADGE_EMOJI[lvl] || ''} ${esc(name)} — <b>${esc(lvl)}</b></li>`).join('')}</ul></section>`;
}

// 📜 Lifespan: arrival/birth, death, and rotations lived.
function lifespanView(s) {
  if (!s.cas && !s.bornRotation && !s.diedRotation) return '';
  const cur = (store.data.meta && store.data.meta.rotation) || 1;
  const playedParent = (s.parents || []).some(pid => { const par = store.person(pid); return par && !par.cas; });
  const bornLabel = playedParent ? 'Born' : 'Arrived';
  const arrived = s.cas ? 'CAS (original)' : (s.bornRotation ? `R${s.bornRotation}${s.bornDay ? ' Day ' + s.bornDay : ''}` : '');
  const bornR = s.cas ? 1 : s.bornRotation;
  let lived = '';
  if (bornR) {
    const n = (s.diedRotation || cur) - bornR + 1;
    lived = `${n} rotation${n === 1 ? '' : 's'}${s.diedRotation ? '' : ' and counting'}`;
  }
  return `<section><h3>📜 Lifespan</h3><dl class="kv">
    ${arrived ? kv(bornLabel, arrived) : ''}
    ${s.diedRotation ? kv('Died', `R${s.diedRotation}${s.diedDay ? ' Day ' + s.diedDay : ''}`) : ''}
    ${s.causeOfDeath ? kv('Cause', s.causeOfDeath) : ''}
    ${lived ? kv('Lived', lived) : ''}
  </dl></section>`;
}

const kv = (k, v) => (v || v === 0) ? `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : '';
const bolts = (n) => n == null ? '' : '💕'.repeat(Math.max(0, Math.min(3, n))) || '0';

function wireView(node) {
  const p = panel();
  p.querySelector('[data-close]')?.addEventListener('click', closePanel);
  p.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openProfile(b.dataset.open)));
  p.querySelector('[data-edit]')?.addEventListener('click', () => openEditor(node));

  // Profile tab switching.
  const tabs = [...p.querySelectorAll('.profile-tabs [data-ptab]')];
  const panels = [...p.querySelectorAll('.ptab[data-panel]')];
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.toggle('active', x === t));
    panels.forEach(pl => { pl.hidden = pl.dataset.panel !== t.dataset.ptab; });
  }));

  // Quick link to the predictor with this Sim pre-selected.
  p.querySelector('[data-predict]')?.addEventListener('click', (e) => {
    window.dispatchEvent(new CustomEvent('open-predictor', { detail: { id: e.currentTarget.dataset.predict } }));
  });
}

// ---------- Editing --------------------------------------------------------
function selectField(name, value, options, blank = '—') {
  const opts = [`<option value="">${blank}</option>`].concat(options.map(o => {
    const v = typeof o === 'string' ? o : o.name;
    return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(typeof o === 'string' ? o : o.name + ' ' + (o.glyph || ''))}</option>`;
  }));
  return `<select name="${name}">${opts.join('')}</select>`;
}
// Family & household selects map the dropdown VALUE to the internal id while showing
// the friendly name — fixes the bug where saving could blank a Sim's family.
function familySelect(name, val) {
  return `<select name="${name}"><option value="">—</option>${store.data.families.map(f =>
    `<option value="${esc(f.id)}" ${f.id === val ? 'selected' : ''}>${f.emoji ? esc(f.emoji) + ' ' : ''}${esc(f.name)}</option>`).join('')}</select>`;
}
function householdSelect(name, val) {
  return `<select name="${name}"><option value="">— none —</option>${store.data.households.map(h =>
    `<option value="${esc(h.id)}" ${h.id === val ? 'selected' : ''}>${h.emoji ? esc(h.emoji) + ' ' : ''}${esc(h.name)}</option>`).join('')}</select>`;
}
const textField = (name, value, ph = '') => `<input name="${name}" value="${esc(value || '')}" placeholder="${esc(ph)}">`;

// Eye colour dropdown, grouped Dominant/Recessive from meta.eyeColours. Falls back to a
// text field if no colour list is set yet.
function eyeColourSelect(name, value) {
  const list = (store.data.meta && store.data.meta.eyeColours) || [];
  if (!list.length) return textField(name, value, 'e.g. Lilac');
  const dom = list.filter(c => c.dominant), rec = list.filter(c => !c.dominant);
  const opt = (c) => `<option value="${esc(c.name)}" ${c.name === value ? 'selected' : ''}>${esc(c.name)}</option>`;
  const unknown = value && !list.some(c => c.name === value);
  return `<select name="${name}">
    <option value="" ${!value ? 'selected' : ''}>— none —</option>
    ${unknown ? `<option value="${esc(value)}" selected>${esc(value)} (current)</option>` : ''}
    <optgroup label="Dominant">${dom.map(opt).join('')}</optgroup>
    <optgroup label="Recessive">${rec.map(opt).join('')}</optgroup>
  </select>`;
}
const numField = (name, value, min = 0, max = 10) => `<input type="number" name="${name}" value="${value ?? ''}" min="${min}" max="${max}">`;

function openEditor(node) {
  const isPet = !!store.pet(node.id);
  panel().innerHTML = isPet ? petEditor(node) : simEditor(node);
  wireEditor(node, isPet);
}

function simEditor(s) {
  const g = s.genetics || {}, c = s.career || {}, sk = s.skills || {}, pe = s.personality || {};
  return `<form class="editor" id="editForm">
    <div class="editor-head">
      <h2>Edit ${esc(s.display || s.name)}</h2>
      <div class="editor-actions"><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save</button></div>
    </div>
    <div class="photo-edit">${photoBlock(s)}<label class="file-btn">📸 Upload photo<input type="file" accept="image/*" id="photoInput"></label></div>

    <fieldset><legend>Identity</legend>
      ${row('Full name', textField('name', s.name))}
      ${row('Display name', textField('display', s.display))}
      ${row('Emoji', textField('emoji', s.emoji))}
      ${row('Family', familySelect('family', s.family))}
      ${row('Household', householdSelect('household', s.household))}
      ${row('Pre-marriage name', textField('preMarriageName', s.preMarriageName))}
      ${row('Life stage', selectField('lifeStage', s.lifeStage, LIFE_STAGES))}
      ${row('Days remaining', numField('daysRemaining', s.daysRemaining, 0, 9999))}
      ${row('Generation', textField('generation', s.generation, 'Gen 1'))}
      ${row('Birth order (tree)', numField('birthOrder', s.birthOrder, 1, 99))}
      ${row('Sim type', `<select name="type">${SIM_TYPES.map(t => `<option value="${t.name}" ${(s.type || 'Human') === t.name ? 'selected' : ''}>${t.emoji ? t.emoji + ' ' : ''}${esc(t.label || t.name)}</option>`).join('')}</select>`)}
      ${row('🎀 Yellow bow club', `<input type="checkbox" name="yellowBow" ${s.yellowBow ? 'checked' : ''}>`)}
      ${row('❤️ Adopted (chosen child)', `<input type="checkbox" name="adopted" ${s.adopted ? 'checked' : ''}>`)}
    </fieldset>

    <fieldset><legend>📜 Lifespan</legend>
      ${row('Created in CAS (original)', `<input type="checkbox" name="cas" ${s.cas ? 'checked' : ''}>`)}
      ${row('Born / Arrived — Rotation', numField('bornRotation', s.bornRotation, 1, 999))}
      ${row('Born / Arrived — Day', numField('bornDay', s.bornDay, 1, 4))}
      ${row('Died — Rotation', numField('diedRotation', s.diedRotation, 1, 999))}
      ${row('Died — Day', numField('diedDay', s.diedDay, 1, 4))}
      ${row('Cause of death', textField('causeOfDeath', s.causeOfDeath, 'Old age / fire / flyby…'))}
      ${row('⭐ Town Elder (oldest Sim — pins "Longest-lived")', `<input type="checkbox" name="townElder" ${s.townElder ? 'checked' : ''}>`)}
      ${row('🏡 Founding Resident (pins "Longest in Sunnyside")', `<input type="checkbox" name="foundingResident" ${s.foundingResident ? 'checked' : ''}>`)}
    </fieldset>

    <fieldset><legend>Sims 2 Mechanics</legend>
      ${row('Aspiration', selectField('aspiration', s.aspiration, ASPIRATIONS))}
      ${row('Secondary', textField('secondaryAspiration', s.secondaryAspiration))}
      ${row('Lifetime want', textField('lifetimeWant', s.lifetimeWant))}
      ${row('Star sign', selectField('starSign', s.starSign, STAR_SIGNS))}
      ${row('Turn on 1', textField('turnOn1', s.turnOn1))}
      ${row('Turn on 2', textField('turnOn2', s.turnOn2))}
      ${row('Turn off', textField('turnOff', s.turnOff))}
      ${row('One True Hobby', selectField('oth', s.oth, OTH))}
      ${row('Body frame', selectField('bodyFrame', s.bodyFrame, BODY_FRAMES))}
    </fieldset>

    <fieldset><legend>Personality (total must be 25)</legend>
      ${PERSONALITY.map(a => row(a.high, numField('pers_' + a.key, pe[a.key]))).join('')}
      <p class="hint" id="persTotal"></p>
    </fieldset>

    <fieldset><legend>Career</legend>
      ${row('Track', selectField('car_track', c.track, CAREER_TRACKS))}
      ${row('Level name', textField('car_levelName', c.levelName))}
      ${row('Level number', numField('car_level', c.level, 0, 11))}
      ${row('Top of career', textField('car_top', c.top))}
      ${row('Degree', textField('car_degree', c.degree))}
    </fieldset>

    <fieldset><legend>Skills (0–10)</legend>
      ${SKILLS.map(k => row(k[0].toUpperCase() + k.slice(1), numField('sk_' + k, sk[k]))).join('')}
    </fieldset>

    <fieldset><legend>🏅 Badges (Open for Business)</legend>
      ${BADGE_TYPES.map(t => row(t, `<select name="badge_${esc(t)}">${BADGE_LEVELS.map(l => `<option ${((s.badges || {})[t] || 'None') === l ? 'selected' : ''}>${l}</option>`).join('')}</select>`)).join('')}
    </fieldset>

    <fieldset><legend>Genetics 🧬</legend>
      ${row('Hair (visible)', textField('g_hairVisible', g.hairVisible))}
      ${row('Hair (hidden)', textField('g_hairHidden', g.hairHidden))}
      ${row('Eyes (visible)', eyeColourSelect('g_eyesVisible', g.eyesVisible))}
      ${row('Eyes (hidden)', eyeColourSelect('g_eyesHidden', g.eyesHidden))}
      ${row('Skin tone', textField('g_skin', g.skin))}
      ${row('Freckles', textField('g_freckles', g.freckles))}
      ${row('Notable', textField('g_notable', g.notable))}
      ${row('From mum', textField('g_fromMum', g.fromMum))}
      ${row('From dad', textField('g_fromDad', g.fromDad))}
      ${row('Genetic notes', `<textarea name="g_notes">${esc(g.notes)}</textarea>`)}
    </fieldset>

    <fieldset><legend>Car 🚗</legend>
      ${row('Car', textField('car', s.car))}
      ${row('Car notes', textField('carNotes', s.carNotes))}
    </fieldset>

    ${parentsEditor(s.parents || [])}
    ${partnerEditor(s.partners || [])}
    ${relEditor(s.relationships || [])}
    ${momentEditor(s.moments || [])}
    ${trackerEditor(s.tracker)}
    ${simpleListEditor('Locked wants', 'lockedWants', s.lockedWants || [])}
    ${simpleListEditor('Fears', 'fears', s.fears || [])}

    <div class="editor-foot">${s._isNew ? '' : '<button type="button" data-delete class="danger">🗑 Delete</button>'}<span class="spacer"></span><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save changes</button></div>
  </form>`;
}

function petEditor(pt) {
  return `<form class="editor" id="editForm">
    <div class="editor-head"><h2>Edit ${esc(pt.name)}</h2>
      <div class="editor-actions"><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save</button></div></div>
    <div class="photo-edit">${photoBlock(pt)}<label class="file-btn">📸 Upload photo<input type="file" accept="image/*" id="photoInput"></label></div>
    <fieldset><legend>Pet</legend>
      ${row('Name', textField('name', pt.name))}
      ${row('Emoji', textField('emoji', pt.emoji))}
      ${row('Species', selectField('species', pt.species, PET_SPECIES))}
      ${row('Breed', textField('breed', pt.breed))}
      ${row('Owner', `<select name="ownerId">${peopleOptions(pt.ownerId)}</select>`)}
      ${row('Household', householdSelect('household', pt.household))}
      ${row('Star sign', selectField('starSign', pt.starSign, STAR_SIGNS))}
      ${row('Collar', textField('collar', pt.collar))}
      ${row('Personality (comma sep)', textField('personality', (pt.personality || []).join(', ')))}
      ${row('Kibbled?', `<input type="checkbox" name="kibbled" ${pt.kibbled ? 'checked' : ''}>`)}
      ${row('Kibbled note', textField('kibbledNote', pt.kibbledNote))}
      ${row('Pet Best Friend?', `<input type="checkbox" name="petBestFriend" ${pt.petBestFriend ? 'checked' : ''}>`)}
      ${row('PBF note', textField('petBestFriendNote', pt.petBestFriendNote))}
    </fieldset>
    ${momentEditor(pt.moments || [], true)}
    <div class="editor-foot">${pt._isNew ? '' : '<button type="button" data-delete class="danger">🗑 Delete</button>'}<span class="spacer"></span><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save changes</button></div>
  </form>`;
}

const row = (label, field) => `<label class="frow"><span>${esc(label)}</span>${field}</label>`;

// 🏆 Lifetime-want progress editor: a target number + a list of items (name, optional link, done).
const trackerRow = (i = {}) => `<div class="lrow tracker">
  <input name="tr_label[]" placeholder="name" value="${esc(i.label)}">
  <select name="tr_id[]">${nodeOptions(i.id)}</select>
  <label class="tr-done"><input type="checkbox" name="tr_done[]" ${i.done ? 'checked' : ''}> done</label>
  <button type="button" class="del" data-del>✕</button></div>`;
function trackerEditor(t) {
  t = t || {};
  return `<fieldset data-list="tracker"><legend>🏆 Lifetime Want Progress</legend>
    ${row('Target number', numField('tracker_target', t.target, 0, 999))}
    <div class="rows">${(t.items || []).map(trackerRow).join('')}</div>
    <button type="button" class="add" data-add="tracker">+ Add item</button></fieldset>`;
}

function simpleListEditor(title, key, items) {
  return `<fieldset data-list="${key}"><legend>${esc(title)}</legend>
    <div class="rows">${items.map(v => listRow(key, v)).join('')}</div>
    <button type="button" class="add" data-add="${key}">+ Add</button></fieldset>`;
}
const listRow = (key, v) => `<div class="lrow"><input name="${key}[]" value="${esc(v)}"><button type="button" class="del" data-del>✕</button></div>`;

function listEditor(title, key, items) { return simpleListEditor(title, key, items); }

function peopleOptions(sel) {
  return ['<option value="">— choose a Sim —</option>'].concat(
    sortedPeople().map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc((p.emoji || '') + ' ' + (p.display || p.name))}</option>`)
  ).join('');
}
const parentRow = (id = '') => `<div class="lrow"><select name="parents[]">${peopleOptions(id)}</select><button type="button" class="del" data-del>✕</button></div>`;

// Options for picking any person OR pet by name (relationships can point at pets too).
function nodeOptions(sel) {
  const opt = (n) => `<option value="${esc(n.id)}" ${n.id === sel ? 'selected' : ''}>${esc((n.emoji || '') + ' ' + (n.display || n.name))}</option>`;
  return '<option value="">— choose —</option>' + sortedPeople().map(opt).join('') + sortedPets().map(opt).join('');
}
function parentsEditor(items) {
  return `<fieldset data-list="parents"><legend>Parents</legend>
    <div class="rows">${items.map(id => parentRow(id)).join('')}</div>
    <button type="button" class="add" data-add="parents">+ Add parent</button></fieldset>`;
}

function partnerEditor(items) {
  return `<fieldset data-list="partners"><legend>Partners</legend>
    <p class="hint">💒 R/D = the rotation &amp; day they married — only fill it in on one partner, the Timeline shows it once.</p>
    <div class="rows">${items.map(p => `<div class="lrow">
      <select name="partners_id[]">${peopleOptions(p.id)}</select>
      <input name="partners_status[]" placeholder="Status" value="${esc(p.status)}">
      <input name="partners_bolts[]" type="number" min="0" max="3" placeholder="bolts" value="${p.bolts ?? ''}">
      <input name="partners_wedR[]" type="number" min="1" max="999" placeholder="💒R" title="Wedding rotation" value="${p.weddingRotation ?? ''}">
      <input name="partners_wedD[]" type="number" min="1" max="4" placeholder="D" title="Wedding day" value="${p.weddingDay ?? ''}">
      <button type="button" class="del" data-del>✕</button></div>`).join('')}</div>
    <button type="button" class="add" data-add="partners">+ Add partner</button></fieldset>`;
}

function relEditor(items) {
  return `<fieldset data-list="rels"><legend>Relationships</legend>
    <div class="rows">${items.map(r => relRow(r)).join('')}</div>
    <button type="button" class="add" data-add="rels">+ Add relationship</button></fieldset>`;
}
const relRow = (r = {}) => `<div class="lrow rel">
  <select name="rel_id[]">${nodeOptions(r.id)}</select>
  <select name="rel_type[]">${['', ...REL_TYPES].map(t => `<option ${t === r.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
  <input name="rel_bolts[]" type="number" min="0" max="3" placeholder="bolts" value="${r.bolts ?? ''}">
  <input name="rel_notes[]" placeholder="notes" value="${esc(r.notes)}">
  <button type="button" class="del" data-del>✕</button></div>`;

function momentEditor(items, isPet) {
  return `<fieldset data-list="moments"><legend>Key Moments</legend>
    <div class="rows">${items.map(m => momentRow(m, isPet)).join('')}</div>
    <button type="button" class="add" data-add="moments${isPet ? '_pet' : ''}">+ Add moment</button></fieldset>`;
}
const momentRow = (m = {}, isPet) => `<div class="lrow moment">
  ${isPet ? '' : `<input name="mom_rotation[]" placeholder="R1" value="${esc(m.rotation)}" class="narrow">`}
  <input name="mom_event[]" placeholder="event" value="${esc(m.event)}">
  <input name="mom_notes[]" placeholder="notes" value="${esc(m.notes)}">
  <button type="button" class="del" data-del>✕</button></div>`;

function wireEditor(node, isPet) {
  const form = document.getElementById('editForm');
  const onCancel = () => { if (node._isNew) closePanel(); else openProfile(node.id); };
  form.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', onCancel));

  const delBtn = form.querySelector('[data-delete]');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!confirm(`Delete ${node.display || node.name || 'this Sim'}? This can't be undone.`)) return;
    delBtn.disabled = true; delBtn.textContent = 'Deleting…';
    try {
      if (isPet) store.deletePet(node.id); else store.deletePerson(node.id);
      await store.commit(`Delete ${node.display || node.name || 'Sim'}`);
      window.dispatchEvent(new CustomEvent('data-updated'));
      closePanel();
    } catch (err) {
      alert('Could not delete: ' + err.message);
      delBtn.disabled = false; delBtn.textContent = '🗑 Delete';
    }
  });

  // Add/remove dynamic rows.
  form.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { del.closest('.lrow').remove(); return; }
    const add = e.target.closest('[data-add]');
    if (!add) return;
    const kind = add.dataset.add;
    const rows = add.previousElementSibling;
    if (kind === 'tracker') rows.insertAdjacentHTML('beforeend', trackerRow());
    else if (kind === 'parents') rows.insertAdjacentHTML('beforeend', parentRow());
    else if (kind === 'partners') rows.insertAdjacentHTML('beforeend', `<div class="lrow"><select name="partners_id[]">${peopleOptions('')}</select><input name="partners_status[]" placeholder="Status"><input name="partners_bolts[]" type="number" min="0" max="3" placeholder="bolts"><input name="partners_wedR[]" type="number" min="1" max="999" placeholder="💒R" title="Wedding rotation"><input name="partners_wedD[]" type="number" min="1" max="4" placeholder="D" title="Wedding day"><button type="button" class="del" data-del>✕</button></div>`);
    else if (kind === 'rels') rows.insertAdjacentHTML('beforeend', relRow());
    else if (kind === 'moments') rows.insertAdjacentHTML('beforeend', momentRow({}, false));
    else if (kind === 'moments_pet') rows.insertAdjacentHTML('beforeend', momentRow({}, true));
    else rows.insertAdjacentHTML('beforeend', listRow(kind, ''));
  });

  // Live personality total.
  const totalEl = form.querySelector('#persTotal');
  const recompute = () => {
    if (!totalEl) return;
    const t = PERSONALITY.reduce((s, a) => s + (Number(form.elements['pers_' + a.key].value) || 0), 0);
    totalEl.textContent = `Total: ${t}/25`;
    totalEl.className = 'hint ' + (t === 25 ? 'ok' : 'warn');
  };
  form.addEventListener('input', recompute); recompute();

  // Photo upload (held until save).
  let pendingPhoto = null;
  const photoInput = form.querySelector('#photoInput');
  photoInput?.addEventListener('change', () => {
    const file = photoInput.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pendingPhoto = reader.result;
      const ph = form.querySelector('.photo');
      ph.classList.remove('placeholder');
      ph.innerHTML = `<img src="${pendingPhoto}" alt="">`;
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const isNew = !!node._isNew;
      if (isPet) applyPetForm(node, form); else applySimForm(node, form);
      if (isNew) { delete node._isNew; (isPet ? store.data.pets : store.data.people).push(node); }
      if (pendingPhoto) node.photo = await store.savePhoto(node.id, pendingPhoto);
      const res = await store.commit(`${isNew ? 'Add' : 'Update'} ${node.display || node.name || 'Sim'}`);
      window.dispatchEvent(new CustomEvent('data-updated'));
      openProfile(node.id);
      if (!res.saved) flashSaveWarning(res.reason);
    } catch (err) {
      alert('Could not save: ' + err.message);
      btn.disabled = false; btn.textContent = 'Save changes';
    }
  });
}

const val = (form, n) => (form.elements[n]?.value ?? '').trim();
const numVal = (form, n) => { const v = form.elements[n]?.value; return v === '' || v == null ? null : Number(v); };
const arr = (form, n) => Array.from(form.querySelectorAll(`[name="${n}"]`)).map(i => i.value);

function applySimForm(s, form) {
  s.name = val(form, 'name'); s.display = val(form, 'display'); s.emoji = val(form, 'emoji');
  s.family = val(form, 'family'); s.household = val(form, 'household');
  s.preMarriageName = val(form, 'preMarriageName'); s.lifeStage = val(form, 'lifeStage');
  s.daysRemaining = numVal(form, 'daysRemaining'); s.generation = val(form, 'generation');
  { const bo = numVal(form, 'birthOrder'); if (bo == null) delete s.birthOrder; else s.birthOrder = bo; }
  s.cas = form.elements['cas'] ? form.elements['cas'].checked : !!s.cas;
  if (form.elements['townElder']) {
    const elder = form.elements['townElder'].checked;
    // Only one Town Elder at a time — pinning this Sim clears it from everyone else.
    if (elder) store.data.people.forEach(p => { if (p.id !== s.id) delete p.townElder; });
    if (elder) s.townElder = true; else delete s.townElder;
  }
  if (form.elements['foundingResident']) {
    const founder = form.elements['foundingResident'].checked;
    // Only one Founding Resident at a time.
    if (founder) store.data.people.forEach(p => { if (p.id !== s.id) delete p.foundingResident; });
    if (founder) s.foundingResident = true; else delete s.foundingResident;
  }
  ['bornRotation', 'bornDay', 'diedRotation', 'diedDay'].forEach(k => { const v = numVal(form, k); if (v == null) delete s[k]; else s[k] = v; });
  { const c = val(form, 'causeOfDeath'); if (!c) delete s.causeOfDeath; else s.causeOfDeath = c; }
  s.type = form.elements['type'] ? form.elements['type'].value : (s.type || 'Human');
  s.yellowBow = form.elements['yellowBow'] ? form.elements['yellowBow'].checked : !!s.yellowBow;
  s.adopted = form.elements['adopted'] ? form.elements['adopted'].checked : !!s.adopted;
  s.aspiration = val(form, 'aspiration'); s.secondaryAspiration = val(form, 'secondaryAspiration');
  s.lifetimeWant = val(form, 'lifetimeWant'); s.starSign = val(form, 'starSign');
  s.turnOn1 = val(form, 'turnOn1'); s.turnOn2 = val(form, 'turnOn2'); s.turnOff = val(form, 'turnOff');
  s.oth = val(form, 'oth'); s.bodyFrame = val(form, 'bodyFrame');
  s.personality = {}; PERSONALITY.forEach(a => s.personality[a.key] = numVal(form, 'pers_' + a.key) || 0);
  s.career = { track: val(form, 'car_track'), levelName: val(form, 'car_levelName'), level: numVal(form, 'car_level'), top: val(form, 'car_top'), degree: val(form, 'car_degree') };
  s.skills = {}; SKILLS.forEach(k => s.skills[k] = numVal(form, 'sk_' + k) || 0);
  s.genetics = {
    hairVisible: val(form, 'g_hairVisible'), hairHidden: val(form, 'g_hairHidden'),
    eyesVisible: val(form, 'g_eyesVisible'), eyesHidden: val(form, 'g_eyesHidden'),
    skin: val(form, 'g_skin'), freckles: val(form, 'g_freckles'), notable: val(form, 'g_notable'),
    fromMum: val(form, 'g_fromMum'), fromDad: val(form, 'g_fromDad'), notes: val(form, 'g_notes')
  };
  s.car = val(form, 'car'); s.carNotes = val(form, 'carNotes');
  s.parents = arr(form, 'parents[]').map(v => v.trim()).filter(Boolean);
  const pid = arr(form, 'partners_id[]'), pst = arr(form, 'partners_status[]'), pb = arr(form, 'partners_bolts[]');
  const pwr = arr(form, 'partners_wedR[]'), pwd = arr(form, 'partners_wedD[]');
  s.partners = pid.map((id, i) => {
    const p = { id: id.trim(), status: pst[i] || '', bolts: pb[i] === '' ? null : Number(pb[i]) };
    if (pwr[i] !== '' && pwr[i] != null) p.weddingRotation = Number(pwr[i]);
    if (pwd[i] !== '' && pwd[i] != null) p.weddingDay = Number(pwd[i]);
    return p;
  }).filter(p => p.id);
  const rid = arr(form, 'rel_id[]'), rt = arr(form, 'rel_type[]'), rb = arr(form, 'rel_bolts[]'), rn = arr(form, 'rel_notes[]');
  s.relationships = rid.map((id, i) => ({ id: id.trim(), type: rt[i] || '', bolts: rb[i] === '' ? null : Number(rb[i]), notes: rn[i] || '' })).filter(r => r.id);
  const mr = arr(form, 'mom_rotation[]'), me = arr(form, 'mom_event[]'), mn = arr(form, 'mom_notes[]');
  s.moments = me.map((ev, i) => ({ rotation: (mr[i] || '').trim(), event: ev.trim(), notes: (mn[i] || '').trim() })).filter(m => m.event);
  s.lockedWants = arr(form, 'lockedWants[]').map(v => v.trim()).filter(Boolean);
  s.fears = arr(form, 'fears[]').map(v => v.trim()).filter(Boolean);
  const trLabels = arr(form, 'tr_label[]'), trIds = arr(form, 'tr_id[]');
  const trDone = Array.from(form.querySelectorAll('[name="tr_done[]"]')).map(c => c.checked);
  const trItems = trLabels.map((l, i) => ({ label: l.trim(), id: (trIds[i] || '').trim() || undefined, done: !!trDone[i] }))
    .filter(it => it.label || it.id);
  const trTarget = numVal(form, 'tracker_target');
  s.tracker = (trTarget || trItems.length) ? { target: trTarget || 0, items: trItems } : undefined;
  s.badges = {};
  BADGE_TYPES.forEach(t => { const v = form.elements['badge_' + t] ? form.elements['badge_' + t].value : 'None'; if (v && v !== 'None') s.badges[t] = v; });
}

function applyPetForm(pt, form) {
  pt.name = val(form, 'name'); pt.emoji = val(form, 'emoji'); pt.species = val(form, 'species');
  pt.breed = val(form, 'breed'); pt.ownerId = val(form, 'ownerId'); pt.household = val(form, 'household');
  pt.starSign = val(form, 'starSign'); pt.collar = val(form, 'collar');
  pt.personality = val(form, 'personality').split(',').map(s => s.trim()).filter(Boolean);
  pt.kibbled = form.elements['kibbled'].checked; pt.kibbledNote = val(form, 'kibbledNote');
  pt.petBestFriend = form.elements['petBestFriend'].checked; pt.petBestFriendNote = val(form, 'petBestFriendNote');
  const me = arr(form, 'mom_event[]'), mn = arr(form, 'mom_notes[]');
  pt.moments = me.map((ev, i) => ({ event: ev.trim(), notes: (mn[i] || '').trim() })).filter(m => m.event);
}

function flashSaveWarning(reason) {
  const msg = reason === 'no-token'
    ? 'Saved locally. Add a GitHub token in Settings to auto-save to the repo.'
    : 'Saved locally, but auto-save to GitHub failed — check Settings.';
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 5000);
}
