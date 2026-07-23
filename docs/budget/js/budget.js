// Pure budget maths — no DOM, no storage. Everything the dashboard and the monthly
// view need is derived here from the raw list of entries, so there's a single source
// of truth and nothing can drift out of sync.

// --- date helpers (all weeks start on Monday) -------------------------------

// Parse a "YYYY-MM-DD" string into a local Date at midnight (avoids timezone drift
// that `new Date("2026-06-25")` would introduce by treating it as UTC).
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The Monday (00:00) of the week containing `date`.
export function weekStart(date) {
  const x = new Date(date);
  const offset = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(date, n) {
  const x = new Date(date);
  x.setDate(x.getDate() + n);
  return x;
}

export function sameWeek(a, b) {
  return isoDate(weekStart(a)) === isoDate(weekStart(b));
}

export function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// Which Monday-week of the calendar month `date` sits in (1-based, friendly label).
export function weekOfMonth(date) {
  const ws = weekStart(date);
  // Anchor to the Monday-week the 1st of this month falls in.
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWeek = weekStart(first);
  const diffDays = Math.round((ws - firstWeek) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function monthLabel(date) { return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`; }
export function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }

// --- pay-period (budget cycle) ----------------------------------------------
//
// The budget runs from one payday to the day before the next (e.g. 25th → 24th),
// not the calendar month. `payDay` is the day of the month you're paid. A payDay of
// 1 makes a period identical to a calendar month, so all the calendar-month behaviour
// is just the special case payDay = 1.

export function getPayDay(meta) {
  const p = meta && Number(meta.payDay);
  return (p >= 1 && p <= 31) ? Math.floor(p) : 1;
}

// Everything the period maths needs: the pay day, whether to bring a weekend payday
// forward to the Friday before, and any manual per-month start-date overrides
// (keyed by the anchor month "YYYY-MM").
export function periodCfg(meta) {
  return {
    payDay: getPayDay(meta),
    weekendRule: meta && meta.payWeekendRule ? meta.payWeekendRule : 'before',
    overrides: (meta && meta.periodOverrides) || {}
  };
}

// Accept either a plain payDay number (back-compat) or a full cfg object.
function asCfg(x) {
  if (x && typeof x === 'object') return x;
  const p = Number(x);
  return { payDay: (p >= 1 && p <= 31) ? Math.floor(p) : 1, weekendRule: 'off', overrides: {} };
}

// Clamp a day to the last valid day of that month (so payDay 31 works in February).
function clampDay(y, m, day) { return Math.min(day, new Date(y, m + 1, 0).getDate()); }

// The pay-period boundary date anchored in (year, month): payday, adjusted for a
// manual override or (failing that) the weekend rule.
function boundaryFor(y, m, cfg) {
  const base = new Date(y, m, 1); y = base.getFullYear(); m = base.getMonth(); // normalise
  const key = `${y}-${String(m + 1).padStart(2, '0')}`;
  if (cfg.overrides && cfg.overrides[key]) return parseDate(cfg.overrides[key]);
  let d = new Date(y, m, clampDay(y, m, cfg.payDay));
  if (cfg.weekendRule === 'before') {
    const dow = d.getDay();
    if (dow === 6) d = addDays(d, -1);      // Saturday → Friday
    else if (dow === 0) d = addDays(d, -2); // Sunday → Friday
  }
  return d;
}

// The payday that starts the period `date` falls in.
export function periodStart(date, cfgOrPay) {
  const cfg = asCfg(cfgOrPay);
  const here = boundaryFor(date.getFullYear(), date.getMonth(), cfg);
  return date >= here ? here : boundaryFor(date.getFullYear(), date.getMonth() - 1, cfg);
}

// The last day of the period that begins at `start` (day before the next payday).
export function periodEnd(start, cfgOrPay) {
  return addDays(boundaryFor(start.getFullYear(), start.getMonth() + 1, asCfg(cfgOrPay)), -1);
}

export function samePeriod(a, b, cfgOrPay) {
  const cfg = asCfg(cfgOrPay);
  return isoDate(periodStart(a, cfg)) === isoDate(periodStart(b, cfg));
}

// Move `delta` whole periods from a period-start date.
export function shiftPeriod(start, delta, cfgOrPay) {
  return boundaryFor(start.getFullYear(), start.getMonth() + delta, asCfg(cfgOrPay));
}

// Friendly range label, e.g. "25 Jun – 24 Jul 2026".
export function periodLabel(start, cfgOrPay) {
  const end = periodEnd(start, asCfg(cfgOrPay));
  const s = `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]}`;
  const e = `${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  return `${s} – ${e}`;
}

// Which Monday-week of the current pay period `date` sits in (1-based).
export function weekOfPeriod(date, cfgOrPay) {
  const cfg = asCfg(cfgOrPay);
  const anchor = weekStart(periodStart(date, cfg));
  const diff = Math.round((weekStart(date) - anchor) / 86400000);
  return Math.floor(diff / 7) + 1;
}

export function money(n) {
  const v = Number(n) || 0;
  // Thousands separators, always 2dp, keep a leading minus outside the £.
  const s = Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? '-£' : '£') + s;
}

// --- the weekly £50 pot -----------------------------------------------------
//
// The spending-money category gets a fresh `weeklyBudget` every Monday. Overspend
// carries forward as debt (you feel the consequence next week); underspend does NOT
// roll over — use it or lose it. We compute a running balance across the Monday-weeks
// of the current pay period so debt accumulates within a cycle but resets each payday.

export function spendingKey(meta) {
  const weekly = (meta.categories || []).find(c => c.type === 'weekly');
  return weekly ? weekly.key : 'spending';
}

function spentInWeek(entries, key, monday) {
  const end = addDays(monday, 7);
  return entries
    .filter(e => e.category === key)
    .filter(e => { const d = parseDate(e.date); return d >= monday && d < end; })
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

// Returns { weekly, spentThisWeek, carriedDebt, remaining, status, monday }
// for the week containing `today`. `status` is one of 'good' | 'watch' | 'low' | 'over'.
export function weeklyStatus(data, today) {
  const meta = data.meta;
  const weekly = meta.weeklyBudget ?? 50;
  const key = spendingKey(meta);
  const thisMonday = weekStart(today);

  // Walk every Monday-week from the start of this pay period up to (not incl.) this week,
  // carrying only negative balances forward (debt resets each payday).
  const periodFirstMonday = weekStart(periodStart(today, periodCfg(meta)));
  let carry = 0;
  for (let m = new Date(periodFirstMonday); m < thisMonday; m = addDays(m, 7)) {
    const bal = weekly - spentInWeek(data.entries, key, m) + carry;
    carry = Math.min(0, bal); // surplus lost, debt kept
  }

  const spentThisWeek = spentInWeek(data.entries, key, thisMonday);
  const allowance = weekly + carry;            // this week's effective pot
  const remaining = allowance - spentThisWeek;

  let status = 'good';
  if (remaining < 5) status = 'over';
  else if (remaining < 15) status = 'low';
  else if (remaining < 25) status = 'watch';

  return { weekly, allowance, spentThisWeek, carriedDebt: carry, remaining, status, monday: thisMonday };
}

// A friendly sunshine face + line for the current weekly status.
export function sunshine(status, remaining) {
  switch (status) {
    case 'good': return { face: '🌻', mood: 'happy', line: "You're golden, sunshine!" };
    case 'watch': return { face: '😎', mood: 'happy', line: 'Cruising along nicely.' };
    case 'low': return { face: '😅', mood: 'watch', line: 'Getting close — go gently this week.' };
    case 'over':
      return remaining < 0
        ? { face: '🫶', mood: 'support', line: "Over a touch, but it's okay. Fresh £50 on Monday." }
        : { face: '🥺', mood: 'support', line: 'Nearly out — maybe let the next treat wait for Monday.' };
    default: return { face: '🌻', mood: 'happy', line: '' };
  }
}

// --- rollover budget --------------------------------------------------------
//
// Flexible categories carry HALF of each period's unused budget into the next period,
// capped at 50% of the base budget. Overspend is forgiven (the next period simply resets
// to the base budget — never a negative). Fixed and savings categories don't roll, and
// the buffer is always computed from base budgets, so rollover is a pure bonus on top.

export function rollsOver(cat) {
  return (cat.type === 'flex' || cat.type === 'weekly') && (cat.budget || 0) > 0;
}

function spentInPeriod(entries, key, pStart, cfg) {
  const startISO = isoDate(pStart);
  return entries
    .filter(e => e.category === key && isoDate(periodStart(parseDate(e.date), cfg)) === startISO)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

// The first pay period rollover applies from: the period of the earliest logged entry.
// (Periods before Liv started tracking must not manufacture phantom rollover.)
export function rolloverAnchor(data, cfg) {
  if (!data.entries.length) return null;
  let min = data.entries[0].date;
  for (const e of data.entries) if (e.date < min) min = e.date;
  return periodStart(parseDate(min), cfg);
}

// Rollover carried INTO the period starting at `pStart` for one category — the running
// balance from the anchor period forward. Only positive leftovers roll; the carry is
// capped at 50% of the base budget each period.
export function rolloverInto(data, cat, pStart, cfg, anchor) {
  if (!rollsOver(cat) || !anchor || pStart <= anchor) return 0;
  const base = cat.budget || 0;
  const cap = base * 0.5;
  let rollIn = 0;
  let p = new Date(anchor);
  const target = isoDate(pStart);
  for (let guard = 0; guard < 600 && isoDate(p) !== target; guard++) {
    const unused = Math.max(0, (base + rollIn) - spentInPeriod(data.entries, cat.key, p, cfg));
    rollIn = Math.min(cap, Math.round((unused / 2) * 100) / 100);
    p = shiftPeriod(p, 1, cfg);
  }
  return rollIn;
}

// --- period rollups ---------------------------------------------------------
//
// For each category, total what was spent in the pay period containing `withinDate`
// and compare to budget. (payDay 1 = calendar month.)
export function periodBreakdown(data, withinDate) {
  const cats = data.meta.categories || [];
  const cfg = periodCfg(data.meta);
  const pStart = periodStart(withinDate, cfg);
  const inPeriod = data.entries.filter(e => samePeriod(parseDate(e.date), withinDate, cfg));

  const rollEnabled = !!data.meta.rolloverEnabled;
  const anchor = rollEnabled ? rolloverAnchor(data, cfg) : null;

  const rows = cats.map(c => {
    const spent = inPeriod
      .filter(e => e.category === c.key)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const rollover = anchor ? rolloverInto(data, c, pStart, cfg, anchor) : 0;
    const base = c.budget || 0;
    const effective = Math.round((base + rollover) * 100) / 100;
    return {
      ...c,
      spent: Math.round(spent * 100) / 100,
      budget: base,
      rollover,
      effectiveBudget: effective,
      pct: effective ? Math.min(100, (spent / effective) * 100) : 0,
      over: effective ? spent > effective : false
    };
  });

  const loggedOut = rows
    .filter(r => r.type !== 'fixed' && r.type !== 'savings')
    .reduce((s, r) => s + r.spent, 0);
  // Savings can be several lines (e.g. Chase + ISA). Automatic transfers (standing order,
  // direct debit) always land, so they count at their full budget; manual pots count what's
  // actually been put in. Target is the sum of all savings budgets.
  const savingsRows = rows.filter(r => r.type === 'savings');
  const savings = savingsRows.reduce((s, r) => s + (r.auto ? r.budget : r.spent), 0);
  const savingsTarget = savingsRows.reduce((s, r) => s + (r.budget || 0), 0);
  const fixed = rows.filter(r => r.type === 'fixed').reduce((s, r) => s + r.budget, 0);

  // Planned buffer (the untouched safety net): everything left after income minus every
  // budgeted pound (fixed + subs + all flexible incl. savings). Auto-updates with budgets.
  const income = data.meta.monthlyIncome || 0;
  const allBudgets = cats.reduce((s, c) => s + (c.budget || 0), 0);
  const plannedBuffer = Math.round((income - allBudgets) * 100) / 100;

  return {
    rows,
    loggedOut: Math.round(loggedOut * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savingsTarget: Math.round(savingsTarget * 100) / 100,
    savingsAnnual: Math.round(savingsTarget * 12 * 100) / 100,
    savingsHit: savingsTarget > 0 && savings >= savingsTarget - 0.005,
    fixed: Math.round(fixed * 100) / 100,
    income,
    incomeItems: data.meta.incomeItems || [],
    plannedBuffer,
    totalOut: Math.round((loggedOut + savings + fixed) * 100) / 100
  };
}

// --- end-of-month money sorter ----------------------------------------------
//
// Given the current-account balance and the credit-card balance to clear, work out
// where every remaining pound should go. The card is ALWAYS paid in full; whatever is
// left (the TRUE LEFTOVER = balance − card) is swept out of the current account and
// split between the holiday fund and the Chase emergency fund. The tier is set by how
// much is genuinely left, not by how much was spent — a big-but-fine month (lots on the
// card, but still plenty left over) is rewarded, not punished.

// Tiers keyed by the leftover amount; `min` is the inclusive lower bound.
// `holiday`/`chase` are the normal split. `boostHoliday`/`boostChase` are the split used
// once the Emergency fund has a month of bills behind it (see sorterBoost) — they send
// more to the Golden Drawer so holidays grow quicker.
// ⚠️ PLACEHOLDER boosted splits (+20 points to holiday) — swap for Iris's exact numbers.
export const SORTER_TIERS = [
  { min: 700, name: 'QUEEN', emoji: '👑', holiday: 0.40, chase: 0.60, boostHoliday: 0.60, boostChase: 0.40, celebrate: true },
  { min: 500, name: 'Sensible Girlie', emoji: '💛', holiday: 0.30, chase: 0.70, boostHoliday: 0.50, boostChase: 0.50 },
  { min: 300, name: 'On Budget', emoji: '✅', holiday: 0.25, chase: 0.75, boostHoliday: 0.45, boostChase: 0.55 },
  { min: 0, name: 'Reined It In', emoji: '🫣', holiday: 0.20, chase: 0.80, boostHoliday: 0.40, boostChase: 0.60 }
];

export function sortMoney(balance, card, boosted = false) {
  const bal = Math.max(0, Number(balance) || 0);
  const cc = Math.max(0, Number(card) || 0);
  const remainder = Math.round((bal - cc) * 100) / 100; // the true leftover
  const highCard = cc >= 650; // 23% interest bites hardest on a big balance

  if (remainder <= 0) {
    return { overspent: true, remainder, card: cc, tier: null, highCard, boosted };
  }
  const tier = SORTER_TIERS.find(t => remainder >= t.min); // tier from the leftover
  const holidayPct = boosted ? tier.boostHoliday : tier.holiday;
  const chasePct = boosted ? tier.boostChase : tier.chase;
  const holiday = Math.round(remainder * holidayPct * 100) / 100;
  const chase = Math.round((remainder - holiday) * 100) / 100; // exact remainder split
  return { overspent: false, remainder, card: cc, tier, highCard, boosted, holidayPct, chasePct, holiday, chase };
}

// --- goal & debt trackers ---------------------------------------------------

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, date.getDate());
}

// Emergency/holiday fund progress. Emergency has a target & monthly top-up (for an ETA);
// the holiday fund has neither — it just grows.
export function fundProgress(fund, today) {
  const balance = Number(fund.balance) || 0;
  const target = Number(fund.target) || 0;
  const monthly = Number(fund.monthly) || 0;
  const remaining = Math.max(0, target - balance);
  const pct = target ? Math.min(100, (balance / target) * 100) : 0;
  const monthsToGo = (monthly > 0 && remaining > 0) ? Math.ceil(remaining / monthly) : 0;
  const eta = monthsToGo ? monthLabel(addMonths(today, monthsToGo)) : null;
  return { balance, target, monthly, remaining, pct, monthsToGo, eta, hit: target > 0 && balance >= target };
}

// Widdle debt: total minus the sum of logged repayments. Months-to-go uses the most
// recent payment as the running rate.
export function widdleStatus(d) {
  const payments = (d.payments || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const total = Number(d.total) || 0;
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  const pct = total ? Math.min(100, (paid / total) * 100) : 0;
  const rate = payments.length ? (Number(payments[payments.length - 1].amount) || 0) : 0;
  const monthsToGo = (rate > 0 && remaining > 0) ? Math.ceil(remaining / rate) : 0;
  return { total, paid: Math.round(paid * 100) / 100, remaining, pct, monthsToGo, payments };
}

// Novuna loan countdown. Returns endDate:null when Liv hasn't set it yet.
export function novunaStatus(d, today) {
  const monthly = Number(d.monthly) || 0;
  if (!d.endDate) return { monthly, endDate: null, monthsToGo: null, done: false };
  const end = parseDate(d.endDate);
  const monthsToGo = Math.max(0, (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth()));
  return { monthly, endDate: end, monthsToGo, done: end <= today };
}

// Credit-card month-on-month trend from recorded period totals.
export function cardTrend(history) {
  const list = (history || []).slice().sort((a, b) => a.period.localeCompare(b.period));
  const latest = list[list.length - 1] || null;
  const prev = list[list.length - 2] || null;
  const delta = (latest && prev) ? Math.round((latest.amount - prev.amount) * 100) / 100 : null;
  return { list, latest, prev, delta, improved: delta != null && delta < 0 };
}

// --- Golden Drawer holiday queue --------------------------------------------
//
// The drawer balance cascades down the trip queue: it fills the top (active) trip first,
// then overflow rolls to the next, and so on. A trip that reaches its target is "ready to
// book". At the chosen monthly savings rate we estimate when each will be funded and
// whether that beats its fund-by date. Booked trips move to the funded[] trophy wall.
export function holidayQueue(fund, today) {
  const rate = Number(fund.monthlyRate) || 0;
  let rem = Number(fund.balance) || 0;
  let cumulativeMonths = 0;

  const trips = (fund.trips || []).map((t, i) => {
    const target = Number(t.target) || 0;
    const current = Math.round(Math.min(rem, target) * 100) / 100;
    rem = Math.max(0, Math.round((rem - target) * 100) / 100);
    const pct = target ? Math.min(100, (current / target) * 100) : 0;
    const full = target > 0 && current >= target;
    const need = Math.max(0, Math.round((target - current) * 100) / 100);

    // ETA: months from now to fully fund THIS trip (after the ones above it are funded).
    let eta = null;
    if (rate > 0) {
      cumulativeMonths += Math.ceil(need / rate);
      if (!full) eta = addMonths(today, cumulativeMonths);
    }
    let onTrack = null;
    if (t.fundBy) {
      const by = parseDate(t.fundBy);
      onTrack = full ? true : (eta ? eta <= by : null);
    }
    return { ...t, target, current, need, pct, full, eta, onTrack, index: i };
  });

  const activeIndex = trips.findIndex(t => !t.full);
  return {
    trips,
    funded: (fund.funded || []).slice(),
    rate,
    active: activeIndex >= 0 ? trips[activeIndex] : null,
    activeIndex,
    overflow: rem // money beyond every queued target
  };
}

export function fundByLabel(iso) {
  if (!iso) return '';
  const d = parseDate(iso);
  return monthLabel(d).replace(/^(\w+) /, (m, mon) => mon.slice(0, 3) + ' ');
}
