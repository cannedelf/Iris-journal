// Sunshine Budget Tracker — app shell, routing and views.
// Mobile-first. The whole UI is rendered from `store.data`; every change goes through
// store.commit() which caches locally and auto-saves to GitHub when a token is set.

import { store } from './store.js';
import { gh } from './github.js';
import {
  parseDate, isoDate, weekStart, addDays, money, weeklyStatus, sunshine,
  periodBreakdown, spendingKey, getPayDay, periodStart, samePeriod,
  shiftPeriod, periodLabel, weekOfPeriod, sortMoney,
  fundProgress, widdleStatus, novunaStatus, cardTrend
} from './budget.js';

// ---------- tiny helpers ----------
const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function today() { return new Date(); }

// ---------- app state ----------
const state = {
  view: 'home',                 // home | log | month | history | settings
  period: null,                 // ISO date of the viewed pay-period start (null = current)
  histFilter: 'all',            // category filter on History
  logDraft: null                // { amount, category, note, date } while editing the log form
};

// The pay day and the period the Month/History views are currently showing.
function payDay() { return getPayDay(store.data.meta); }
function curPeriod() { return state.period ? parseDate(state.period) : periodStart(today(), payDay()); }

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

// =====================================================================
//  VIEWS
// =====================================================================

function viewHome() {
  const now = today();
  const ws = weeklyStatus(store.data, now);
  const sun = sunshine(ws.status, ws.remaining);
  const pct = Math.max(0, Math.min(100, ws.allowance ? (ws.remaining / ws.allowance) * 100 : 0));
  const wom = weekOfPeriod(now, payDay());
  const mb = periodBreakdown(store.data, now);

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
      <div class="card-head"><h3>This pay period so far</h3>
        <button class="link" data-go="month">See all →</button></div>
      <div class="mini-row"><span>Spent (flexible)</span><b>${money(mb.loggedOut)}</b></div>
      <div class="mini-row"><span>Savings</span><b>${mb.savingsHit ? '✅ ' : ''}${money(mb.savings)} / ${money(mb.savingsTarget)}</b></div>
      ${mb.income ? `<div class="mini-row"><span>In vs out</span><b>${money(mb.income)} / ${money(mb.totalOut)}</b></div>` : ''}
    </div>

    ${trackerCards(now)}
  </section>`;
}

// The five goal & debt trackers shown on the dashboard.
function trackerCards(now) {
  const m = store.data.meta;
  const f = m.funds || {}, d = m.debts || {};
  const cards = [];

  // 🎯 Emergency fund progress
  if (f.emergency) {
    const p = fundProgress(f.emergency, now);
    cards.push(`
    <div class="card tracker">
      <div class="tracker-head"><span>${f.emergency.emoji || '🎯'} ${esc(f.emergency.label || 'Emergency Fund')}</span>
        <b>${money(p.balance)} <i>/ ${money(p.target)}</i></b></div>
      <div class="bar big"><div class="bar-fill emerg" style="width:${p.pct}%"></div></div>
      <div class="tracker-foot"><span>${Math.round(p.pct)}% there${p.hit ? ' 🎉' : ''}</span>
        <span>${p.eta ? `~${p.monthsToGo} mo · ${esc(p.eta)} at ${money(p.monthly)}/mo` : (p.hit ? 'Target hit!' : '')}</span></div>
    </div>`);
  }

  // 🏖️ Holiday fund
  if (f.holiday) {
    cards.push(`
    <div class="card tracker holiday-card">
      <div class="tracker-head"><span>${f.holiday.emoji || '🏖️'} ${esc(f.holiday.label || 'Holiday Fund')}</span>
        <b>${money(f.holiday.balance || 0)}</b></div>
      <p class="hint" style="margin:2px 0 0">Grows with the 🧮 sorter &amp; Widdle repayments. Watch it climb! 🌴</p>
    </div>`);
  }

  // 🍊 Widdle debt countdown
  if (d.widdle) {
    const w = widdleStatus(d.widdle);
    cards.push(`
    <div class="card tracker">
      <div class="tracker-head"><span>${d.widdle.emoji || '🍊'} ${esc(d.widdle.label || 'Widdle')}</span>
        <b>${money(w.remaining)} <i>left</i></b></div>
      <div class="bar big"><div class="bar-fill widdle" style="width:${w.pct}%"></div></div>
      <div class="tracker-foot"><span>${money(w.paid)} of ${money(w.total)} paid</span>
        <span>${w.remaining > 0 ? (w.monthsToGo ? `~${w.monthsToGo} mo left` : '') : 'Paid off! 🎉'}</span></div>
      <button class="ghost tracker-btn" data-widdle-pay>＋ Log a repayment <i>(→ holiday fund)</i></button>
    </div>`);
  }

  // 🏠 Novuna kitchen-loan countdown
  if (d.novuna) {
    const n = novunaStatus(d.novuna, now);
    cards.push(`
    <div class="card tracker">
      <div class="tracker-head"><span>${d.novuna.emoji || '🏠'} ${esc(d.novuna.label || 'Kitchen Loan')}</span>
        <b>${money(n.monthly)}<i>/mo</i></b></div>
      ${n.endDate
        ? `<div class="tracker-foot"><span>~${n.monthsToGo} months left</span><span>ends ${esc(monthShortYear(n.endDate))}</span></div>
           <p class="freed">🎉 ${money(n.monthly)}/month FREE when it ends!!</p>`
        : `<p class="hint" style="margin:6px 0 8px">📅 End date not set yet — pop it in to start the countdown. When it ends you get ${money(n.monthly)}/month free!!</p>
           <button class="ghost tracker-btn" data-novuna-date>📅 Set end date</button>`}
    </div>`);
  }

  // 📊 Credit-card month-on-month
  const ct = cardTrend(m.cardHistory);
  cards.push(`
    <div class="card tracker">
      <div class="tracker-head"><span>📊 Credit card</span>${ct.latest ? `<b>${money(ct.latest.amount)}</b>` : ''}</div>
      ${ct.latest
        ? `${ct.delta != null
              ? `<p class="card-trend ${ct.improved ? 'good' : 'up'}">${ct.improved
                    ? `📉 ${money(-ct.delta)} less than last month — get it! 🎉`
                    : `📈 ${money(ct.delta)} more than last month`}</p>`
              : '<p class="hint" style="margin:2px 0 0">First month recorded — the trend starts next month.</p>'}
           ${miniCardBars(ct.list)}`
        : '<p class="hint" style="margin:2px 0 0">Record a month-end in the 🧮 Sorter to start tracking your card trend.</p>'}
    </div>`);

  return `<h3 class="tracker-title">🎯 Your goals</h3>${cards.join('')}`;
}

function monthShortYear(d) { return `${shortMonth(d)} ${d.getFullYear()}`; }

// Tiny bar chart of the last few periods' credit-card totals.
function miniCardBars(list) {
  if (!list.length) return '';
  const recent = list.slice(-6);
  const max = Math.max(...recent.map(h => h.amount), 1);
  const bars = recent.map(h => {
    const label = shortMonth(parseDate(h.period));
    return `<div class="cbar"><div class="cbar-fill" style="height:${Math.max(6, (h.amount / max) * 100)}%"></div><span>${esc(label)}</span></div>`;
  }).join('');
  return `<div class="cbars">${bars}</div>`;
}

function shortMonth(d) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; }

function loggableCats() {
  // Fixed reference lines and automatic transfers (standing orders/DDs) aren't logged by hand.
  return store.data.meta.categories.filter(c => c.type !== 'fixed' && !c.auto);
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
  const md = curPeriod();
  const mb = periodBreakdown(store.data, md);
  const isThis = samePeriod(md, today(), payDay());

  const flexRows = mb.rows.filter(r => r.type !== 'fixed').map(r => {
    const showBudget = r.budget > 0;
    if (r.auto) {
      // Automatic transfer — it always lands, so show it as done rather than a spend bar.
      return `
      <div class="catrow">
        <div class="catrow-top">
          <span class="catname">${r.emoji || '•'} ${esc(r.label)}</span>
          <span class="catnum">${money(r.budget)} <i>auto ✓</i></span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:100%"></div></div>
      </div>`;
    }
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
      <button class="nav" data-period="-1">‹</button>
      <h2>${periodLabel(md, payDay())}${isThis ? ' <small>· now</small>' : ''}</h2>
      <button class="nav" data-period="1" ${isThis ? 'disabled' : ''}>›</button>
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
  const md = curPeriod();
  const cats = store.data.meta.categories;
  const catMap = Object.fromEntries(cats.map(c => [c.key, c]));

  let entries = store.data.entries
    .filter(e => samePeriod(parseDate(e.date), md, payDay()))
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
      <button class="nav" data-period="-1">‹</button>
      <h2>${periodLabel(md, payDay())}</h2>
      <button class="nav" data-period="1" ${samePeriod(md, today(), payDay()) ? 'disabled' : ''}>›</button>
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

// ---------- 🧮 End-of-Month Money Sorter ----------
function viewSorter() {
  const s = state.sorter || (state.sorter = { balance: '', card: '' });
  return `
  <section class="screen sorter">
    <h2 class="screen-title">🧮 End-of-Month Sorter</h2>
    <p class="hint" style="margin-top:0">Payday's here — let's sort what's left. Pop in your two numbers and I'll tell you exactly where every pound goes. 💛</p>

    <label class="field amount-field">
      <span>💷 Current account balance</span>
      <div class="amount-input"><span class="curr">£</span>
        <input id="sortBalance" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${esc(s.balance)}" autocomplete="off"></div>
    </label>
    <label class="field amount-field">
      <span>💳 Credit card balance to clear</span>
      <div class="amount-input"><span class="curr">£</span>
        <input id="sortCard" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${esc(s.card)}" autocomplete="off"></div>
    </label>

    <div id="sorterResult">${renderSorterResult()}</div>

    <p class="hint">Your tier is set by your <b>true leftover</b> (what's left after clearing the card) — not by how much you spent. A big month can still be a <i>fine</i> month. 💛 The card is <b>always</b> paid in full.</p>
  </section>`;
}

// Renders just the results block (recomputed live as the numbers change).
function renderSorterResult() {
  const s = state.sorter || { balance: '', card: '' };
  if (s.balance === '' && s.card === '') return '';
  const r = sortMoney(s.balance, s.card);

  if (r.overspent) {
    return `<div class="sort-card warn">
      <div class="sort-tier">🫣 Overspent this month</div>
      <p>Your card bill (${money(r.card)}) is more than what's in the account, so there's nothing to sort this time.
      ${r.highCard ? '<b>Still pay the card in full</b> — 23% interest is nobody\'s friend.' : 'Pay what you can and go gently next month. 💛'}</p>
    </div>`;
  }

  return `
  <div class="sort-card ${r.tier.celebrate ? 'queen' : ''}">
    ${r.tier.celebrate ? '<div class="queen-banner">👑 QUEEN MODE! Look at you go!! 🎉</div>' : ''}
    <div class="sort-tier">${r.tier.emoji} ${esc(r.tier.name)} <span class="tier-split">${Math.round(r.tier.holiday * 100)}% holiday · ${Math.round(r.tier.chase * 100)}% emergency</span></div>
    <p class="sort-leftover">✨ True leftover: <b>${money(r.remainder)}</b> <span>— that's what sets your tier</span></p>

    <div class="sort-row pay"><span>💳 Pay off credit card</span><b>${money(r.card)}</b></div>
    ${r.highCard ? '<p class="sort-warn">⚠️ Big balance — pay it in full to dodge 23% interest.</p>' : ''}
    <div class="sort-row"><span>🏖️ Holiday fund</span><b>${money(r.holiday)}</b></div>
    <div class="sort-row"><span>🏦 Chase emergency fund</span><b>${money(r.chase)}</b></div>
    <div class="sort-row keep"><span>💷 Keep in current account</span><b>${money(0)}</b></div>

    <p class="sort-note">Sweep it <b>all</b> — the current account is bills money only. ✨</p>
    <button class="primary" style="width:100%;margin-top:10px" data-sort-record>✅ Record this month <i>(top up the funds)</i></button>
  </div>`;
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
      <label class="field inline"><span>Pay day <i>(day of month)</i></span><input id="bPayDay" type="number" step="1" min="1" max="31" style="width:90px" value="${esc(getPayDay(m))}"></label>
      <p class="hint" style="margin-top:-2px">Your budget runs payday-to-payday (e.g. 25th → 24th), not by calendar month. Set to 1 for calendar months.</p>
      <label class="field inline"><span>Weekly spending money</span><div class="amount-input"><span class="curr">£</span><input id="bWeekly" type="number" step="1" value="${esc(m.weeklyBudget)}"></div></label>
      <label class="field inline"><span>Income per period <i>(optional)</i></span><div class="amount-input"><span class="curr">£</span><input id="bIncome" type="number" step="1" value="${esc(m.monthlyIncome || '')}"></div></label>
      ${m.categories.map(c => `
        <label class="field inline"><span>${c.emoji} ${esc(c.label)}</span>
          <div class="amount-input"><span class="curr">£</span>
            <input class="bcat" data-key="${esc(c.key)}" type="number" step="1" value="${esc(c.budget || 0)}"></div></label>`).join('')}
      <button id="bSave" class="primary" style="width:100%">Save budgets</button>
    </div>

    <div class="card">
      <h3>🎯 Funds &amp; debts</h3>
      <p class="hint" style="margin-top:-2px">These usually update themselves from the sorter and repayments — but you can correct any figure here.</p>
      <label class="field inline"><span>🎯 Emergency balance</span><div class="amount-input"><span class="curr">£</span><input id="fEmBal" type="number" step="1" value="${esc((m.funds.emergency||{}).balance ?? '')}"></div></label>
      <label class="field inline"><span>🎯 Emergency target</span><div class="amount-input"><span class="curr">£</span><input id="fEmTgt" type="number" step="1" value="${esc((m.funds.emergency||{}).target ?? '')}"></div></label>
      <label class="field inline"><span>🎯 Monthly top-up</span><div class="amount-input"><span class="curr">£</span><input id="fEmMon" type="number" step="1" value="${esc((m.funds.emergency||{}).monthly ?? '')}"></div></label>
      <label class="field inline"><span>🏖️ Holiday balance</span><div class="amount-input"><span class="curr">£</span><input id="fHolBal" type="number" step="1" value="${esc((m.funds.holiday||{}).balance ?? '')}"></div></label>
      <label class="field inline"><span>🍊 Widdle total owed</span><div class="amount-input"><span class="curr">£</span><input id="dWidTot" type="number" step="1" value="${esc((m.debts.widdle||{}).total ?? '')}"></div></label>
      <label class="field inline"><span>🏠 Novuna monthly</span><div class="amount-input"><span class="curr">£</span><input id="dNovMon" type="number" step="0.01" value="${esc((m.debts.novuna||{}).monthly ?? '')}"></div></label>
      <label class="field inline"><span>🏠 Novuna end date</span><input id="dNovEnd" type="date" value="${esc((m.debts.novuna||{}).endDate || '')}"></label>
      <button id="fSave" class="primary" style="width:100%">Save funds &amp; debts</button>
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

const VIEWS = { home: viewHome, log: viewLog, month: viewMonth, history: viewHistory, sorter: viewSorter, settings: viewSettings };

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
  const t = e.target.closest('[data-go], [data-cat], [data-period], [data-del], [data-sort-record], [data-widdle-pay], [data-novuna-date], #logSave, #setSave, #setResync, #bSave, #fSave, #dlBackup');
  if (!t) return;

  if (t.dataset.go) return go(t.dataset.go);

  if (t.dataset.cat) {                       // pick a category chip
    state.logDraft.category = t.dataset.cat;
    return render();
  }
  if (t.dataset.period) {                     // pay-period navigation
    state.period = isoDate(shiftPeriod(curPeriod(), Number(t.dataset.period), payDay()));
    return render();
  }
  if (t.dataset.del) return onDelete(t.dataset.del);
  if (t.hasAttribute('data-sort-record')) return onSortRecord();
  if (t.hasAttribute('data-widdle-pay')) return onWiddlePay();
  if (t.hasAttribute('data-novuna-date')) return onNovunaDate();
  if (t.id === 'logSave') return onLogSave();
  if (t.id === 'setSave') return onTokenSave();
  if (t.id === 'setResync') return onResync();
  if (t.id === 'bSave') return onBudgetSave();
  if (t.id === 'fSave') return onFundsSave();
  if (t.id === 'dlBackup') return onBackup();
}

// Keep the log draft in sync as the user types (so switching chips doesn't wipe input).
function onAppInput(e) {
  if (state.view === 'log') {
    const d = state.logDraft;
    if (e.target.id === 'logAmount') d.amount = e.target.value;
    if (e.target.id === 'logNote') d.note = e.target.value;
    if (e.target.id === 'logDate') d.date = e.target.value;
    return;
  }
  if (state.view === 'sorter') {
    const s = state.sorter || (state.sorter = { balance: '', card: '' });
    if (e.target.id === 'sortBalance') s.balance = e.target.value;
    if (e.target.id === 'sortCard') s.card = e.target.value;
    // Recompute just the result block so the inputs keep focus.
    const out = $('#sorterResult');
    if (out) out.innerHTML = renderSorterResult();
  }
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

// Sorter → record this month's split into the funds + card history.
async function onSortRecord() {
  const s = state.sorter || {};
  const r = sortMoney(s.balance, s.card);
  if (r.overspent) return toast('Nothing to record — overspent this month.', 'warn');
  const periodKey = isoDate(periodStart(today(), payDay()));
  const already = (store.data.meta.cardHistory || []).some(h => h.period === periodKey);
  if (already && !confirm('This period is already recorded. Record again (overwrites the card total and adds the fund top-ups again)?')) return;
  await save(store.recordSort({ chase: r.chase, holiday: r.holiday, card: r.card, periodKey }),
    `Recorded! Emergency +${money(r.chase)}, Holiday +${money(r.holiday)} 🎉`);
  go('home'); // show the trackers move
}

// Widdle → log a repayment (feeds the holiday fund).
async function onWiddlePay() {
  const raw = prompt('Widdle repayment amount (£):');
  if (raw == null) return;
  const amount = Math.round(Number(raw) * 100) / 100;
  if (!amount || amount <= 0) return toast('Enter an amount greater than £0.', 'warn');
  await save(store.addWiddlePayment({ date: isoDate(today()), amount }),
    `Widdle −${money(amount)} · Holiday +${money(amount)} 🏖️`);
  render();
}

// Novuna → set the loan end date.
async function onNovunaDate() {
  const raw = prompt('Novuna loan end date (YYYY-MM-DD):', (store.data.meta.debts.novuna || {}).endDate || '');
  if (raw == null) return;
  const v = raw.trim();
  if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return toast('Use the format YYYY-MM-DD.', 'warn');
  await save(store.setNovunaEndDate(v || null), v ? 'End date set — countdown on! ⏳' : 'End date cleared');
  render();
}

async function onFundsSave() {
  const num = id => { const v = $(id).value; return v === '' ? undefined : (Number(v) || 0); };
  const em = { balance: num('#fEmBal'), target: num('#fEmTgt'), monthly: num('#fEmMon') };
  const hol = { balance: num('#fHolBal') };
  store.data.meta.debts.widdle = store.data.meta.debts.widdle || {};
  store.data.meta.debts.novuna = store.data.meta.debts.novuna || {};
  const wt = num('#dWidTot'); if (wt !== undefined) store.data.meta.debts.widdle.total = wt;
  const nm = num('#dNovMon'); if (nm !== undefined) store.data.meta.debts.novuna.monthly = nm;
  const nd = $('#dNovEnd').value; store.data.meta.debts.novuna.endDate = nd || null;
  store.data.meta.funds.emergency = { ...(store.data.meta.funds.emergency || {}), ...clean(em) };
  store.data.meta.funds.holiday = { ...(store.data.meta.funds.holiday || {}), ...clean(hol) };
  await save(store.commit('Update funds & debts'), 'Funds & debts saved 💛');
  render();
}

// Drop undefined keys so blank inputs don't overwrite existing values with 0.
function clean(obj) {
  const out = {};
  for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
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
  const pay = Math.min(31, Math.max(1, Math.floor(Number($('#bPayDay').value) || 1)));
  const cats = store.data.meta.categories.map(c => {
    const inp = document.querySelector(`.bcat[data-key="${CSS.escape(c.key)}"]`);
    return { ...c, budget: inp ? (Number(inp.value) || 0) : c.budget };
  });
  store.data.meta.categories = cats;
  state.period = null; // snap the viewed period back to the current one under the new pay day
  await save(store.setBudgets({ weeklyBudget: weekly, monthlyIncome: income, payDay: pay }), 'Budgets saved 💛');
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
