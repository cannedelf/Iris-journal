// Pink to Leaf — domain helpers. Pure functions over store.data: no DOM here.
// Bum-club colours, watering-due maths, the day's reminders, and a few sunshine lines.

// ---------- dates ----------
export function isoDate(d) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function daysBetween(aISO, bISO) {
  const a = parseISO(aISO), b = parseISO(bISO);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}
export function prettyDate(s) {
  const d = parseISO(s);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
export function agoText(sinceISO, todayISO) {
  const n = daysBetween(sinceISO, todayISO);
  if (n == null) return 'not yet';
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}

// ---------- bum clubs ----------
export function bumMeta(store, key) {
  const clubs = (store.data && store.data.bumClubs) || {};
  return clubs[key] || { label: key, emoji: '🌿', rule: '' };
}
// A colour role per bum club — drives the card accent + status pill.
export const BUM_TONE = { dry: 'dry', moist: 'moist', wet: 'wet', water: 'water' };

// ---------- watering status ----------
// Returns { state, label, days } where state is
//   'never'  — no last-watered logged yet
//   'due'    — due today or overdue
//   'soon'   — due tomorrow
//   'ok'     — plenty of time left
export function wateringStatus(plant, todayISO) {
  const w = plant.watering || {};
  const verb = w.label || 'Watered';
  if (!w.lastWatered) return { state: 'never', label: `${verb === 'Water change' ? 'Water change' : 'Watering'} not logged yet`, days: null, verb };
  const since = daysBetween(w.lastWatered, todayISO);
  const interval = w.intervalDays || 7;
  const left = interval - since;
  if (left <= 0) {
    const over = -left;
    return { state: 'due', days: left,
      label: over === 0 ? `${verb === 'Water change' ? 'Change water' : 'Water'} today` : `${over} day${over === 1 ? '' : 's'} overdue`, verb };
  }
  if (left === 1) return { state: 'soon', days: left, label: 'Due tomorrow', verb };
  return { state: 'ok', days: left, label: `In ${left} days`, verb };
}

// A short "what does this plant need today" line for the home cards.
export function nextAction(plant, todayISO) {
  const w = wateringStatus(plant, todayISO);
  const verb = (plant.watering && plant.watering.label) === 'Water change' ? '💧 Change water' : '💧 Water';
  if (w.state === 'never') return { emoji: '💧', text: 'Log first watering', urgent: false };
  if (w.state === 'due') return { emoji: '💧', text: w.days === 0 ? `${verb.replace('💧 ', '')} today` : w.label, urgent: true };
  if (w.state === 'soon') return { emoji: '💧', text: 'Water tomorrow', urgent: false };
  return { emoji: '✅', text: `Happy — ${w.label.toLowerCase()}`, urgent: false };
}

// ---------- the day's reminders ----------
// Builds the flat list shown on the Today screen.
export function todaysReminders(store, todayISO) {
  const out = [];
  const plants = store.data.plants || [];

  // Good morning Stevie (daily streak)
  const stevie = plants.find(p => p.morningGreeting);
  if (stevie) {
    const streak = (store.data.meta && store.data.meta.morningStreak) || {};
    const doneToday = streak.lastDate === todayISO;
    out.push({
      kind: 'morning', plantId: stevie.id, done: doneToday,
      emoji: '☀️', title: `Good morning, ${stevie.name}`,
      sub: doneToday ? `Said today — ${streak.count || 1} day streak 🌿` : 'Tap to keep the streak going',
    });
  }

  // Watering / water changes due or overdue
  for (const p of plants) {
    const w = wateringStatus(p, todayISO);
    if (w.state === 'due') {
      out.push({
        kind: 'water', plantId: p.id, emoji: p.emoji,
        title: `${p.name} — ${w.verb === 'Water change' ? 'change the water' : 'needs water'}`,
        sub: w.days === 0 ? bumMeta(store, p.bumClub).rule : w.label,
        urgent: true,
      });
    }
  }

  // Laura's daily moisture check (basil dries fast)
  const daily = plants.find(p => p.watering && p.watering.dailyCheck);
  if (daily) {
    out.push({
      kind: 'check', plantId: daily.id, emoji: '🌿',
      title: `Check ${daily.name}'s moisture`,
      sub: 'Basil dries faster than pothos — check daily. Bottom-water if the top feels dry.',
    });
  }

  // Misting reminder for anyone who needs it (Tina especially, when the dehumidifier's been on)
  for (const p of plants) {
    if (p.misting && p.misting.needed) {
      const since = p.misting.lastMisted ? agoText(p.misting.lastMisted, todayISO) : 'not logged';
      out.push({
        kind: 'mist', plantId: p.id, emoji: '💦',
        title: `Mist ${p.name}`,
        sub: p.id === 'tina' ? 'Especially if the dehumidifier has been running. Last misted: ' + since
          : 'Mist for humidity. Last misted: ' + since,
        soft: true,
      });
    }
  }

  return out;
}

// The September fertiliser rounds, with plant names resolved for display.
export function fertiliserView(store) {
  const fert = store.data.fertiliser || { rounds: [] };
  const byId = Object.fromEntries((store.data.plants || []).map(p => [p.id, p]));
  return {
    note: fert.note || '',
    rounds: (fert.rounds || []).map(r => ({
      label: r.label,
      items: (r.items || []).map(it => {
        const p = byId[it.plant] || { name: it.plant, emoji: '🌿' };
        return { name: p.name, emoji: p.emoji, dose: it.dose, feed: it.feed };
      })
    }))
  };
}

// ---------- sunshine lines ----------
const LINES = {
  allWatered: ['Every baby watered. Look at you go, plant mum. 🌿💛', 'All bums sorted. The garden is happy. 🍑🌿'],
  streak: ['Stevie heard you. 🌿☀️', 'Another morning, another hello. 💛'],
  logged: ['Logged. Nothing forgotten. 🌱', 'Written down so we can look back. 📸'],
};
export function sunshineLine(key) {
  const arr = LINES[key] || ['🌿'];
  // Deterministic pick (no Math.random needed) — rotate by day-of-month.
  return arr[new Date().getDate() % arr.length];
}
