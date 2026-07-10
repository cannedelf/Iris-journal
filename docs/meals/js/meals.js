// Pure meal-planner logic — no DOM, no storage. The smart shopping list lives here:
// it collects ingredients across the week's meals AND the picked snacks, merges
// identical items (so salsa needed for the Mexican bowl AND veg-stick snacks is counted
// once, with a note), groups by supermarket section, and subtracts what's already in.

// --- supermarket sections, in walk-the-aisles order -------------------------
export const SECTIONS = [
  { key: 'tins',    emoji: '🥫', label: 'Tins' },
  { key: 'dry',     emoji: '🌾', label: 'Dry & Pasta' },
  { key: 'fresh',   emoji: '🥬', label: 'Fresh Veg' },
  { key: 'fruit',   emoji: '🍎', label: 'Fruit' },
  { key: 'chilled', emoji: '🥚', label: 'Chilled' },
  { key: 'frozen',  emoji: '🧊', label: 'Frozen' },
  { key: 'bakery',  emoji: '🍞', label: 'Bakery' },
  { key: 'sauces',  emoji: '🫙', label: 'Sauces & Jars' },
  { key: 'spices',  emoji: '🌶️', label: 'Spice Rack' }
];
const SECTION_ORDER = Object.fromEntries(SECTIONS.map((s, i) => [s.key, i]));
export function sectionMeta(key) { return SECTIONS.find(s => s.key === key) || { key, emoji: '🛒', label: key }; }

// --- date helpers -----------------------------------------------------------
export const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export const DAY_LABEL = {
  saturday: 'Saturday', sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday',
  wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday'
};
// JS getDay(): 0=Sun … 6=Sat. Map to our plan keys.
const JS_DAY_TO_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export function dayKey(date) { return JS_DAY_TO_KEY[date.getDay()]; }
export function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- item keys + quantity formatting ----------------------------------------
export function itemKey(name) { return String(name).toLowerCase().trim().replace(/\s+/g, '_'); }

// Units sold as a whole package — fractional needs round UP to whole packs, and several
// recipes each needing "a bit" still come to one pack (that's the no-waste magic).
const PKG_UNITS = new Set(['bag', 'jar', 'bottle', 'loaf', 'pack', 'bunch', 'box', 'punnet', 'can', 'pot', 'jar']);
// Vague spice-rack amounts — never shown as a number to buy.
const VAGUE_UNITS = new Set(['tsp', 'tbsp', 'pinch']);

function pluralUnit(unit, n) {
  if (!unit || VAGUE_UNITS.has(unit)) return '';
  const irregular = { box: 'boxes', bunch: 'bunches', punnet: 'punnets', loaf: 'loaves', 'sweet potato': 'sweet potatoes' };
  if (n === 1) return unit;
  return irregular[unit] || (unit.endsWith('s') ? unit : unit + 's');
}

// Turn a merged line into a friendly "3 tins" / "1 bag" / "1 garlic bulb (≈9 cloves)".
export function formatQty(line) {
  // Garlic: convert a pile of cloves into bulbs — Iris's favourite smart rule.
  if (line.key === 'garlic' && line.unit === 'clove') {
    const bulbs = Math.max(1, Math.ceil(line.amount / 10));
    return `${bulbs} bulb${bulbs > 1 ? 's' : ''} (≈${line.amount} cloves)`;
  }
  if (VAGUE_UNITS.has(line.unit)) return 'check you have some';
  const n = PKG_UNITS.has(line.unit) ? Math.max(1, Math.ceil(line.amount)) : roundCount(line.amount);
  const u = pluralUnit(line.unit, n);
  return u ? `${n} ${u}` : `${n}`;
}

function roundCount(n) {
  // Whole-ish counts (eggs, tins, limes): round to nearest, never below 1 if needed.
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? r : Math.ceil(r);
}

// --- the generator ----------------------------------------------------------
//
// Walk every recipe scheduled this week + every picked snack, accumulating each
// ingredient into a single line keyed by item name. Returns sections ready to render,
// plus a separate "cupboard" group for spice-rack staples that last for months.
export function buildShoppingList(data) {
  const lines = new Map(); // key -> { key, name, unit, amount, section, check, sources:Set, notes:Set }

  function add(ing, sourceLabel) {
    if (!ing || !ing.item) return;
    if (!ing.amount) {                      // amount 0 = "already on the list elsewhere"
      const existingKey = itemKey(ing.item);
      const ex = lines.get(existingKey);
      if (ex) ex.sources.add(sourceLabel); // still note this meal needs it
      return;
    }
    const key = itemKey(ing.item);
    let line = lines.get(key);
    if (!line) {
      line = { key, name: ing.item, unit: ing.unit || '', amount: 0,
        section: ing.section || 'fresh', check: true, sources: new Set(), notes: new Set() };
      lines.set(key, line);
    }
    line.amount += Number(ing.amount) || 0;
    line.sources.add(sourceLabel);
    if (ing.note) line.notes.add(ing.note);
    line.check = line.check && !!ing.check; // cupboard only if EVERY recipe treats it as a staple
  }

  // 1) recipes scheduled this week (every recipe in the file is part of the plan)
  const scheduled = scheduledRecipeIds(data);
  for (const r of data.recipes) {
    if (!scheduled.has(r.id)) continue;
    for (const ing of (r.ingredients || [])) add(ing, r.name);
  }

  // 2) picked snacks
  const avail = Object.fromEntries((data.snacks.available || []).map(s => [s.id, s]));
  for (const id of (data.snacks.selected || [])) {
    const snack = avail[id];
    if (!snack) continue;
    for (const ing of (snack.shoppingItems || [])) add(ing, `${snack.name} (snack)`);
  }

  // 3) pantry flag from data forces an item to "check cupboard"
  const pantry = data.pantry || {};
  for (const line of lines.values()) {
    if (pantry[line.name.toLowerCase()]) line.check = true;
  }

  // 4) split into buy-list (by section) and cupboard staples
  const have = data.shopping.have || {};
  const got = data.shopping.got || {};
  const checkedMap = data.shopping.checked || {};

  const buy = [];
  const cupboard = [];
  for (const line of lines.values()) {
    const out = {
      ...line,
      sources: [...line.sources],
      notes: [...line.notes],
      qtyText: formatQty(line),
      have: have[line.key] || 0,
      got: !!got[line.key],
      checked: !!checkedMap[line.key]
    };
    if (line.check) cupboard.push(out); else buy.push(out);
  }

  // group buy items by section
  const bySection = {};
  for (const item of buy) (bySection[item.section] ||= []).push(item);
  const sections = Object.keys(bySection)
    .sort((a, b) => (SECTION_ORDER[a] ?? 99) - (SECTION_ORDER[b] ?? 99))
    .map(key => ({
      ...sectionMeta(key),
      items: bySection[key].sort((a, b) => a.name.localeCompare(b.name))
    }));

  cupboard.sort((a, b) => a.name.localeCompare(b.name));

  // counts for the summary line (a "to buy" item is one you haven't fully got/ticked)
  const toBuy = buy.filter(i => !i.got && !i.checked);
  return { sections, cupboard, totalToBuy: toBuy.length, totalItems: buy.length };
}

// Which recipe ids are actually scheduled this week (direct dinners/breakfasts/lunches,
// plus the parent recipe behind any leftover/derived slot).
export function scheduledRecipeIds(data) {
  const ids = new Set();
  for (const day of Object.values(data.mealPlan)) {
    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      const id = day[slot];
      if (!id) continue;
      if (data.recipes.some(r => r.id === id)) ids.add(id);
      const der = data.derived[id];
      if (der && der.of) ids.add(der.of);
    }
  }
  return ids;
}

// What goes in the tub tonight, for the dashboard prompt.
export function tubTonight(data, date) {
  const k = dayKey(date);
  return data.tubSchedule[k] || null;
}

// A cheerful sunshine line for finishing a shop or prepping all the tubs.
export function sunshineLine(kind) {
  const lines = {
    shopDone: ['Shop done, sunshine!! Walk home proud 🌻', 'Exactly what you needed, nothing you didn\'t 💛', 'Aldi conquered. No waste. You legend 🛒☀️'],
    allPicked: ['Whole week planned!! Look at you go 🌻', 'No more 6pm "what\'s for tea" 💛'],
    tub: ['Tub prepped — tomorrow-you says thanks 💛', 'Cook once, eat twice. The system works 🌻']
  };
  const arr = lines[kind] || [''];
  // Deterministic pick (no Math.random needed) — vary by day length so it isn't static.
  return arr[(new Date().getDate()) % arr.length];
}
