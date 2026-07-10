// Sunshine Meal Planner — app shell, routing and views.
// Mobile-first. The whole UI is rendered from `store.data`; every change goes through
// store.commit() which caches locally and auto-saves to GitHub when a token is set.

import { store } from './store.js';
import { gh } from './github.js';
import {
  SECTIONS, sectionMeta, DAYS, DAY_LABEL, dayKey, isoDate,
  buildShoppingList, tubTonight, sunshineLine
} from './meals.js';

// ---------- tiny helpers ----------
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function today() { return new Date(); }

// ---------- app state ----------
const state = {
  view: 'home',        // home | plan | recipes | shop | settings
  recipeId: null,      // which recipe is open on the recipes view
  shopMode: 'check'    // 'check' (cupboard adjust) | 'buy' (in-the-shop checklist)
};

// ---------- save-status badge ----------
function setStatus(kind, text) {
  const el = $('#saveStatus');
  if (!el) return;
  el.className = 'status ' + kind;
  el.textContent = text;
}
function refreshStatus() {
  if (!gh.configured) return setStatus('readonly', '○ Read-only');
  if (store.dirty) return setStatus('saving', '… Saving');
  setStatus('saved', '● Auto-saving');
}

let toastTimer = null;
function toast(msg, kind = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
}

// Run a commit and surface the result to the user.
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

function mealLine(slotId, slotLabel) {
  const m = store.resolveMeal(slotId);
  if (!m) return '';
  const tappable = m.recipe ? `data-recipe="${esc(m.recipe.id)}"` : '';
  return `
    <button class="meal-line ${m.recipe ? 'has-recipe' : ''}" ${tappable}>
      <span class="meal-emoji">${m.emoji || '🍽️'}</span>
      <span class="meal-text"><i>${slotLabel}</i>${esc(m.label)}</span>
      ${m.recipe ? '<span class="meal-go">›</span>' : ''}
    </button>`;
}

function viewHome() {
  const now = today();
  const k = dayKey(now);
  const plan = store.data.mealPlan[k] || {};
  const tub = tubTonight(store.data, now);
  const list = buildShoppingList(store.data);

  const weekGrid = DAYS.map(d => {
    const p = store.data.mealPlan[d] || {};
    const dn = store.resolveMeal(p.dinner);
    const isToday = d === k;
    return `<button class="wk-cell ${isToday ? 'today' : ''}" data-go="plan">
      <span class="wk-day">${DAY_LABEL[d].slice(0, 3)}</span>
      <span class="wk-emoji">${dn ? (dn.emoji || '🍽️') : '·'}</span>
    </button>`;
  }).join('');

  return `
  <section class="screen home">
    <div class="hero">
      <div class="hero-sun">🌻</div>
      <p class="hero-label">Today — ${DAY_LABEL[k]}</p>
      <h2 class="hero-title">Here's your day, sunshine</h2>
    </div>

    <div class="card today-card">
      ${mealLine(plan.breakfast, 'Breakfast')}
      ${mealLine(plan.lunch, 'Lunch')}
      ${mealLine(plan.dinner, 'Dinner')}
    </div>

    ${tub ? `
    <div class="card tub-card ${tub.tub ? 'tub-yes' : 'tub-no'}">
      <span class="tub-emoji">${tub.tub ? '📦' : '🎉'}</span>
      <div><b>${tub.tub ? 'Tub for tomorrow' : 'No tub tonight'}</b>
        <p>${esc(tub.text)}</p></div>
    </div>` : ''}

    <div class="card">
      <div class="card-head"><h3>This week at a glance</h3>
        <button class="link" data-go="plan">Full plan →</button></div>
      <div class="wk-grid">${weekGrid}</div>
    </div>

    <button class="bigbtn" data-go="shop">🛒 &nbsp;Shopping list${list.totalToBuy ? ` <span class="pill">${list.totalToBuy}</span>` : ''}</button>
  </section>`;
}

function viewPlan() {
  const k = dayKey(today());
  const conns = store.data.connections || [];
  const connFor = day => conns.find(c => c.fromDay === day);

  const days = DAYS.map(d => {
    const p = store.data.mealPlan[d] || {};
    const conn = connFor(d);
    return `
    <div class="day-card ${d === k ? 'today' : ''}">
      <div class="day-head"><h3>${DAY_LABEL[d]}</h3>${d === k ? '<span class="badge">today</span>' : ''}</div>
      ${mealLine(p.breakfast, 'Breakfast')}
      ${mealLine(p.lunch, 'Lunch')}
      ${mealLine(p.dinner, 'Dinner')}
      ${conn ? `<div class="conn">↩ <span>${esc(conn.label)}</span></div>` : ''}
    </div>`;
  }).join('');

  return `
  <section class="screen plan">
    <h2 class="screen-title">📅 The week — Sat to Fri</h2>
    <p class="hint">Tap any meal with a › to open the recipe. The ↩ arrows show the cook-once-eat-twice links.</p>
    ${days}
  </section>`;
}

function viewRecipes() {
  if (state.recipeId) return viewRecipe(state.recipeId);
  const cards = store.data.recipes
    .filter(r => (r.ingredients || []).length)
    .map(r => {
      // which day(s) is it assigned to?
      const days = DAYS.filter(d => {
        const p = store.data.mealPlan[d] || {};
        return p.breakfast === r.id || p.lunch === r.id || p.dinner === r.id;
      }).map(d => DAY_LABEL[d].slice(0, 3));
      return `
      <button class="recipe-card" data-recipe="${esc(r.id)}">
        <span class="recipe-emoji">${r.emoji}</span>
        <div class="recipe-meta">
          <b>${esc(r.name)}</b>
          <span>${days.length ? days.join(' · ') : 'this week'} · serves ${esc(String(r.servings))}</span>
        </div>
        <span class="meal-go">›</span>
      </button>`;
    }).join('');

  return `
  <section class="screen recipes">
    <h2 class="screen-title">🍳 Recipes</h2>
    <div class="recipe-list">${cards}</div>
  </section>`;
}

function viewRecipe(id) {
  const r = store.recipe(id);
  if (!r) { state.recipeId = null; return viewRecipes(); }
  const days = DAYS.filter(d => {
    const p = store.data.mealPlan[d] || {};
    return p.breakfast === id || p.lunch === id || p.dinner === id;
  }).map(d => DAY_LABEL[d]);

  const ings = (r.ingredients || []).map(i => {
    const meta = sectionMeta(i.section);
    const emoji = i.emoji || meta.emoji;
    return `<li>
      <span class="ing-sec">${emoji}</span>
      <span class="ing-name">${esc(i.item)}${i.note ? ` <i>— ${esc(i.note)}</i>` : ''}</span>
      ${i.qty ? `<span class="ing-qty">${esc(i.qty)}</span>` : ''}
    </li>`;
  }).join('');

  const steps = (r.steps || []).map(s => `<li>${esc(s)}</li>`).join('');

  return `
  <section class="screen recipe">
    <button class="back" data-back-recipes>‹ All recipes</button>
    <div class="recipe-hero">
      <span class="recipe-hero-emoji">${r.emoji}</span>
      <h2>${esc(r.name)}</h2>
      <p class="recipe-tags">Serves ${esc(String(r.servings))}${days.length ? ` · ${esc(days.join(', '))}` : ''}</p>
    </div>
    ${r.fat ? `<div class="fat-note">🫶 ${esc(r.fat)}</div>` : ''}
    ${r.lunchNote ? `<div class="lunch-note">📦 ${esc(r.lunchNote)}</div>` : ''}

    <div class="card">
      <h3>Ingredients</h3>
      <ul class="ing-list">${ings}</ul>
    </div>
    <div class="card">
      <h3>Method</h3>
      <ol class="step-list">${steps}</ol>
    </div>
  </section>`;
}

function viewShop() {
  const gen = store.data.shopping.generated;
  if (!gen) return viewShopIntro();
  const list = buildShoppingList(store.data);
  return state.shopMode === 'buy' ? viewShopBuy(list, gen) : viewShopCheck(list, gen);
}

function viewShopIntro() {
  const snacks = store.data.snacks.available;
  const selected = new Set(store.data.snacks.selected);
  const chips = snacks.map(s => `
    <button class="snack-chip ${selected.has(s.id) ? 'sel' : ''}" data-snack="${esc(s.id)}">
      <span>${s.emoji}</span><span>${esc(s.name)}</span>
    </button>`).join('');

  return `
  <section class="screen shop">
    <h2 class="screen-title">🛒 Shopping list</h2>
    <p class="hint">Pick this week's snacks, then generate. The app adds up every ingredient across all your meals and snacks — no double-counting.</p>

    <div class="card">
      <h3>🍎 Snacks this week</h3>
      <div class="snack-grid">${chips}</div>
    </div>

    ${customCard()}

    <button id="btnGenerate" class="bigbtn">✨ Generate shopping list</button>
  </section>`;
}

function itemRow(item, mode) {
  // Spice-rack items carry a vague "check you have some" — drop it when it's a real buy line.
  const need = item.qtyText === 'check you have some' ? '' : item.qtyText;
  const sources = item.sources.length > 1
    ? `<span class="src">for ${esc(item.sources.join(' + '))}</span>` : '';
  if (mode === 'buy') {
    return `
    <button class="buy-row ${item.checked ? 'done' : ''}" data-check="${esc(item.key)}">
      <span class="tick">${item.checked ? '✓' : ''}</span>
      <span class="buy-main"><b>${esc(item.name)}</b>${need ? ` <i>${esc(need)}</i>` : ''}${sources}</span>
    </button>`;
  }
  // check-cupboard mode: stepper for "I already have"
  return `
  <div class="chk-row ${item.got ? 'got' : ''}">
    <div class="chk-main">
      <b>${esc(item.name)}</b> <i>${esc(need)}</i>${sources}
      ${item.have ? `<span class="have-note">have ${item.have} — buy the rest</span>` : ''}
    </div>
    <div class="chk-tools">
      <div class="stepper">
        <button data-have-minus="${esc(item.key)}">−</button>
        <span>${item.have}</span>
        <button data-have-plus="${esc(item.key)}">+</button>
      </div>
      <button class="gotbtn ${item.got ? 'on' : ''}" data-got="${esc(item.key)}" title="Got it — hide">${item.got ? '✓ got it' : 'got it'}</button>
    </div>
  </div>`;
}

// Manage-your-extras card (add / pin / remove). Shown on the intro and cupboard views.
function customCard() {
  const items = store.data.custom.items || [];
  const rows = items.map(i => `
    <div class="custom-row">
      <span class="custom-name">${esc(i.name)}</span>
      <button class="pin ${i.permanent ? 'on' : ''}" data-custom-pin="${esc(i.id)}"
        title="${i.permanent ? 'Always on the list — tap to unpin' : 'Pin so it always appears'}">📌</button>
      <button class="custom-del" data-custom-del="${esc(i.id)}" title="Remove">✕</button>
    </div>`).join('');

  return `
  <div class="card custom-card">
    <h3>🧺 Household &amp; Extras</h3>
    <p class="hint">Non-recipe bits — cordial, toilet roll, cleaning stuff. 📌 keeps an item on <b>every</b> list; the rest clear when you finish the shop.</p>
    <div class="custom-add">
      <input id="customInput" type="text" placeholder="Add an item…" maxlength="40" autocomplete="off">
      <button id="btnAddCustom" class="primary">Add</button>
    </div>
    <div class="custom-list">${rows || '<p class="empty">Nothing added yet.</p>'}</div>
  </div>`;
}

// Pseudo buy-rows for the custom items, so they tick off like everything else in the shop.
function customBuyItems() {
  return (store.data.custom.items || []).map(i => ({
    key: store.customKey(i.id), name: i.name, qtyText: '', sources: [], notes: [],
    checked: !!store.data.shopping.checked[store.customKey(i.id)], got: false
  }));
}

function viewShopCheck(list, gen) {
  const sections = list.sections.map(s => `
    <div class="card sec-card">
      <h3>${s.emoji} ${esc(s.label)}</h3>
      ${s.items.map(i => itemRow(i, 'check')).join('')}
    </div>`).join('');

  const cupboard = list.cupboard.length ? `
    <div class="card cupboard-card">
      <h3>🌶️ Spice rack & store cupboard</h3>
      <p class="hint">Tick the ones you already have. Anything you leave unticked gets added to your shopping list.</p>
      ${list.cupboard.map(i => `
        <button class="cup-row ${i.got ? 'got' : ''}" data-got="${esc(i.key)}">
          <span class="tick">${i.got ? '✓' : '○'}</span><span class="cup-name">${esc(i.name)}</span>
          ${i.got ? '' : '<span class="cup-tag">on the list</span>'}
        </button>`).join('')}
    </div>` : '';

  return `
  <section class="screen shop">
    <div class="shop-head">
      <h2 class="screen-title">🛒 Check the cupboard</h2>
      <span class="gen-date">generated ${esc(gen)}</span>
    </div>
    <p class="hint">Tap <b>+</b> if you already have some — "buy 3" becomes "buy 1". Tap <b>got it</b> to remove it.</p>
    ${sections || '<div class="card"><p class="empty">Nothing to buy — pick some meals!</p></div>'}
    ${cupboard}
    ${customCard()}
    <div class="shop-actions">
      <button id="btnToBuy" class="bigbtn">🛍️ Go shopping →</button>
      <button id="btnReset" class="ghost">↺ Reset list</button>
    </div>
  </section>`;
}

function viewShopBuy(list, gen) {
  // In the shop: only what you actually need to buy (not got, with quantity left).
  const sections = list.sections
    .map(s => ({ ...s, items: s.items.filter(i => !i.got) }))
    .filter(s => s.items.length);

  // Cupboard staples you did NOT tick as "already have" get their own aisle on the list.
  const cupboardToBuy = list.cupboard.filter(i => !i.got);
  if (cupboardToBuy.length) {
    sections.push({ emoji: '🌶️', label: 'Spice Rack & Store Cupboard', items: cupboardToBuy });
  }

  // Household & extras (cordial et al.) get their own aisle at the end.
  const custom = customBuyItems();
  if (custom.length) {
    sections.push({ emoji: '🧺', label: 'Household & Extras', items: custom });
  }

  const allDone = sections.every(s => s.items.every(i => i.checked)) && sections.length;
  const blocks = sections.map(s => `
    <div class="card sec-card">
      <h3>${s.emoji} ${esc(s.label)}</h3>
      ${s.items.map(i => itemRow(i, 'buy')).join('')}
    </div>`).join('');

  return `
  <section class="screen shop">
    <div class="shop-head">
      <h2 class="screen-title">🛍️ In the shop</h2>
      <span class="gen-date">${esc(gen)}</span>
    </div>
    <p class="hint">Tick things off as they go in the basket. One thumb, one tap. 🛒</p>
    ${blocks || '<div class="card"><p class="empty">All sorted — nothing left to buy! 🌻</p></div>'}
    ${allDone ? `<div class="card done-card"><span>🌻</span><b>${esc(sunshineLine('shopDone'))}</b></div>` : ''}
    <div class="shop-actions">
      <button id="btnBackCheck" class="ghost">‹ Back to cupboard</button>
      <button id="btnDone" class="bigbtn">✅ Done — clear list</button>
    </div>
  </section>`;
}

function viewSettings() {
  const m = store.data.meta;
  return `
  <section class="screen settings">
    <h2 class="screen-title">⚙️ More</h2>

    <div class="card">
      <h3>💛 Auto-save to GitHub</h3>
      <p class="hint">Same token as the Budget Tracker — if you've set that up, you're already connected.
        No token = read-only. See <a href="SETUP.md" target="_blank">SETUP.md</a>.</p>
      <label class="field"><span>Repository</span><input id="setRepo" value="${esc(gh.repo)}" placeholder="cannedelf/iris-journal"></label>
      <label class="field"><span>Branch</span><input id="setBranch" value="${esc(gh.branch)}" placeholder="main"></label>
      <label class="field"><span>Access token</span><input id="setToken" type="password" placeholder="github_pat_…" value="${gh.token ? '••••••••••••' : ''}"></label>
      <div class="row2"><button id="setSave" class="primary">Save &amp; connect</button>
        <button id="setResync" class="ghost">🔄 Reload latest</button></div>
      <p class="hint">🔒 The token is stored only in this browser. Scope it to this repo with <b>Contents: read &amp; write</b>.</p>
    </div>

    <div class="card">
      <h3>🍂 Season</h3>
      <p class="hint">Current set: <b>${esc(m.season || 'summer')}</b>. Autumn/winter swaps are coming in a later update — for now edit recipes straight in <code>meals.json</code>.</p>
    </div>

    <div class="card">
      <h3>💾 Backup</h3>
      <p class="hint">Keep your own copy, just in case.</p>
      <button id="dlBackup" class="ghost" style="width:100%">💾 Download data backup (.json)</button>
    </div>

    <p class="version">Sunshine Meal Planner 🌻🍳 · data: ${esc(store.source)}${store.dirty ? ' · unsaved' : ''}</p>
    <p class="version">No fish. Not now. Not ever. 🐟❌</p>
  </section>`;
}

// =====================================================================
//  RENDER + ROUTER
// =====================================================================

const VIEWS = { home: viewHome, plan: viewPlan, recipes: viewRecipes, shop: viewShop, settings: viewSettings };

function render() {
  if (!store.data) return;
  $('#app').innerHTML = (VIEWS[state.view] || viewHome)();
  document.querySelectorAll('.navbtn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === state.view));
  refreshStatus();
}

function go(view) {
  state.view = view;
  state.recipeId = null;   // tapping any nav tab (incl. Recipes) returns to the list
  render();
  window.scrollTo(0, 0);
}

function openRecipe(id) { state.view = 'recipes'; state.recipeId = id; render(); window.scrollTo(0, 0); }

// ---------- event wiring (delegated) ----------
function wire() {
  document.querySelectorAll('.navbtn').forEach(b =>
    b.addEventListener('click', () => go(b.dataset.view)));
  $('#app').addEventListener('click', onAppClick);
  // Enter in the custom-item box adds it.
  $('#app').addEventListener('keydown', e => {
    if (e.target.id === 'customInput' && e.key === 'Enter') { e.preventDefault(); onAddCustom(); }
  });
}

async function onAppClick(e) {
  const t = e.target.closest('[data-go],[data-recipe],[data-back-recipes],[data-snack],[data-have-plus],[data-have-minus],[data-got],[data-check],[data-custom-pin],[data-custom-del],#btnGenerate,#btnToBuy,#btnBackCheck,#btnReset,#btnDone,#btnAddCustom,#setSave,#setResync,#dlBackup');
  if (!t) return;

  if (t.dataset.customPin) return onCustomPin(t.dataset.customPin);
  if (t.dataset.customDel) return onCustomDel(t.dataset.customDel);

  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.recipe) return openRecipe(t.dataset.recipe);
  if (t.hasAttribute('data-back-recipes')) { state.recipeId = null; return render(); }

  if (t.dataset.snack) return onSnack(t.dataset.snack);
  if (t.dataset.havePlus) return onHave(t.dataset.havePlus, +1);
  if (t.dataset.haveMinus) return onHave(t.dataset.haveMinus, -1);
  if (t.dataset.got) return onGot(t.dataset.got);
  if (t.dataset.check) return onChecked(t.dataset.check);

  if (t.id === 'btnGenerate') return onGenerate();
  if (t.id === 'btnToBuy') { state.shopMode = 'buy'; render(); window.scrollTo(0, 0); return; }
  if (t.id === 'btnBackCheck') { state.shopMode = 'check'; render(); window.scrollTo(0, 0); return; }
  if (t.id === 'btnReset') return onReset();
  if (t.id === 'btnDone') return onDone();
  if (t.id === 'btnAddCustom') return onAddCustom();
  if (t.id === 'setSave') return onTokenSave();
  if (t.id === 'setResync') return onResync();
  if (t.id === 'dlBackup') return onBackup();
}

async function onSnack(id) {
  await save(store.toggleSnack(id), null);
  render();
}

async function onAddCustom() {
  const inp = $('#customInput');
  const name = (inp && inp.value || '').trim();
  if (!name) return;
  await save(store.addCustomItem(name), null);
  render();
  const box = $('#customInput');
  if (box) box.focus();     // keep typing more items
}

async function onCustomPin(id) {
  await save(store.toggleCustomPermanent(id), null);
  render();
}

async function onCustomDel(id) {
  await save(store.removeCustomItem(id), null);
  render();
}

async function onHave(key, delta) {
  const cur = store.data.shopping.have[key] || 0;
  await save(store.setHave(key, cur + delta), null);
  render();
}

async function onGot(key) {
  await save(store.toggleGot(key), null);
  render();
}

async function onChecked(key) {
  await save(store.toggleChecked(key), null);
  render();
}

async function onGenerate() {
  await save(store.generateShoppingList(isoDate(today())), 'Shopping list ready 🛒');
  state.shopMode = 'check';
  render();
  window.scrollTo(0, 0);
}

async function onReset() {
  if (!confirm('Reset the shopping list? Clears what you ticked and what you said you have.')) return;
  await save(store.resetShoppingList(), 'List reset 🌻');
  state.shopMode = 'check';
  render();
}

async function onDone() {
  await save(store.resetShoppingList(), sunshineLine('shopDone'));
  state.shopMode = 'check';
  go('home');
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
  a.href = url;
  a.download = `sunshine-meals-${isoDate(today())}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
