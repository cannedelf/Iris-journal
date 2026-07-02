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

// Clamp a day to the last valid day of that month (so payDay 31 works in February).
function clampDay(y, m, day) { return Math.min(day, new Date(y, m + 1, 0).getDate()); }

// The payday that starts the period `date` falls in.
export function periodStart(date, payDay) {
  const y = date.getFullYear(), m = date.getMonth();
  if (date.getDate() >= clampDay(y, m, payDay)) return new Date(y, m, clampDay(y, m, payDay));
  return new Date(y, m - 1, clampDay(y, m - 1, payDay)); // previous month's payday
}

// The last day of the period that begins at `start` (day before the next payday).
export function periodEnd(start, payDay) {
  const ny = start.getFullYear(), nm = start.getMonth() + 1;
  return addDays(new Date(ny, nm, clampDay(ny, nm, payDay)), -1);
}

export function samePeriod(a, b, payDay) {
  return isoDate(periodStart(a, payDay)) === isoDate(periodStart(b, payDay));
}

// Move `delta` whole periods from a period-start date.
export function shiftPeriod(start, delta, payDay) {
  const t = new Date(start.getFullYear(), start.getMonth() + delta, 1);
  return new Date(t.getFullYear(), t.getMonth(), clampDay(t.getFullYear(), t.getMonth(), payDay));
}

// Friendly range label, e.g. "25 Jun – 24 Jul 2026".
export function periodLabel(start, payDay) {
  const end = periodEnd(start, payDay);
  const s = `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]}`;
  const e = `${end.getDate()} ${MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  return `${s} – ${e}`;
}

// Which Monday-week of the current pay period `date` sits in (1-based).
export function weekOfPeriod(date, payDay) {
  const anchor = weekStart(periodStart(date, payDay));
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
  const periodFirstMonday = weekStart(periodStart(today, getPayDay(meta)));
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

// --- period rollups ---------------------------------------------------------
//
// For each category, total what was spent in the pay period containing `withinDate`
// and compare to budget. (payDay 1 = calendar month.)
export function periodBreakdown(data, withinDate) {
  const cats = data.meta.categories || [];
  const payDay = getPayDay(data.meta);
  const inPeriod = data.entries.filter(e => samePeriod(parseDate(e.date), withinDate, payDay));

  const rows = cats.map(c => {
    const spent = inPeriod
      .filter(e => e.category === c.key)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return {
      ...c,
      spent: Math.round(spent * 100) / 100,
      budget: c.budget || 0,
      pct: c.budget ? Math.min(100, (spent / c.budget) * 100) : 0,
      over: c.budget ? spent > c.budget : false
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
// left is swept out of the current account and split between the holiday fund and the
// Chase emergency fund, on a sliding scale that rewards a smaller card bill.

export const SORTER_TIERS = [
  { max: 450, name: 'QUEEN', emoji: '👑', holiday: 0.40, chase: 0.60, celebrate: true },
  { max: 550, name: 'Sensible Girlie', emoji: '💛', holiday: 0.30, chase: 0.70 },
  { max: 650, name: 'On Budget', emoji: '✅', holiday: 0.25, chase: 0.75 },
  { max: Infinity, name: 'Reined It In', emoji: '🫣', holiday: 0.20, chase: 0.80 }
];

export function sortMoney(balance, card) {
  const bal = Math.max(0, Number(balance) || 0);
  const cc = Math.max(0, Number(card) || 0);
  const remainder = Math.round((bal - cc) * 100) / 100;
  const tier = SORTER_TIERS.find(t => cc < t.max);
  const highCard = cc >= 650; // 23% interest bites hardest on a big balance

  if (remainder <= 0) {
    return { overspent: true, remainder, card: cc, tier, highCard };
  }
  const holiday = Math.round(remainder * tier.holiday * 100) / 100;
  const chase = Math.round((remainder - holiday) * 100) / 100; // exact remainder split
  return { overspent: false, remainder, card: cc, tier, highCard, holiday, chase };
}
