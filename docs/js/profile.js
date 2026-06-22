// Profile cards: the full, photo-album-style view of a Sim or pet, plus editing.
// Opens as a slide-over panel. Navigation chips (parents / partner / children / siblings)
// let you move up and down the generations.

import { store } from './store.js';
import {
  ASPIRATIONS, STAR_SIGNS, SKILLS, LIFE_STAGES, PERSONALITY, CAREER_TRACKS, OTH,
  BODY_FRAMES, REL_TYPES, PET_SPECIES, glyphFor
} from './constants.js';

const panel = () => document.getElementById('panel');
const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function openProfile(id) {
  const node = store.node(id);
  if (!node) return;
  const p = panel();
  p.classList.add('open');
  p.innerHTML = store.pet(id) ? petView(node) : simView(node);
  wireView(node);
}

function closePanel() { panel().classList.remove('open'); panel().innerHTML = ''; }

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

  return `
  <div class="profile" style="--fam:${fam.colour || '#a89f94'}">
    <div class="profile-head">
      <button class="close" data-close>✕</button>
      <button class="edit" data-edit>✎ Edit</button>
      ${photoBlock(s)}
      <div class="head-text">
        <h2>${esc(s.emoji || '')} ${esc(s.name)}</h2>
        <p class="head-sub">${[fam.name && fam.emoji + ' ' + fam.name, hh && hh.name, s.generation].filter(Boolean).map(esc).join(' · ')}</p>
        ${isAnc ? `<p class="anc-banner">Ancestor node — origin point for genetics (non-playable)</p>` : ''}
        ${s.oneLiner ? `<p class="oneliner">“${esc(s.oneLiner)}”</p>` : ''}
      </div>
    </div>

    <div class="nav-block">
      <div><strong>⬆ Parents</strong> ${parents}</div>
      <div><strong>💍 Partner</strong> ${partner}</div>
      <div><strong>⬇ Children</strong> ${kids}</div>
      <div><strong>↔ Siblings</strong> ${sibs}</div>
      ${isAnc ? '' : `<div><strong>🐾 Pets</strong> ${pets}</div>`}
    </div>

    ${isAnc ? ancestorBody(g) : `
    <section><h3>Identity</h3>
      <dl class="kv">
        ${kv('Display name', s.display)}
        ${kv('Household', hh ? hh.name : '')}
        ${kv('Pre-marriage name', s.preMarriageName)}
        ${kv('Life stage', s.lifeStage)}
        ${kv('Days remaining', s.daysRemaining)}
        ${kv('Generation', s.generation)}
      </dl>
    </section>

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

    <section><h3>Career</h3>
      <dl class="kv">
        ${kv('Track', s.career?.track)}
        ${kv('Current level', s.career?.levelName ? `${s.career.levelName}${s.career.level ? ' — Level ' + s.career.level : ''}` : (s.career?.level || ''))}
        ${kv('Top of career', s.career?.top)}
        ${kv('Degree', s.career?.degree)}
      </dl>
    </section>

    <section><h3>Skills</h3>
      ${SKILLS.map(k => bar(k[0].toUpperCase() + k.slice(1), s.skills?.[k])).join('')}
    </section>

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
    </section>

    <section><h3>Relationships</h3>${rels}</section>

    ${(s.lockedWants || []).length || (s.fears || []).length ? `<section><h3>Locked Wants & Fears</h3>
      <ul class="wants">${(s.lockedWants || []).map(w => `<li>🔒 ${esc(w)}</li>`).join('')}
      ${(s.fears || []).map(w => `<li>⚠️ ${esc(w)}</li>`).join('')}</ul></section>` : ''}

    <section><h3>Key Moments 📖</h3>${moments}</section>

    ${s.car ? `<section><h3>Car 🚗</h3><dl class="kv">${kv('Car', s.car)}${kv('Notes', s.carNotes)}</dl></section>` : ''}
    `}
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

const kv = (k, v) => (v || v === 0) ? `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : '';
const bolts = (n) => n == null ? '' : '💕'.repeat(Math.max(0, Math.min(3, n))) || '0';

function wireView(node) {
  const p = panel();
  p.querySelector('[data-close]')?.addEventListener('click', closePanel);
  p.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openProfile(b.dataset.open)));
  p.querySelector('[data-edit]')?.addEventListener('click', () => openEditor(node));
}

// ---------- Editing --------------------------------------------------------
function selectField(name, value, options, blank = '—') {
  const opts = [`<option value="">${blank}</option>`].concat(options.map(o => {
    const v = typeof o === 'string' ? o : o.name;
    return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(typeof o === 'string' ? o : o.name + ' ' + (o.glyph || ''))}</option>`;
  }));
  return `<select name="${name}">${opts.join('')}</select>`;
}
const textField = (name, value, ph = '') => `<input name="${name}" value="${esc(value || '')}" placeholder="${esc(ph)}">`;
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
      ${row('Family', selectField('family', s.family, store.data.families))}
      ${row('Household', selectField('household', s.household, store.data.households.map(h => h.id)))}
      ${row('Pre-marriage name', textField('preMarriageName', s.preMarriageName))}
      ${row('Life stage', selectField('lifeStage', s.lifeStage, LIFE_STAGES))}
      ${row('Days remaining', numField('daysRemaining', s.daysRemaining, 0, 9999))}
      ${row('Generation', textField('generation', s.generation, 'Gen 1'))}
      ${row('Alien heritage 👽', `<input type="checkbox" name="alien" ${s.alien ? 'checked' : ''}>`)}
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

    <fieldset><legend>Genetics 🧬</legend>
      ${row('Hair (visible)', textField('g_hairVisible', g.hairVisible))}
      ${row('Hair (hidden)', textField('g_hairHidden', g.hairHidden))}
      ${row('Eyes (visible)', textField('g_eyesVisible', g.eyesVisible))}
      ${row('Eyes (hidden)', textField('g_eyesHidden', g.eyesHidden))}
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

    ${listEditor('Parents (Sim IDs)', 'parents', s.parents || [])}
    ${partnerEditor(s.partners || [])}
    ${relEditor(s.relationships || [])}
    ${momentEditor(s.moments || [])}
    ${simpleListEditor('Locked wants', 'lockedWants', s.lockedWants || [])}
    ${simpleListEditor('Fears', 'fears', s.fears || [])}

    <div class="editor-foot"><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save changes</button></div>
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
      ${row('Owner (Sim ID)', textField('ownerId', pt.ownerId))}
      ${row('Household', selectField('household', pt.household, store.data.households.map(h => h.id)))}
      ${row('Star sign', selectField('starSign', pt.starSign, STAR_SIGNS))}
      ${row('Collar', textField('collar', pt.collar))}
      ${row('Personality (comma sep)', textField('personality', (pt.personality || []).join(', ')))}
      ${row('Kibbled?', `<input type="checkbox" name="kibbled" ${pt.kibbled ? 'checked' : ''}>`)}
      ${row('Kibbled note', textField('kibbledNote', pt.kibbledNote))}
      ${row('Pet Best Friend?', `<input type="checkbox" name="petBestFriend" ${pt.petBestFriend ? 'checked' : ''}>`)}
      ${row('PBF note', textField('petBestFriendNote', pt.petBestFriendNote))}
    </fieldset>
    ${momentEditor(pt.moments || [], true)}
    <div class="editor-foot"><button type="button" data-cancel class="ghost">Cancel</button><button type="submit" class="primary">Save changes</button></div>
  </form>`;
}

const row = (label, field) => `<label class="frow"><span>${esc(label)}</span>${field}</label>`;

function simpleListEditor(title, key, items) {
  return `<fieldset data-list="${key}"><legend>${esc(title)}</legend>
    <div class="rows">${items.map(v => listRow(key, v)).join('')}</div>
    <button type="button" class="add" data-add="${key}">+ Add</button></fieldset>`;
}
const listRow = (key, v) => `<div class="lrow"><input name="${key}[]" value="${esc(v)}"><button type="button" class="del" data-del>✕</button></div>`;

function listEditor(title, key, items) { return simpleListEditor(title, key, items); }

function partnerEditor(items) {
  return `<fieldset data-list="partners"><legend>Partners</legend>
    <div class="rows">${items.map(p => `<div class="lrow">
      <input name="partners_id[]" placeholder="Sim ID" value="${esc(p.id)}">
      <input name="partners_status[]" placeholder="Status" value="${esc(p.status)}">
      <input name="partners_bolts[]" type="number" min="0" max="3" placeholder="bolts" value="${p.bolts ?? ''}">
      <button type="button" class="del" data-del>✕</button></div>`).join('')}</div>
    <button type="button" class="add" data-add="partners">+ Add partner</button></fieldset>`;
}

function relEditor(items) {
  return `<fieldset data-list="rels"><legend>Relationships</legend>
    <div class="rows">${items.map(r => relRow(r)).join('')}</div>
    <button type="button" class="add" data-add="rels">+ Add relationship</button></fieldset>`;
}
const relRow = (r = {}) => `<div class="lrow rel">
  <input name="rel_id[]" placeholder="Sim ID" value="${esc(r.id)}">
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
  form.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => openProfile(node.id)));

  // Add/remove dynamic rows.
  form.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { del.closest('.lrow').remove(); return; }
    const add = e.target.closest('[data-add]');
    if (!add) return;
    const kind = add.dataset.add;
    const rows = add.previousElementSibling;
    if (kind === 'partners') rows.insertAdjacentHTML('beforeend', `<div class="lrow"><input name="partners_id[]" placeholder="Sim ID"><input name="partners_status[]" placeholder="Status"><input name="partners_bolts[]" type="number" min="0" max="3" placeholder="bolts"><button type="button" class="del" data-del>✕</button></div>`);
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
      if (isPet) applyPetForm(node, form); else applySimForm(node, form);
      if (pendingPhoto) node.photo = await store.savePhoto(node.id, pendingPhoto);
      const res = await store.commit(`Update ${node.display || node.name}`);
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
  s.alien = form.elements['alien'] ? form.elements['alien'].checked : !!s.alien;
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
  s.partners = pid.map((id, i) => ({ id: id.trim(), status: pst[i] || '', bolts: pb[i] === '' ? null : Number(pb[i]) })).filter(p => p.id);
  const rid = arr(form, 'rel_id[]'), rt = arr(form, 'rel_type[]'), rb = arr(form, 'rel_bolts[]'), rn = arr(form, 'rel_notes[]');
  s.relationships = rid.map((id, i) => ({ id: id.trim(), type: rt[i] || '', bolts: rb[i] === '' ? null : Number(rb[i]), notes: rn[i] || '' })).filter(r => r.id);
  const mr = arr(form, 'mom_rotation[]'), me = arr(form, 'mom_event[]'), mn = arr(form, 'mom_notes[]');
  s.moments = me.map((ev, i) => ({ rotation: (mr[i] || '').trim(), event: ev.trim(), notes: (mn[i] || '').trim() })).filter(m => m.event);
  s.lockedWants = arr(form, 'lockedWants[]').map(v => v.trim()).filter(Boolean);
  s.fears = arr(form, 'fears[]').map(v => v.trim()).filter(Boolean);
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
