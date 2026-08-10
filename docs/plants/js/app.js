// Pink to Leaf — app shell, routing and views.
// Mobile-first. The whole UI is rendered from `store.data`; every change goes through
// a store mutation that caches locally and auto-saves to GitHub when a token is set.

import { store } from './store.js';
import { gh } from './github.js';
import {
  isoDate, prettyDate, agoText, bumMeta, wateringStatus, nextAction,
  todaysReminders, fertiliserView, sunshineLine
} from './plants.js';

// ---------- tiny helpers ----------
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function today() { return new Date(); }
function todayISO() { return isoDate(today()); }

// Photo src can be a repo-relative path ("photos/x.jpg") or an inline data URL.
function photoSrc(src) { return src && src.startsWith('data:') ? src : (src ? './' + src : ''); }

// ---------- app state ----------
const state = {
  view: 'home',        // home | today | feeding | cruise | settings
  plantId: null,       // which plant detail is open
  adding: false,       // the Add-plant form is open
  draft: null,         // in-progress new-plant fields (survives form re-renders)
  pendingPhoto: null,  // resized data URL waiting to attach to a growth note
};

// Suggested watering interval (days) by bum club — prefilled on the add form.
const INTERVAL_SUGGEST = { dry: 18, moist: 6, wet: 5, water: 3 };
function blankDraft() {
  return {
    name: '', emoji: '🌿', musicianEmoji: '', namedAfter: '', species: '',
    room: '', location: '', pot: '', bumClub: 'moist', intervalDays: 6,
    wateringText: '', light: '', feedingText: '', firstFeed: '',
    mistNeeded: false, mistingText: '', feedSkip: false, dailyCheck: false,
    special: '', notes: ''
  };
}
// Read the live form inputs back into a draft object (so a re-render loses nothing).
function readAddForm() {
  const d = state.draft || blankDraft();
  const val = id => { const el = $('#' + id); return el ? el.value : ''; };
  return {
    ...d,
    name: val('apName'), emoji: val('apEmoji'), musicianEmoji: val('apMusician'),
    namedAfter: val('apNamedAfter'), species: val('apSpecies'), room: val('apRoom'),
    location: val('apLocation'), pot: val('apPot'), intervalDays: val('apInterval'),
    wateringText: val('apWatering'), light: val('apLight'), feedingText: val('apFeeding'),
    firstFeed: val('apFirstFeed'), mistingText: val('apMisting'),
    special: val('apSpecial'), notes: val('apNotes')
  };
}

// ---------- save-status badge ----------
function setStatus(kind, text) {
  const el = $('#saveStatus'); if (!el) return;
  el.className = 'status ' + kind; el.textContent = text;
}
function refreshStatus() {
  if (!gh.configured) return setStatus('readonly', '○ Read-only');
  if (store.dirty) return setStatus('saving', '… Saving');
  setStatus('saved', '● Auto-saving');
}

let toastTimer = null;
function toast(msg, kind = 'ok') {
  const t = $('#toast'); t.textContent = msg;
  t.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
}

async function save(promise, okMsg) {
  refreshStatus();
  const res = await promise;
  if (res && res.saved) { if (okMsg) toast(okMsg, 'ok'); }
  else if (res && res.reason === 'no-token') { toast('Saved on this device. Add a token in ⚙️ to sync.', 'warn'); }
  else if (res && res.reason === 'error') { toast('Saved locally — GitHub save failed. Check ⚙️.', 'err'); }
  refreshStatus();
  return res;
}

// =====================================================================
//  VIEWS
// =====================================================================

// ---- plant avatar (cover photo or big emoji) ----
function avatar(p, cls = '') {
  const cover = (p.gallery && p.gallery[0] && p.gallery[0].src) || p.photo;
  if (cover) return `<span class="pa ${cls}" style="background-image:url('${esc(photoSrc(cover))}')"></span>`;
  return `<span class="pa emoji ${cls} tone-${esc(p.bumClub)}">${p.emoji || '🌿'}</span>`;
}

function homeView() {
  const t = todayISO();
  const streak = store.data.meta.morningStreak || {};
  const stevie = store.data.plants.find(p => p.morningGreeting);
  const saidToday = streak.lastDate === t;

  const dueCount = store.data.plants.filter(p => wateringStatus(p, t).state === 'due').length;

  const cards = store.data.plants.map(p => {
    const club = bumMeta(store, p.bumClub);
    const act = nextAction(p, t);
    return `
    <button class="plant-card tone-${esc(p.bumClub)}" data-plant="${esc(p.id)}">
      ${avatar(p)}
      <div class="pc-body">
        <div class="pc-name">${p.emoji} ${esc(p.name)} <i>${p.musicianEmoji || ''}</i></div>
        <div class="pc-species">${esc((p.species || '').split('(')[0].trim())}</div>
        <div class="pc-action ${act.urgent ? 'urgent' : ''}">${act.emoji} ${esc(act.text)}</div>
      </div>
      <span class="pc-club" title="${esc(club.label)}">${club.emoji}</span>
    </button>`;
  }).join('');

  return `
  <section class="screen home">
    <div class="hero">
      <div class="hero-sun">🌿💗</div>
      <p class="hero-label">Day ${esc(String(store.data.meta.day || ''))} — the plant family</p>
      <h2 class="hero-title">Every baby, tracked 🤲</h2>
    </div>

    ${stevie ? `
    <button class="card morning-card ${saidToday ? 'done' : ''}" data-morning>
      <span class="morning-emoji">☀️</span>
      <div class="morning-text">
        <b>${saidToday ? `Morning said 🌿` : `Good morning, ${esc(stevie.name)}`}</b>
        <span>${saidToday ? `${streak.count || 1}-day streak — see you tomorrow` : 'Tap to keep the streak going'}</span>
      </div>
      <span class="streak-pill">🔥 ${esc(String(streak.count || 0))}</span>
    </button>` : ''}

    ${dueCount ? `<button class="due-banner" data-go="today">💧 ${dueCount} plant${dueCount === 1 ? '' : 's'} need${dueCount === 1 ? 's' : ''} water today →</button>` : ''}

    <div class="plant-list">${cards}</div>

    <button class="add-plant-btn" data-add>➕ Add a plant</button>
  </section>`;
}

// ---- single plant ----
function plantView(id) {
  const p = store.plant(id);
  if (!p) { state.plantId = null; return homeView(); }
  const t = todayISO();
  const club = bumMeta(store, p.bumClub);
  const w = wateringStatus(p, t);
  const waterVerb = (p.watering.label === 'Water change') ? 'Change water' : 'Water';

  const growth = (p.growth || []).map((g, i) => `
    <div class="glog-row">
      <div class="glog-date">${esc(prettyDate(g.date))}</div>
      <div class="glog-body">
        ${g.leaves != null ? `<span class="leaf-count">🍃 ${esc(String(g.leaves))} leaves</span>` : ''}
        ${g.note ? `<p>${esc(g.note)}</p>` : ''}
        ${g.src ? `<img class="glog-photo" src="${esc(photoSrc(g.src))}" alt="growth photo" loading="lazy">` : ''}
      </div>
      <button class="glog-del" data-glog-del="${i}" title="Remove">✕</button>
    </div>`).join('');

  const gallery = (p.gallery || []).length ? `
    <div class="card">
      <h3>📸 Photo album</h3>
      <div class="gallery">${p.gallery.map(ph => `
        <figure><img src="${esc(photoSrc(ph.src))}" alt="${esc(ph.caption || '')}" loading="lazy">
          ${ph.caption ? `<figcaption>${esc(ph.caption)}</figcaption>` : ''}</figure>`).join('')}</div>
    </div>` : '';

  return `
  <section class="screen plant">
    <button class="back" data-back-home>‹ All plants</button>
    <div class="plant-hero tone-${esc(p.bumClub)}">
      ${avatar(p, 'big')}
      <h2>${p.emoji} ${esc(p.name)}</h2>
      <p class="named">${p.musicianEmoji || ''} named after ${esc(p.namedAfter || '')}</p>
      <p class="species">${esc(p.species || '')}</p>
      <div class="chips">
        <span class="chip club">${club.emoji} ${esc(club.label)}</span>
        <span class="chip">📍 ${esc((p.location || '').replace(/[☀️🪟]/g, '').trim())}</span>
      </div>
    </div>

    <div class="care-actions">
      <button class="act water ${w.state === 'due' ? 'due' : ''}" data-water="${esc(p.id)}">
        <b>💧 ${esc(waterVerb)}</b><span>${p.watering.lastWatered ? esc(agoText(p.watering.lastWatered, t)) : 'not logged'}</span>
      </button>
      ${p.feeding && p.feeding.skip ? '' : `
      <button class="act feed" data-feed="${esc(p.id)}">
        <b>🧴 Fed</b><span>${p.feeding && p.feeding.lastFed ? esc(agoText(p.feeding.lastFed, t)) : 'not yet'}</span>
      </button>`}
      ${p.misting && p.misting.needed ? `
      <button class="act mist" data-mist="${esc(p.id)}">
        <b>💦 Misted</b><span>${p.misting.lastMisted ? esc(agoText(p.misting.lastMisted, t)) : 'not yet'}</span>
      </button>` : ''}
    </div>

    <div class="card status-card ${w.state === 'due' ? 'due' : w.state === 'never' ? 'never' : 'ok'}">
      <span class="sc-emoji">${w.state === 'due' ? '💧' : w.state === 'never' ? '🫗' : '✅'}</span>
      <div><b>${esc(w.label)}</b>
        <p>${esc(club.rule)}</p></div>
    </div>

    ${careRow('💧', p.watering.label === 'Water change' ? 'Water changes' : 'Watering', p.watering.text)}
    ${careRow('☀️', 'Light', p.light)}
    ${p.feeding && p.feeding.text ? careRow('🧴', 'Feeding', p.feeding.text + (p.feeding.firstFeed ? ` <i>First feed: ${esc(p.feeding.firstFeed)}</i>` : ''), true) : ''}
    ${p.misting && p.misting.text ? careRow('💦', 'Misting & humidity', p.misting.text) : ''}
    ${p.temperature ? careRow('🌡️', 'Temperature', p.temperature) : ''}
    ${p.sap ? careRow('🧤', 'Handling', p.sap) : ''}

    ${(p.care && p.care.length) ? `
    <div class="card care-flags">
      <h3>⭐ Special care</h3>
      <ul>${p.care.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    </div>` : ''}

    ${(p.rootHistory && p.rootHistory.length) ? `
    <div class="card">
      <h3>🌱 Root history</h3>
      <ul class="root-history">${p.rootHistory.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    </div>` : ''}

    ${p.special ? `<div class="card note-card special"><span>✨</span><p>${esc(p.special)}</p></div>` : ''}
    ${p.notes ? `<div class="card note-card"><span>📝</span><p>${esc(p.notes)}</p></div>` : ''}

    <div class="card grow-card">
      <h3>🌱 Growth log</h3>
      <p class="hint">Spot new leaves by comparing photos — like Brandi! Add a note, a leaf count, or a photo.</p>
      <div class="grow-add">
        <textarea id="growNote" placeholder="New leaf? Root check? Something changed…" rows="2"></textarea>
        <div class="grow-add-row">
          <input id="growLeaves" type="number" inputmode="numeric" min="0" placeholder="🍃 #" title="leaf count">
          <label class="photo-btn">${state.pendingPhoto ? '📷 photo ready' : '📷 Photo'}<input id="growPhoto" type="file" accept="image/*" hidden></label>
          <button id="btnGrow" class="primary">Add</button>
        </div>
        ${state.pendingPhoto ? `<img class="pending-photo" src="${esc(state.pendingPhoto)}" alt="pending">` : ''}
      </div>
      <div class="glog">${growth || '<p class="empty">Nothing logged yet.</p>'}</div>
    </div>

    ${gallery}

    <button class="remove-plant-btn" data-remove-plant="${esc(p.id)}">🗑️ Remove ${esc(p.name)}</button>
  </section>`;
}

function careRow(emoji, label, text, allowHtml = false) {
  if (!text) return '';
  return `
  <div class="care-row">
    <span class="care-emoji">${emoji}</span>
    <div><b>${esc(label)}</b><p>${allowHtml ? text : esc(text)}</p></div>
  </div>`;
}

// ---- add a plant ----
function addView() {
  const d = state.draft || (state.draft = blankDraft());
  const clubBtns = Object.entries(store.data.bumClubs || {}).map(([key, c]) =>
    `<button type="button" class="club-opt tone-${esc(key)} ${d.bumClub === key ? 'on' : ''}" data-club="${esc(key)}">
       <span>${c.emoji}</span>${esc((c.label || key).replace(' Bum Club', ''))}</button>`).join('');
  const rooms = [['', '—'], ['bedroom', '🛏️ Bedroom'], ['living', '🛋️ Living room'], ['kitchen', '🍳 Kitchen'], ['hallway', '🚪 Hallway']];
  const roomOpts = rooms.map(([v, l]) => `<option value="${v}" ${d.room === v ? 'selected' : ''}>${esc(l)}</option>`).join('');

  return `
  <section class="screen addplant">
    <button class="back" data-cancel-add>‹ Cancel</button>
    <div class="hero">
      <div class="hero-sun">🌿➕</div>
      <h2 class="hero-title">A new baby</h2>
      <p class="hint" style="text-align:center">Only a name is needed — fill in the rest now or later.</p>
    </div>

    <div class="card">
      <div class="ap-2col">
        <label class="field"><span>Name *</span><input id="apName" value="${esc(d.name)}" placeholder="Carole" autocomplete="off"></label>
        <label class="field short"><span>Emoji</span><input id="apEmoji" value="${esc(d.emoji)}" placeholder="🌿" maxlength="4"></label>
      </div>
      <div class="ap-2col">
        <label class="field"><span>Named after</span><input id="apNamedAfter" value="${esc(d.namedAfter)}" placeholder="Carole King" autocomplete="off"></label>
        <label class="field short"><span>Their emoji</span><input id="apMusician" value="${esc(d.musicianEmoji)}" placeholder="🎶" maxlength="4"></label>
      </div>
      <label class="field"><span>Species</span><input id="apSpecies" value="${esc(d.species)}" placeholder="Prayer plant (Maranta leuconeura)" autocomplete="off"></label>
    </div>

    <div class="card">
      <h3>🍑 Bum Club</h3>
      <p class="hint">Sets the care rule and the colour. Picking one suggests a watering gap.</p>
      <div class="club-opts">${clubBtns}</div>
      <div class="ap-2col">
        <label class="field"><span>Room</span><select id="apRoom" class="ap-select">${roomOpts}</select></label>
        <label class="field short"><span>Water every … days</span><input id="apInterval" type="number" inputmode="numeric" min="1" value="${esc(String(d.intervalDays))}"></label>
      </div>
      <label class="field"><span>Where it lives</span><input id="apLocation" value="${esc(d.location)}" placeholder="Living room shelf (north facing)" autocomplete="off"></label>
      <label class="field"><span>Pot</span><input id="apPot" value="${esc(d.pot)}" placeholder="12cm terracotta in a cream cover pot" autocomplete="off"></label>
      <label class="toggle-row" data-toggle="dailyCheck"><span>Check moisture daily <i>(thirsty herbs like basil)</i></span><span class="toggle ${d.dailyCheck ? 'on' : ''}"></span></label>
    </div>

    <div class="card">
      <h3>📝 Care notes <i>(all optional)</i></h3>
      <label class="field"><span>💧 Watering</span><textarea id="apWatering" rows="2" placeholder="Let the top inch dry between waterings.">${esc(d.wateringText)}</textarea></label>
      <label class="field"><span>☀️ Light</span><textarea id="apLight" rows="2" placeholder="Bright indirect light. No direct sun.">${esc(d.light)}</textarea></label>
      <label class="toggle-row" data-toggle="feedSkip"><span>Skip feeding <i>(doesn't need it)</i></span><span class="toggle ${d.feedSkip ? 'on' : ''}"></span></label>
      ${d.feedSkip ? '' : `
      <label class="field"><span>🧴 Feeding</span><textarea id="apFeeding" rows="2" placeholder="Diluted feed every 2 weeks, spring–autumn.">${esc(d.feedingText)}</textarea></label>
      <label class="field"><span>First feed</span><input id="apFirstFeed" value="${esc(d.firstFeed)}" placeholder="Early September"></label>`}
      <label class="toggle-row" data-toggle="mistNeeded"><span>💦 Needs misting</span><span class="toggle ${d.mistNeeded ? 'on' : ''}"></span></label>
      ${d.mistNeeded ? `<label class="field"><span>Misting note</span><textarea id="apMisting" rows="2" placeholder="Mist most mornings; loves humidity.">${esc(d.mistingText)}</textarea></label>` : ''}
      <label class="field"><span>✨ Special</span><input id="apSpecial" value="${esc(d.special)}" placeholder="The prayer — leaves fold up at night!"></label>
      <label class="field"><span>Notes</span><input id="apNotes" value="${esc(d.notes)}" placeholder="Anything else…"></label>
    </div>

    <button id="btnAddPlant" class="primary big-save">🌿 Add ${d.name ? esc(d.name.trim()) : 'plant'}</button>
    <div style="height:6px"></div>
  </section>`;
}

// ---- today / reminders ----
function todayView() {
  const t = todayISO();
  const rem = todaysReminders(store, t);
  const urgent = rem.filter(r => r.urgent);
  const soft = rem.filter(r => !r.urgent);

  const rowFor = r => {
    if (r.kind === 'morning') {
      return `<button class="rem-row ${r.done ? 'done' : 'morning'}" data-morning>
        <span class="rem-emoji">${r.emoji}</span>
        <div class="rem-body"><b>${esc(r.title)}</b><span>${esc(r.sub)}</span></div>
        <span class="rem-tick">${r.done ? '✓' : '→'}</span></button>`;
    }
    const tap = r.kind === 'water' ? `data-water="${esc(r.plantId)}"`
      : r.kind === 'mist' ? `data-mist="${esc(r.plantId)}"`
      : `data-plant="${esc(r.plantId)}"`;
    return `<button class="rem-row ${r.urgent ? 'urgent' : ''}" ${tap}>
      <span class="rem-emoji">${r.emoji}</span>
      <div class="rem-body"><b>${esc(r.title)}</b><span>${esc(r.sub)}</span></div>
      <span class="rem-tick">${r.kind === 'water' ? '💧' : r.kind === 'mist' ? '💦' : '›'}</span></button>`;
  };

  const allHappy = !urgent.length;
  return `
  <section class="screen today">
    <div class="hero">
      <div class="hero-sun">☀️</div>
      <p class="hero-label">${esc(today().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
      <h2 class="hero-title">What the babies need</h2>
    </div>

    ${allHappy ? `<div class="card done-card"><span>🌿</span><b>${esc(sunshineLine('allWatered'))}</b></div>` : ''}

    ${urgent.length ? `<div class="rem-group"><h3 class="grp-title">💧 Needs you now</h3>${urgent.map(rowFor).join('')}</div>` : ''}
    ${soft.length ? `<div class="rem-group"><h3 class="grp-title">🌸 Gentle reminders</h3>${soft.map(rowFor).join('')}</div>` : ''}

    <p class="hint tip">Tap 💧 to log a watering, 💦 to log a mist — or open a plant for the full picture.</p>
  </section>`;
}

// ---- feeding / fertiliser ----
function feedingView() {
  const t = todayISO();
  const f = fertiliserView(store);
  const rounds = f.rounds.map(r => `
    <div class="card">
      <h3>${esc(r.label)}</h3>
      <div class="fert-list">
        ${r.items.map(it => `
          <div class="fert-row ${it.feed ? '' : 'skip'}">
            <span class="fert-emoji">${it.emoji}</span>
            <span class="fert-name">${esc(it.name)}</span>
            <span class="fert-dose">${it.feed ? '' : '🚫 '}${esc(it.dose)}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  const feedable = store.data.plants.filter(p => !(p.feeding && p.feeding.skip));
  const log = feedable.map(p => `
    <button class="feed-log-row" data-feed="${esc(p.id)}">
      <span class="fert-emoji">${p.emoji}</span>
      <span class="fert-name">${esc(p.name)}</span>
      <span class="feed-when">${p.feeding && p.feeding.lastFed ? 'fed ' + esc(agoText(p.feeding.lastFed, t)) : 'not fed yet'}</span>
      <span class="feed-tap">🧴</span>
    </button>`).join('');

  return `
  <section class="screen feeding">
    <h2 class="screen-title">🧴 Feeding schedule</h2>
    <div class="card note-card"><span>💡</span><p>${esc(f.note)}</p></div>
    ${rounds}
    <div class="card">
      <h3>🧴 Log a feed</h3>
      <p class="hint">Tap when you feed — it records today's date on that plant.</p>
      <div class="feed-log">${log}</div>
    </div>
  </section>`;
}

// ---- cruise / away ----
function cruiseView() {
  const c = store.data.cruise || {};
  const byId = Object.fromEntries(store.data.plants.map(p => [p.id, p]));
  const riskTone = { easy: 'ok', ok: 'soon', hard: 'due' };
  const rows = (c.sitter || []).map(s => {
    const p = byId[s.plant] || { name: s.plant, emoji: '🌿' };
    return `
    <div class="sitter-row tone-${riskTone[s.risk] || 'ok'}">
      <span class="sitter-emoji">${p.emoji}</span>
      <div class="sitter-body">
        <b>${esc(p.name)} ${s.risk === 'hard' ? '⚠️' : s.risk === 'easy' ? '💤' : ''}</b>
        <p>${esc(s.instruction)}</p>
      </div>
    </div>`;
  }).join('');

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  return `
  <section class="screen cruise">
    <div class="hero">
      <div class="hero-sun">🚢🌿</div>
      <p class="hero-label">${esc(fmt(c.from))} – ${esc(fmt(c.to))}</p>
      <h2 class="hero-title">${esc(c.label || 'Away mode')}</h2>
    </div>
    ${c.note ? `<div class="card note-card"><span>🤡</span><p>${esc(c.note)}</p></div>` : ''}
    <p class="hint">Hand this screen to whoever's plant-sitting. ⚠️ = needs real attention, 💤 = leave it be.</p>
    <div class="sitter-list">${rows}</div>
  </section>`;
}

// ---- settings / more ----
function settingsView() {
  const bums = Object.entries(store.data.bumClubs || {}).map(([key, c]) => `
    <div class="bum-row tone-${esc(key)}">
      <span class="bum-emoji">${c.emoji}</span>
      <div><b>${esc(c.label)}</b><p>${esc(c.rule)}</p></div>
    </div>`).join('');

  const incoming = (store.data.incoming || []).map(i => `
    <li>${i.emoji}${i.musicianEmoji || ''} <b>${esc(i.name)}</b> — ${esc(i.note)}</li>`).join('');
  const dream = (store.data.dream || []).map(i => `
    <li>${i.emoji} <b>${esc(i.name)}</b> — ${esc(i.note)}</li>`).join('');
  const envs = (store.data.environment || []).map(e => `
    <div class="env-row"><span class="env-emoji">${e.emoji}</span>
      <div><b>${esc(e.name)}</b> <i>${esc(e.facing)}</i><p>${esc(e.notes)}</p></div></div>`).join('');

  return `
  <section class="screen settings">
    <h2 class="screen-title">⚙️ More</h2>

    <div class="card">
      <h3>💛 Auto-save to GitHub</h3>
      <p class="hint">Same token as the Meal Planner &amp; Budget Tracker — if you've set one up, you're already connected.
        No token = read-only. See <a href="SETUP.md" target="_blank">SETUP.md</a>.</p>
      <label class="field"><span>Repository</span><input id="setRepo" value="${esc(gh.repo)}" placeholder="cannedelf/iris-journal"></label>
      <label class="field"><span>Branch</span><input id="setBranch" value="${esc(gh.branch)}" placeholder="main"></label>
      <label class="field"><span>Access token</span><input id="setToken" type="password" placeholder="github_pat_…" value="${gh.token ? '••••••••••••' : ''}"></label>
      <div class="row2"><button id="setSave" class="primary">Save &amp; connect</button>
        <button id="setResync" class="ghost">🔄 Reload latest</button></div>
      <p class="hint">🔒 The token is stored only in this browser. Scope it to this repo with <b>Contents: read &amp; write</b>.</p>
    </div>

    <div class="card">
      <h3>🍑 The Bum Club system</h3>
      <div class="bum-list">${bums}</div>
    </div>

    <div class="card">
      <h3>🌿 Incoming plants</h3>
      <ul class="plain-list">${incoming || '<li class="empty">None yet.</li>'}</ul>
    </div>
    <div class="card">
      <h3>💗 Dream plants</h3>
      <ul class="plain-list">${dream || '<li class="empty">None yet.</li>'}</ul>
    </div>
    <div class="card">
      <h3>🏠 The flat</h3>
      <div class="env-list">${envs}</div>
    </div>

    <div class="card">
      <h3>💾 Backup</h3>
      <p class="hint">Keep your own copy, just in case.</p>
      <button id="dlBackup" class="ghost" style="width:100%">💾 Download data backup (.json)</button>
    </div>

    <p class="version">Pink to Leaf 🌿💗 · data: ${esc(store.source)}${store.dirty ? ' · unsaved' : ''}</p>
    <p class="version">A good plant mum doesn't hoard, she NURTURES. 🌿🤲💛</p>
  </section>`;
}

// =====================================================================
//  RENDER + ROUTER
// =====================================================================

const VIEWS = { home: homeView, today: todayView, feeding: feedingView, cruise: cruiseView, settings: settingsView };

function render() {
  if (!store.data) return;
  $('#app').innerHTML = state.adding ? addView()
    : (state.view === 'home' && state.plantId) ? plantView(state.plantId)
    : (VIEWS[state.view] || homeView)();
  document.querySelectorAll('.navbtn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === state.view));
  refreshStatus();
}

function go(view) {
  state.view = view; state.plantId = null; state.adding = false; state.draft = null; state.pendingPhoto = null;
  render(); window.scrollTo(0, 0);
}
function openPlant(id) { state.view = 'home'; state.plantId = id; state.adding = false; state.draft = null; state.pendingPhoto = null; render(); window.scrollTo(0, 0); }
function openAdd() { state.view = 'home'; state.plantId = null; state.adding = true; state.draft = blankDraft(); render(); window.scrollTo(0, 0); }

// ---------- event wiring (delegated) ----------
function wire() {
  document.querySelectorAll('.navbtn').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
  $('#app').addEventListener('click', onAppClick);
  $('#app').addEventListener('change', onAppChange);
}

async function onAppClick(e) {
  const t = e.target.closest('[data-plant],[data-go],[data-back-home],[data-morning],[data-water],[data-feed],[data-mist],[data-glog-del],[data-add],[data-cancel-add],[data-club],[data-toggle],[data-remove-plant],#btnGrow,#btnAddPlant,#setSave,#setResync,#dlBackup');
  if (!t) return;

  if (t.hasAttribute('data-add')) return openAdd();
  if (t.hasAttribute('data-cancel-add')) { state.adding = false; state.draft = null; return render(); }
  if (t.dataset.club) return onClubPick(t.dataset.club);
  if (t.dataset.toggle) return onToggle(t.dataset.toggle);
  if (t.id === 'btnAddPlant') return onAddPlant();
  if (t.dataset.removePlant) return onRemovePlant(t.dataset.removePlant);

  if (t.dataset.plant) return openPlant(t.dataset.plant);
  if (t.dataset.go) return go(t.dataset.go);
  if (t.hasAttribute('data-back-home')) { state.plantId = null; state.pendingPhoto = null; return render(); }
  if (t.hasAttribute('data-morning')) return onMorning();
  if (t.dataset.water) return onWater(t.dataset.water);
  if (t.dataset.feed) return onFeed(t.dataset.feed);
  if (t.dataset.mist) return onMist(t.dataset.mist);
  if (t.dataset.glogDel != null) return onGrowDel(+t.dataset.glogDel);
  if (t.id === 'btnGrow') return onGrowAdd();
  if (t.id === 'setSave') return onTokenSave();
  if (t.id === 'setResync') return onResync();
  if (t.id === 'dlBackup') return onBackup();
}

function onAppChange(e) {
  if (e.target.id === 'growPhoto') return onPhotoPick(e.target);
}

async function onMorning() {
  const res = await save(store.sayGoodMorning(), null);
  if (res && res.saved && !res.already) toast(sunshineLine('streak'), 'ok');
  render();
}
async function onWater(id) { await save(store.waterPlant(id), 'Logged 💧'); render(); }
async function onFeed(id) { await save(store.feedPlant(id), 'Fed 🧴'); render(); }
async function onMist(id) { await save(store.mistPlant(id), 'Misted 💦'); render(); }

// ---- add-plant handlers ----
function onClubPick(key) {
  state.draft = readAddForm();
  state.draft.bumClub = key;
  state.draft.intervalDays = INTERVAL_SUGGEST[key] || state.draft.intervalDays || 6;
  render();
}
function onToggle(field) {
  state.draft = readAddForm();
  state.draft[field] = !state.draft[field];
  render();
}
async function onAddPlant() {
  const f = readAddForm();
  if (!(f.name || '').trim()) { toast('Give the new baby a name 🌿', 'warn'); const el = $('#apName'); if (el) el.focus(); return; }
  const res = await save(store.addPlant(f), `${f.name.trim()} joined the family 🌿`);
  state.draft = null; state.adding = false;
  if (res && res.id) openPlant(res.id); else render();
}
async function onRemovePlant(id) {
  const p = store.plant(id);
  if (!p) return;
  if (!confirm(`Remove ${p.name} from Pink to Leaf? This can't be undone (photos stay in the repo).`)) return;
  await save(store.removePlant(id), `${p.name} removed`);
  state.plantId = null; state.adding = false;
  render(); window.scrollTo(0, 0);
}

async function onGrowDel(i) {
  if (!store.plant(state.plantId)) return;
  await save(store.removeGrowthNote(state.plantId, i), null);
  render();
}

async function onGrowAdd() {
  const note = ($('#growNote') && $('#growNote').value || '').trim();
  const leaves = ($('#growLeaves') && $('#growLeaves').value || '').trim();
  if (!note && !leaves && !state.pendingPhoto) { toast('Add a note, a leaf count, or a photo.', 'warn'); return; }
  let src = null;
  if (state.pendingPhoto) {
    toast('Saving photo…', 'ok');
    try { src = await store.savePhoto(state.plantId, state.pendingPhoto); }
    catch (err) { toast('Photo upload failed — saved the note.', 'err'); }
  }
  await save(store.addGrowthNote(state.plantId, { note, leaves, src }), sunshineLine('logged'));
  state.pendingPhoto = null;
  render(); window.scrollTo(0, 0);
}

function onPhotoPick(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    state.pendingPhoto = await resizePhoto(reader.result);
    render();
  };
  reader.readAsDataURL(file);
}

// Resize in-browser so the repo stays lean (mirrors the family-tree app).
function resizePhoto(dataUrl, maxDim = 1024, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const heavy = dataUrl.length > 1.5 * 1024 * 1024;
      if (scale === 1 && !heavy) { resolve(dataUrl); return; }
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      try { resolve(canvas.toDataURL('image/jpeg', quality)); }
      catch (_) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function onTokenSave() {
  const repo = $('#setRepo').value.trim();
  const branch = $('#setBranch').value.trim();
  const tok = $('#setToken').value.trim();
  if (repo) gh.repo = repo;
  if (branch) gh.branch = branch;
  if (tok && !/^•+$/.test(tok)) gh.token = tok;
  try {
    if (gh.configured) { await gh.verify(); await store.discardLocalAndReload(); }
    toast('Connected to GitHub 💛', 'ok');
  } catch (err) {
    toast('Could not connect: ' + err.message, 'err');
  }
  render();
}

async function onResync() {
  try { await store.discardLocalAndReload(); toast('Reloaded latest from GitHub', 'ok'); render(); }
  catch (err) { toast('Reload failed: ' + err.message, 'err'); }
}

function onBackup() {
  const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `pink-to-leaf-${todayISO()}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('Backup downloaded 💾', 'ok');
}

// ---------- boot ----------
async function boot() {
  wire();
  store.onChange(() => { if (store.data) refreshStatus(); });
  try {
    await store.load();
    render();
  } catch (err) {
    $('#app').innerHTML = `<div class="screen"><div class="card"><h3>Couldn't load 😞</h3>
      <p class="hint">${esc(err.message)}</p>
      <button class="primary" onclick="location.reload()">Try again</button></div></div>`;
  }
}

boot();
