// Sunshine Budget Tracker — app shell, routing and views.
// Mobile-first. The whole UI is rendered from `store.data`; every change goes through
// store.commit() which caches locally and auto-saves to GitHub when a token is set.

import { store } from './store.js';
import { gh } from './github.js';
import {
  parseDate, isoDate, weekStart, addDays, weekOfMonth, monthLabel, monthKey,
  sameMonth, money, weeklyStatus, sunshine, monthlyBreakdown, spendingKey
} from './budget.js';

// ---------- tiny helpers ----------
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function today() { return new Date(); }

// ---------- app state ----------
const state = {
  view: 'home',                 // home | log | month | history | settings
  month: monthKey(today()),     // which month the Month/History views look at
  histFilter: 'all',            // category filter on History
  logDraft: null                // { amount, category, note, date } while editing the log form
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
  if (res && res.saved) { toast(okMsg || 'Saved to GitHub 💛', 'ok'); }
  else if (res && res.reason === 'no-token') { toast('Saved on this device. Add a token in ⚙️ to sync.', 'warn'); }
  else if (res && res.reason === 'error') { toast('Saved locally — GitHub save failed. Check ⚙️.', 'err'); }
  refreshStatus();
  return res;
}

// ---------- month navigation helpers ----------
function monthDateFromKey(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1); }
function shiftMonth(key, delta) { const d = monthDateFromKey(key); d.setMonth(d.getMonth() + delta); return monthKey(d); }

// =====================================================================
//  VIEWS
// =====================================================================

function viewHome() {
  const now = today();
  const ws = weeklyStatus(store.data, now);
  const sun = sunshine(ws.status, ws.remaining);
  const pct = Math.max(0, Math.min(100, ws.allowance ? (ws.remaining / ws.allowance) * 100 : 0));
  const wom = weekOfMonth(now);
  const mb = monthlyBreakdown(store.data, now);

  const sunday = addDays(ws.monday, 6);
  const range = `${ws.monday.getDate()} ${shortMonth(ws.monday)} – ${sunday.getDate()} ${shortMonth(sunday)}`;

  return `
  <section class="screen home">
    <div class="bigcard ${ws.status}">
      <div class="sun ${sun.mood}">${sun.face}</div>
      <p class="bigcard-label">Spending money left this week</p>
      <p class="bigcard-amount">${money(ws.remaining)}</p>
      <div class="depbar"><div class="depbar-fill" style="width:${pct}%"></div></div>
      <p class="bigcard-sub">of ${money(ws.allowance)} ·
        Week ${wom} · ${esc(range)}</p>
      ${ws.carriedDebt < 0 ? `<p class="carry">↪ ${money(-ws.carriedDebt)} borrowed from an earlier week</p>` : ''}
      <p class="sun-line">${esc(sun.line)}</p>
    </div>

    <button class="biglog" data-go="log">➕ &nbsp;Log a spend</button>

    <div class="card">
      <div class="card-head"><h3>This month so far</h3>
        <button class="link" data-go="month">See all →</button></div>
      <div class="mini-row"><span>Spent (flexible)</span><b>${money(mb.loggedOut)}</b></div>
      <div class="mini-row"><span>Savings</span><b>${mb.savingsHit ? '✅ ' : ''}${money(mb.savings)} / ${money(mb.savingsTarget)}</b></div>
      ${mb.income ? `<div class="mini-row"><span>In vs out</span><b>${money(mb.income)} / ${money(mb.totalOut)}</b></div>` : ''}
    </div>
  </section>`;
}

function shortMonth(d) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; }

function loggableCats() {
  return store.data.meta.categories.filter(c => c.type !== 'fixed');
}

function viewLog() {
  const d = state.logDraft || (state.logDraft = { amount: '', category: spendingKey(store.data.meta), note: '', date: isoDate(today()) });
  const chips = loggableCats().map(c => `
    <button class="chip ${c.key === d.category ? 'sel' : ''}" data-cat="${esc(c.key)}">
      <span class="chip-emoji">${c.emoji || '•'}</span><span>${esc(c.label)}</span>
    </button>`).join('');

  return `
  <section class="screen log">
    <h2 class="screen-title">➕ Log a spend</h2>
    <label class="field amount-field">
      <span>Amount</span>
      <div class="amount-input"><span class="curr">£</span>
        <input id="logAmount" type="number" inputmode="decimal" step="0.01" min="0"
               placeholder="0.00" value="${esc(d.amount)}" autocomplete="off"></div>
    </label>

    <p class="field-label">Category</p>
    <div class="chips">${chips}</div>

    <label class="field">
      <span>Note <i>(optional)</i></span>
      <input id="logNote" type="text" maxlength="80" placeholder="e.g. Lucy &amp; Yak sale" value="${esc(d.note)}">
    </label>

    <label class="field">
      <span>Date</span>
      <input id="logDate" type="date" value="${esc(d.date)}">
    </label>

    <button id="logSave" class="biglog">Save spend ✨</button>
  </section>`;
}

function viewMonth() {
  const md = monthDateFromKey(state.month);
  const mb = monthlyBreakdown(store.data, md);
  const isThis = sameMonth(md, today());

  const flexRows = mb.rows.filter(r => r.type !== 'fixed').map(r => {
    const showBudget = r.budget > 0;
    return `
    <div class="catrow ${r.over ? 'over' : ''}">
      <div class="catrow-top">
        <span class="catname">${r.emoji || '•'} ${esc(r.label)}</span>
        <span class="catnum">${money(r.spent)}${showBudget ? ` <i>/ ${money(r.budget)}</i>` : ''}</span>
      </div>
      ${showBudget ? `<div class="bar"><div class="bar-fill ${r.over ? 'over' : ''}" style="width:${r.pct}%"></div></div>` : ''}
    </div>`;
  }).join('');

  // Fixed categories (Bills, Subscriptions) render as tappable breakdowns when they
  // carry an itemised list, otherwise as a plain reference line.
  const fixedRows = mb.rows.filter(r => r.type === 'fixed').map(r => {
    const items = r.items || [];
    if (!items.length) return `<div class="mini-row"><span>${r.emoji} ${esc(r.label)}</span><b>${money(r.budget)} <i>fixed</i></b></div>`;
    const lines = items.map(it => `<div class="mini-row sub"><span>${esc(it.label)}</span><b>${money(it.amount)}</b></div>`).join('');
    return `<details class="breakdown"><summary><span>${r.emoji} ${esc(r.label)}</span><b>${money(r.budget)} <span class="chev">▸</span></b></summary>${lines}</details>`;
  }).join('');

  return `
  <section class="screen month">
    <div class="monthnav">
      <button class="nav" data-month="-1">‹</button>
      <h2>${monthLabel(md)}${isThis ? ' <small>· this month</small>' : ''}</h2>
      <button class="nav" data-month="1" ${isThis ? 'disabled' : ''}>›</button>
    </div>

    <div class="card savings-card ${mb.savingsHit ? 'hit' : 'miss'}">
      <span class="savings-face">${mb.savingsHit ? '✅' : '⭕'}</span>
      <div><b>Savings ${mb.savingsHit ? 'on track!' : 'this month'}</b>
        <p>${money(mb.savings)} of ${money(mb.savingsTarget)} target${mb.savingsAnnual ? ` · ${money(mb.savingsAnnual)}/year 🎯` : ''}</p></div>
    </div>

    <div class="card">
      <h3>Category breakdown</h3>
      ${flexRows || '<p class="empty">No spends logged yet this month.</p>'}
    </div>

    <div class="card">
      <h3>Fixed (reference only)</h3>
      <p class="hint" style="margin-top:-2px">Tap a row to see every line. 💀 Fourteen subscriptions were harmed.</p>
      ${fixedRows}
      <div class="mini-row total"><span>Total out (logged + savings + fixed)</span><b>${money(mb.totalOut)}</b></div>
      ${mb.income ? `${mb.incomeItems.length
          ? `<details class="breakdown"><summary><span>Money in</span><b>${money(mb.income)} <span class="chev">▸</span></b></summary>${
              mb.incomeItems.map(it => `<div class="mini-row sub"><span>${esc(it.label)}</span><b>${money(it.amount)}</b></div>`).join('')}</details>`
          : `<div class="mini-row total"><span>Money in</span><b>${money(mb.income)}</b></div>`}
        <div class="mini-row total ${mb.income - mb.totalOut < 0 ? 'over' : ''}"><span>Left over</span><b>${money(mb.income - mb.totalOut)}</b></div>` : ''}
    </div>

    ${mb.income ? `<div class="card buffer-card">
      <span class="buffer-face">🛟</span>
      <div><b>Buffer — your safety net</b>
        <p class="buffer-amount">${money(mb.plannedBuffer)}<i>/month planned</i></p>
        <p class="hint" style="margin:4px 0 0">Not spending money — it covers emergencies &amp; quarterly bills. Left after income minus every budget.</p></div>
    </div>` : ''}
  </section>`;
}

function viewHistory() {
  const md = monthDateFromKey(state.month);
  const cats = store.data.meta.categories;
  const catMap = Object.fromEntries(cats.map(c => [c.key, c]));

  let entries = store.data.entries
    .filter(e => sameMonth(parseDate(e.date), md))
    .filter(e => state.histFilter === 'all' || e.category === state.histFilter)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const filterOpts = ['<option value="all">All categories</option>']
    .concat(cats.map(c => `<option value="${esc(c.key)}" ${state.histFilter === c.key ? 'selected' : ''}>${c.emoji} ${esc(c.label)}</option>`))
    .join('');

  const rows = entries.map(e => {
    const c = catMap[e.category] || { emoji: '•', label: e.category };
    return `
    <div class="entry" data-id="${esc(e.id)}">
      <span class="entry-emoji">${c.emoji || '•'}</span>
      <div class="entry-main">
        <b>${money(e.amount)}</b>
        <span class="entry-meta">${esc(c.label)}${e.note ? ' · ' + esc(e.note) : ''}</span>
      </div>
      <span class="entry-date">${esc(prettyDate(e.date))}</span>
      <button class="entry-del" data-del="${esc(e.id)}" title="Delete">✕</button>
    </div>`;
  }).join('');

  return `
  <section class="screen history">
    <div class="monthnav">
      <button class="nav" data-month="-1">‹</button>
      <h2>${monthLabel(md)}</h2>
      <button class="nav" data-month="1" ${sameMonth(md, today()) ? 'disabled' : ''}>›</button>
    </div>
    <select id="histFilter" class="select">${filterOpts}</select>
    <div class="runtotal"><span>${entries.length} spend${entries.length === 1 ? '' : 's'}</span><b>${money(total)}</b></div>
    <div class="entries">${rows || '<p class="empty">Nothing logged here yet.</p>'}</div>
  </section>`;
}

function prettyDate(str) {
  const d = parseDate(str);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getDate()} ${shortMonth(d)}`;
}

function viewSettings() {
  const m = store.data.meta;
  const cat = k => m.categories.find(c => c.key === k) || {};
  return `
  <section class="screen settings">
    <h2 class="screen-title">⚙️ Settings</h2>

    <div class="card">
      <h3>💛 Auto-save to GitHub</h3>
      <p class="hint">Paste a fine-grained access token to save every spend straight to your repo.
        No token = read-only. See <a href="SETUP.md" target="_blank">SETUP.md</a>.</p>
      <label class="field"><span>Repository</span><input id="setRepo" value="${esc(gh.repo)}" placeholder="cannedelf/iris-journal"></label>
      <label class="field"><span>Branch</span><input id="setBranch" value="${esc(gh.branch)}" placeholder="main"></label>
      <label class="field"><span>Access token</span><input id="setToken" type="password" placeholder="github_pat_…" value="${gh.token ? '••••••••••••' : ''}"></label>
      <div class="row2"><button id="setSave" class="primary">Save &amp; connect</button>
        <button id="setResync" class="ghost">🔄 Reload latest</button></div>
      <p class="hint">🔒 The token is stored only in this browser. Use a token scoped to just this repo with <b>Contents: read &amp; write</b>.</p>
    </div>

    <div class="card">
      <h3>💰 Budgets</h3>
      <label class="field inline"><span>Weekly spending money</span><div class="amount-input"><span class="curr">£</span><input id="bWeekly" type="number" step="1" value="${esc(m.weeklyBudget)}"></div></label>
      <label class="field inline"><span>Monthly income <i>(optional)</i></span><div class="amount-input"><span class="curr">£</span><input id="bIncome" type="number" step="1" value="${esc(m.monthlyIncome || '')}"></div></label>
      ${m.categories.map(c => `
        <label class="field inline"><span>${c.emoji} ${esc(c.label)}</span>
          <div class="amount-input"><span class="curr">£</span>
            <input class="bcat" data-key="${esc(c.key)}" type="number" step="1" value="${esc(c.budget || 0)}"></div></label>`).join('')}
      <button id="bSave" class="primary" style="width:100%">Save budgets</button>
    </div>

    <div class="card">
      <h3>💾 Backup</h3>
      <p class="hint">Keep your own copy, just in case.</p>
      <button id="dlBackup" class="ghost" style="width:100%">💾 Download data backup (.json)</button>
    </div>

    <p class="version">Sunshine Budget Tracker 🌻 · data: ${esc(store.source)}${store.dirty ? ' · unsaved' : ''}</p>
  </section>`;
}

// =====================================================================
//  RENDER + ROUTER
// =====================================================================

const VIEWS = { home: viewHome, log: viewLog, month: viewMonth, history: viewHistory, settings: viewSettings };

function render() {
  if (!store.data) return;
  $('#app').innerHTML = VIEWS[state.view] ? VIEWS[state.view]() : viewHome();
  document.querySelectorAll('.navbtn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === state.view));
  refreshStatus();
  // Focus the amount field when the log screen opens.
  if (state.view === 'log') { const a = $('#logAmount'); if (a) a.focus(); }
}

function go(view) { state.view = view; render(); window.scrollTo(0, 0); }

// ---------- event wiring (delegated) ----------
function wire() {
  // Bottom nav
  document.querySelectorAll('.navbtn').forEach(b =>
    b.addEventListener('click', () => go(b.dataset.view)));

  // Everything inside #app via delegation.
  $('#app').addEventListener('click', onAppClick);
  $('#app').addEventListener('input', onAppInput);
  $('#app').addEventListener('change', onAppChange);
}

function onAppClick(e) {
  const t = e.target.closest('[data-go], [data-cat], [data-month], [data-del], #logSave, #setSave, #setResync, #bSave, #dlBackup');
  if (!t) return;

  if (t.dataset.go) return go(t.dataset.go);

  if (t.dataset.cat) {                       // pick a category chip
    state.logDraft.category = t.dataset.cat;
    return render();
  }
  if (t.dataset.month) {                      // month navigation
    state.month = shiftMonth(state.month, Number(t.dataset.month));
    return render();
  }
  if (t.dataset.del) return onDelete(t.dataset.del);
  if (t.id === 'logSave') return onLogSave();
  if (t.id === 'setSave') return onTokenSave();
  if (t.id === 'setResync') return onResync();
  if (t.id === 'bSave') return onBudgetSave();
  if (t.id === 'dlBackup') return onBackup();
}

// Keep the log draft in sync as the user types (so switching chips doesn't wipe input).
function onAppInput(e) {
  if (state.view !== 'log') return;
  const d = state.logDraft;
  if (e.target.id === 'logAmount') d.amount = e.target.value;
  if (e.target.id === 'logNote') d.note = e.target.value;
  if (e.target.id === 'logDate') d.date = e.target.value;
}

function onAppChange(e) {
  if (e.target.id === 'histFilter') { state.histFilter = e.target.value; render(); }
}

async function onLogSave() {
  const d = state.logDraft;
  const amount = Number(d.amount);
  if (!amount || amount <= 0) return toast('Pop in an amount first 🌻', 'warn');
  if (!d.category) return toast('Pick a category', 'warn');
  await save(store.addEntry({ date: d.date || isoDate(today()), amount, category: d.category, note: d.note }),
    `Logged ${money(amount)} 💛`);
  state.logDraft = null;     // reset the form
  go('home');
}

async function onDelete(id) {
  const e = store.data.entries.find(x => x.id === id);
  if (!e) return;
  if (!confirm(`Delete ${money(e.amount)}${e.note ? ' — ' + e.note : ''}?`)) return;
  await save(store.deleteEntry(id), 'Deleted');
  render();
}

async function onTokenSave() {
  const repo = $('#setRepo').value.trim();
  const branch = $('#setBranch').value.trim();
  const tok = $('#setToken').value.trim();
  if (repo) gh.repo = repo;
  if (branch) gh.branch = branch;
  if (tok && !/^•+$/.test(tok)) gh.token = tok;     // ignore the masked placeholder
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

async function onBudgetSave() {
  const weekly = Number($('#bWeekly').value) || 0;
  const income = Number($('#bIncome').value) || 0;
  const cats = store.data.meta.categories.map(c => {
    const inp = document.querySelector(`.bcat[data-key="${CSS.escape(c.key)}"]`);
    return { ...c, budget: inp ? (Number(inp.value) || 0) : c.budget };
  });
  store.data.meta.categories = cats;
  await save(store.setBudgets({ weeklyBudget: weekly, monthlyIncome: income }), 'Budgets saved 💛');
  render();
}

function onBackup() {
  const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sunshine-budget-${isoDate(today())}.json`;
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
