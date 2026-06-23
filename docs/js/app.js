// App entry point: header, family tabs, search, household toggle, settings, and wiring.

import { store } from './store.js';
import { gh } from './github.js';
import { renderTree, renderHouseholds, getColourMode, setColourMode } from './tree.js';
import { renderPredictor } from './predictor.js';
import { renderNames, renderLots, renderStats } from './extras.js';
import { openProfile, openNewSim, openNewPet, openNewHousehold, openHousehold, openNewLot, openLot } from './profile.js';
import { SIM_TYPES } from './constants.js';

let current = { view: 'tree', family: 'rainbow' };

const el = (id) => document.getElementById(id);

async function boot() {
  try {
    await store.load();
  } catch (e) {
    el('stage').innerHTML = `<div class="error">Couldn't load Sunnyside data.<br><small>${e.message}</small></div>`;
    return;
  }
  buildTabs();
  buildSearch();
  buildLegend();
  bindControls();
  render();
  updateStatus();
  updateColourUI();

  window.addEventListener('open-node', (e) => openProfile(e.detail.id));
  window.addEventListener('open-household', (e) => openHousehold(e.detail.id));
  window.addEventListener('data-updated', () => { render(); buildSearch(); });
  store.onChange(updateStatus);
}

function buildTabs() {
  const tabs = el('tabs');
  tabs.innerHTML = '';
  store.data.families.forEach(f => {
    if (!store.data.people.some(p => p.family === f.id)) return;
    const b = document.createElement('button');
    b.className = 'tab';
    b.style.setProperty('--c', f.colour);
    b.innerHTML = `${f.emoji || ''} ${f.name}`;
    b.dataset.family = f.id;
    b.addEventListener('click', () => { current = { view: 'tree', family: f.id }; render(); });
    tabs.appendChild(b);
  });
}

function render() {
  // Active states.
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', current.view === 'tree' && t.dataset.family === current.family));
  ['btnHouseholds:households', 'btnPredict:predict', 'btnNames:names', 'btnLots:lots', 'btnStats:stats']
    .forEach(pair => { const [id, v] = pair.split(':'); const b = el(id); if (b) b.classList.toggle('active', current.view === v); });

  const stage = el('stage');
  if (current.view === 'predict') { renderPredictor(stage, current.predictSim); el('legend').classList.remove('show'); return; }
  const views = { households: renderHouseholds, names: renderNames, lots: renderLots, stats: renderStats };
  if (views[current.view]) { views[current.view](stage); el('legend').classList.remove('show'); return; }
  renderTree(stage, current.family);
  if (typeof updateColourUI === 'function') updateColourUI();
}

function buildSearch() {
  const all = [...store.data.people, ...store.data.pets]
    .sort((a, b) => (a.display || a.name || '').toLowerCase().localeCompare((b.display || b.name || '').toLowerCase()));
  const list = el('searchList');
  list.innerHTML = all.map(n =>
    `<button class="search-item" data-id="${n.id}">${n.emoji || '👤'} ${escapeHtml(n.display || n.name)}
      <small>${escapeHtml((store.family(n.family) || {}).name || (n.ownerId ? 'pet' : ''))}</small></button>`).join('');
  list.querySelectorAll('.search-item').forEach(b =>
    b.addEventListener('click', () => { openProfile(b.dataset.id); closeSearch(); }));
}

function filterSearch(q) {
  q = q.toLowerCase();
  el('searchList').querySelectorAll('.search-item').forEach(b => {
    b.style.display = b.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function openSearch() { el('searchOverlay').classList.add('open'); el('searchInput').value = ''; filterSearch(''); el('searchInput').focus(); }
function closeSearch() { el('searchOverlay').classList.remove('open'); }

function bindControls() {
  el('btnHouseholds').addEventListener('click', () => { current.view = current.view === 'households' ? 'tree' : 'households'; render(); });
  el('btnPredict').addEventListener('click', () => { current.predictSim = undefined; current.view = current.view === 'predict' ? 'tree' : 'predict'; render(); });
  window.addEventListener('open-predictor', (e) => { current.predictSim = e.detail.id; current.view = 'predict'; render(); });
  el('btnNames').addEventListener('click', () => { current.view = current.view === 'names' ? 'tree' : 'names'; render(); });
  el('btnLots').addEventListener('click', () => { current.view = current.view === 'lots' ? 'tree' : 'lots'; render(); });
  el('btnStats').addEventListener('click', () => { current.view = current.view === 'stats' ? 'tree' : 'stats'; render(); });
  el('addMenu').querySelector('[data-add-lot]').addEventListener('click', () => { el('addMenu').classList.remove('open'); openNewLot(); });
  window.addEventListener('open-lot', (e) => openLot(e.detail.index));
  el('btnColour').addEventListener('click', () => {
    setColourMode(getColourMode() === 'family' ? 'type' : 'family');
    updateColourUI();
    if (current.view === 'tree') render();
  });
  el('btnSearch').addEventListener('click', openSearch);
  el('btnAdd').addEventListener('click', (e) => { e.stopPropagation(); el('addMenu').classList.toggle('open'); });
  el('addMenu').querySelector('[data-add-sim]').addEventListener('click', () => { el('addMenu').classList.remove('open'); openNewSim(); });
  el('addMenu').querySelector('[data-add-pet]').addEventListener('click', () => { el('addMenu').classList.remove('open'); openNewPet(); });
  el('addMenu').querySelector('[data-add-hh]').addEventListener('click', () => { el('addMenu').classList.remove('open'); openNewHousehold(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.add-wrap')) el('addMenu').classList.remove('open'); });
  el('searchInput').addEventListener('input', (e) => filterSearch(e.target.value));
  el('searchOverlay').addEventListener('click', (e) => { if (e.target === el('searchOverlay')) closeSearch(); });
  el('btnZoomIn').addEventListener('click', () => stageSvg()?._zoom(1));
  el('btnZoomOut').addEventListener('click', () => stageSvg()?._zoom(-1));
  el('btnZoomReset').addEventListener('click', () => stageSvg()?._reset());
  el('btnSettings').addEventListener('click', openSettings);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSearch(); el('settingsOverlay').classList.remove('open'); }
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault(); openSearch();
    }
  });
}

const stageSvg = () => el('stage').querySelector('svg');

function buildLegend() {
  el('legend').innerHTML = '<strong>Sim type</strong>' + SIM_TYPES.map(t =>
    `<span class="leg"><i style="background:${t.soft};border:2px solid ${t.colour}"></i>${t.emoji ? t.emoji + ' ' : ''}${t.label || t.name}</span>`).join('');
}

function updateColourUI() {
  const mode = getColourMode();
  el('btnColour').textContent = mode === 'type' ? '🎨 Colour: Type' : '🎨 Colour: Family';
  el('btnColour').classList.toggle('active', mode === 'type');
  el('legend').classList.toggle('show', mode === 'type' && current.view === 'tree');
}

function updateStatus() {
  const s = el('saveStatus');
  if (!gh.configured) { s.textContent = '○ Read-only (no token)'; s.className = 'status readonly'; return; }
  if (store.dirty) { s.textContent = '● Unsaved…'; s.className = 'status dirty'; return; }
  s.textContent = '● Auto-saving to GitHub'; s.className = 'status saved';
}

// ---------- Settings / token ----------------------------------------------
function openSettings() {
  const o = el('settingsOverlay');
  o.classList.add('open');
  el('setRepo').value = gh.repo;
  el('setBranch').value = gh.branch;
  el('setToken').value = gh.token;
  el('setMsg').textContent = '';
}

function bindSettings() {
  el('settingsOverlay').addEventListener('click', (e) => { if (e.target === el('settingsOverlay')) el('settingsOverlay').classList.remove('open'); });
  el('setCancel').addEventListener('click', () => el('settingsOverlay').classList.remove('open'));
  el('setResync').addEventListener('click', async () => {
    const msg = el('setMsg');
    // Point back at the app's own branch (clears any stale override) and reload fresh.
    localStorage.removeItem('sunnyside.branch');
    el('setBranch').value = gh.branch;
    msg.textContent = 'Reloading latest from GitHub…';
    try {
      await store.discardLocalAndReload();
      buildTabs(); buildSearch(); buildLegend(); render(); updateStatus(); updateColourUI();
      msg.textContent = '✓ Reloaded! Everything is back in sync.';
    } catch (e) {
      msg.textContent = '✗ ' + e.message;
    }
  });
  el('setSave').addEventListener('click', async () => {
    gh.repo = el('setRepo').value;
    gh.branch = el('setBranch').value;
    gh.token = el('setToken').value;
    const msg = el('setMsg');
    if (!gh.token) { msg.textContent = 'Saved (read-only — no token set).'; updateStatus(); return; }
    msg.textContent = 'Checking token…';
    try {
      await gh.verify();
      msg.textContent = '✓ Connected! Reloading latest data…';
      await store.load();
      buildTabs(); buildSearch(); render(); updateStatus();
      setTimeout(() => el('settingsOverlay').classList.remove('open'), 900);
    } catch (e) {
      msg.textContent = '✗ ' + e.message;
    }
  });
}

const escapeHtml = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

bindSettings();
boot();
