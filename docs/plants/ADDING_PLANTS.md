# 🌿➕ Adding a new plant to Pink to Leaf

All the plants live in one file: **`docs/plants/data/plants.json`**. To add a new baby,
add one object to the `"plants": [ … ]` list. You can do it straight on github.com (tap
the file → ✏️ edit → commit) — or Iris can do it via the GitHub API. The app reads this
file on load and writes back to it on save.

> **One golden rule:** after editing the JSON by hand, open the app → ⚙️ **More → 🔄
> Reload latest** before logging anything in the app, so your hand-edit isn't overwritten
> by an older copy cached in the browser.

It's **JSON**, so keep every `"key": value` quoted, comma-separated, inside `{ }`. A
missing or extra comma stops the app loading — paste into jsonlint.com if unsure.

---

## The shortest possible plant

Only `id`, `name` and `bumClub` are really needed. Everything else is optional and can be
filled in later (in the app or here).

```jsonc
{
  "id": "carole",
  "name": "Carole",
  "emoji": "🌿",
  "bumClub": "moist"
}
```

Add that object to the `plants` list (mind the comma between items) and Carole shows up
on the 🌿 Plants screen straight away.

---

## The full plant — every field explained

```jsonc
{
  "id": "carole",                       // unique, lowercase, no spaces. Never reuse one.
  "name": "Carole",                     // shown everywhere
  "emoji": "🎹",                        // the plant's avatar when there's no photo yet
  "musicianEmoji": "🎶",                // little tag next to the name (their vibe)
  "namedAfter": "Carole King",          // who she's named after
  "species": "Prayer plant (Maranta leuconeura)",
  "location": "Living room shelf (north facing)",
  "room": "living",                     // bedroom | living | kitchen | hallway — see the flat guide
  "pot": "12cm terracotta in a cream cover pot",

  "bumClub": "moist",                   // dry | moist | wet | water  (drives the colour + rule)

  "watering": {
    "text": "Let the top inch dry between waterings. Loves humidity.",
    "intervalDays": 6,                  // days between waterings — see the cheat-sheet below
    "lastWatered": null,                // leave null; the 💧 Water button fills this in
    "dailyCheck": false,                // set true for thirsty herbs (adds a daily-check reminder)
    "label": "Watered"                  // use "Water change" instead for water-propagation plants
  },

  "light": "Bright indirect light. No direct sun — the leaves scorch.",

  "feeding": {
    "text": "Diluted feed every 2 weeks, spring–autumn.",
    "firstFeed": "Early September",
    "lastFed": null,                    // the 🧴 Fed button fills this in
    "skip": false                       // set true for plants that don't need feeding (like Laura)
  },

  "misting": {
    "needed": true,                     // true → shows a 💦 Misted button + a misting reminder
    "text": "Mist most mornings; she loves humidity.",
    "lastMisted": null
  },

  // --- all optional extras below ---
  "humidity":   "Likes 50%+ — happiest near the other plants.",
  "temperature":"Keep above 15°C. Hates cold draughts.",
  "sap":        "",                     // handling warning — e.g. Tina's irritating sap. Adds a 🧤 row.
  "special":    "The prayer — leaves fold up at night! 🙏",   // highlighted pink card
  "notes":      "Named Day 20. Loves the humidity huddle.",   // plain note card

  "care": [                             // ⭐ special-care bullet points
    "Rainwater or filtered water — she sulks at tap water."
  ],

  "rootHistory": [],                    // only Etta uses this — a list of dated root notes

  "growth": [                           // 🌱 growth log — newest first
    { "date": "2026-08-15", "note": "Brought home!", "leaves": 6 }
  ],
  "gallery": []                         // photos — easiest to add in the app with 📷
}
```

Delete any optional line you don't want — an empty `""`, `[]` or leaving it out entirely
all work. The app fills in sensible blanks.

---

## Watering interval cheat-sheet

`intervalDays` is how many days between waterings — it's what drives the "needs water
today" reminders. Rough starting points (nudge to taste):

| Bum Club | Typical plant | `intervalDays` |
|----------|---------------|----------------|
| 🏜️ `dry`   | succulents, jade | 14–21 |
| 🧽 `moist` | pothos, croton, spider | 5–8 |
| 🧽 `moist` + `dailyCheck: true` | basil / thirsty herbs | 2 |
| 💧 `water` | water-prop cuttings (use `"label": "Water change"`) | 3 |

The reminder counts from `lastWatered`, so it only starts nudging once you've logged the
first watering (before that a plant just says "Log first watering").

---

## The Bum Clubs

`bumClub` must be one of these keys (they set the card colour and the care rule):

| key | club |
|-----|------|
| `dry`   | 🏜️ Dry Bum Club — let dry out completely |
| `moist` | 🧽 Moist Bum Club — moist, top dries, mist |
| `wet`   | 💦 Wet Bum Club — currently empty! |
| `water` | 💧 Water Baby — lives in water |

To invent a **new** club, add it to the `"bumClubs"` object at the top of the file:
```jsonc
"bumClubs": {
  "bog": { "label": "Bog Bum Club", "emoji": "🐸", "rule": "Never lets dry — stands in water" }
}
```
(New clubs won't have their own colour stripe unless a matching `--bog` colour is added to
the stylesheet — ping me and I'll add one.)

---

## While you're in there — other lists you can add to

- **`incoming`** — plants on the way: `{ "name": "Dolores", "emoji": "🐒", "musicianEmoji": "🎵", "note": "From Sam" }`
- **`dream`** — the wishlist: `{ "name": "Nanouk", "emoji": "💗", "note": "Pink!! For the bedroom" }`
- **`cruise.sitter`** — a plant-sitting line for a new plant so it shows in 🚢 Away mode:
  `{ "plant": "carole", "risk": "ok", "instruction": "Water before we leave." }`
  (`risk` is `easy` 💤, `ok`, or `hard` ⚠️.)
- **`fertiliser.rounds[].items`** — add the new plant to a feeding weekend:
  `{ "plant": "carole", "dose": "Diluted", "feed": true }`

---

## Removing or renaming

- **Rename:** change `name` (and `emoji`) — but **never** change `id`, it's the plant's
  identity and its photos are filed under it.
- **Remove:** delete the whole `{ … }` object from the `plants` list. (Its photos stay in
  `docs/plants/photos/` — harmless, delete them separately if you like.)

---

*A good plant mum doesn't hoard, she NURTURES — but the app will happily hold as many
babies as you grow. 🌿🤲💛*
