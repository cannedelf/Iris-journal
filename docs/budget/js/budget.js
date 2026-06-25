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
export function monthLabel(date) { return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`; }
export function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }

export function money(n) {
  const v = Number(n) || 0;
  return '£' + v.toFixed(2);
}

// --- the weekly £50 pot -----------------------------------------------------
//
// The spending-money category gets a fresh `weeklyBudget` every Monday. Overspend
// carries forward as debt (you feel the consequence next week); underspend does NOT
// roll over — use it or lose it. We compute a running balance across the Monday-weeks
// of the current calendar month so debt accumulates but surplus is dropped each week.

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

  // Walk every Monday-week from the start of this calendar month up to (not incl.) this week,
  // carrying only negative balances forward.
  const monthFirstMonday = weekStart(new Date(today.getFullYear(), today.getMonth(), 1));
  let carry = 0;
  for (let m = new Date(monthFirstMonday); m < thisMonday; m = addDays(m, 7)) {
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

// --- monthly rollups --------------------------------------------------------
//
// For each category, total what was spent in the given month and compare to budget.
export function monthlyBreakdown(data, monthDate) {
  const cats = data.meta.categories || [];
  const inMonth = data.entries.filter(e => sameMonth(parseDate(e.date), monthDate));

  const rows = cats.map(c => {
    const spent = inMonth
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
  const savings = rows.filter(r => r.type === 'savings').reduce((s, r) => s + r.spent, 0);
  const fixed = rows.filter(r => r.type === 'fixed').reduce((s, r) => s + r.budget, 0);
  const savingsTarget = (rows.find(r => r.type === 'savings') || {}).budget || 0;

  return {
    rows,
    loggedOut: Math.round(loggedOut * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savingsTarget,
    savingsHit: savingsTarget > 0 && savings >= savingsTarget,
    fixed,
    income: data.meta.monthlyIncome || 0,
    totalOut: Math.round((loggedOut + savings + fixed) * 100) / 100
  };
}
