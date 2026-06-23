# Sunnyside data guide 📓 — for editing `sunnyside.json` directly

All of Sunnyside lives in **`docs/data/sunnyside.json`**. The app reads and writes this
file, but you can also edit it by hand on github.com — handy for logging lots at once. 🌻

## Golden rules
- It's **JSON**: keep every `"key": value` quoted, comma-separated, inside `{ }` (objects)
  and `[ ]` (lists). A missing/extra comma will stop the app loading. Paste into a JSON
  checker (e.g. jsonlint.com) if unsure.
- **One place at a time:** after editing on GitHub, open the app → ⚙️ Settings →
  🔄 *Reload from GitHub* (or refresh) before editing in the app, so nothing overwrites.
- **IDs must be unique** and are lowercase, no spaces (e.g. `honey`, `sim_ab12cd`). They're
  how Sims link to each other — don't reuse one.

## The shape of the file
```jsonc
{
  "meta":   { "rotation": 5, ... },        // neighbourhood-wide info
  "families":   [ { "id":"hill", "name":"Hill", "emoji":"⛏️", "colour":"#b07d52", "soft":"#efdfce" } ],
  "households": [ { "id":"sunshine_cottage", "name":"Sunshine Cottage", "emoji":"🌻",
                    "location":"…", "features":"…", "movedIn":"2026-06-07" } ],
  "people": [ … Sims & ancestors … ],
  "pets":   [ … pets … ]
}
```

## A person (Sim)
Only `id` is truly required; fill in what you know, leave the rest as `""`, `[]`, or `null`.
```jsonc
{
  "id": "honey",                 // unique, lowercase
  "kind": "sim",                 // "sim" or "ancestor" (greyed-out origin node)
  "name": "Honey Rainbow",       // full name
  "display": "Honey",            // short name shown on the tree
  "emoji": "🍯",
  "family": "rainbow",           // must match a family id above (sets the colour/tab)
  "household": "sunshine_cottage", // a household id, or ""
  "generation": "Gen 2",
  "lifeStage": "Baby",           // Baby/Toddler/Child/Teen/Adult/Elder/Ghost
  "preMarriageName": "",
  "daysRemaining": null,

  "type": "Human",               // Human/Ghost/Alien/Vampire/Werewolf/PlantSim/Zombie/
                                 //   Witch (Good)/Witch (Neutral)/Witch (Evil)/Servo/Bigfoot
  "yellowBow": true,             // 🎀 badge (optional)
  "adopted": false,              // ❤️ adoption line to parents (optional)
  "heart": false,               // rainbow glow (Iris has this)
  "photo": null,                 // path like "photos/honey.png", or null

  "aspiration": "Popularity",    // Family/Knowledge/Fortune/Popularity/Pleasure/Grilled Cheese/Romance
  "secondaryAspiration": "",
  "lifetimeWant": "",
  "starSign": "Libra",           // any of the 12 zodiac names
  "personality": { "neat": 2, "outgoing": 7, "active": 4, "playful": 5, "nice": 7 }, // total 25
  "turnOn1": "", "turnOn2": "", "turnOff": "",
  "oth": "",                     // One True Hobby
  "bodyFrame": "Female",

  "career": { "track": "Artist", "level": 4, "levelName": "Comic Book Penciller",
              "top": "Visionary", "degree": "Fine Arts" },
  "skills": { "cooking": 2, "mechanical": 4, "charisma": 3, "body": 0,
              "logic": 1, "creativity": 5, "cleaning": 0 },

  "genetics": {
    "hairVisible": "Wavy golden blonde", "hairHidden": "None",   // hidden = recessive carried
    "eyesVisible": "Lilac", "eyesHidden": "None",
    "skin": "Light sunkissed", "freckles": "No",
    "notable": "", "fromMum": "", "fromDad": "", "notes": ""
  },

  "parents": ["kareem", "iris"],          // list of Sim ids — drives the tree & predictor
  "birthOrder": 3,                         // optional — sorts siblings (1 = eldest); leave out to keep data order
  "partners": [ { "id": "someone", "status": "Engaged", "bolts": 2,
                  "weddingRotation": 5, "weddingDay": 1 } ],  // wedding R/D optional — see Lifespan below
  "relationships": [ { "id": "marigold", "type": "Pet Best Friend", "bolts": null, "notes": "1/20!" } ],
  "moments": [ { "rotation": "R5", "event": "Born!", "notes": "Sunshine Cottage royalty" } ],
  "lockedWants": [], "fears": [],
  "car": "", "carNotes": ""
}
```
> For **ancestors** use `"kind": "ancestor"` and add `"oneLiner": "…"`; they only need
> name/emoji/family/genetics — they show as greyed-out origin nodes.

## A pet
```jsonc
{
  "id": "marigold", "name": "Marigold", "emoji": "🐱",
  "species": "Cat", "breed": "Ginger tabby",
  "ownerId": "iris", "household": "sunshine_cottage",
  "starSign": "Virgo", "collar": "Rainbow!!",
  "personality": ["Chaos gremlin with a soft heart"],
  "kibbled": true, "kibbledNote": "Five days younger",
  "petBestFriend": true, "petBestFriendNote": "1/20",
  "photo": null,
  "moments": [ { "event": "Slept through the kitchen fire", "notes": "Unbothered" } ]
}
```

## Quick recipes
- **Log a moment:** find the Sim, add one `{ "rotation": "R5", "event": "…", "notes": "…" }`
  object to their `"moments": [ … ]` list (mind the comma between items).
- **Add a baby:** copy the person template, give it a new `id`, set `parents`, `family`,
  `generation`, and any genetics. It appears on the tree automatically.
- **Bump the rotation:** change `meta.rotation`.

When in doubt, do it once in the app (it writes perfect JSON), then copy that pattern. 💛

---

## The newer sections

### 👶 Baby names (`babyNames`)
```jsonc
"babyNames": [
  { "family": "rainbow", "label": "Rainbow — Kareem + Iris",
    "girls": [ { "name": "Honey", "emoji": "🍯", "note": "", "used": false } ],
    "boys":  [ { "name": "Kofi",  "emoji": "🌿", "note": "heritage name", "used": false } ] }
]
```
First un-used name in each list is shown as **NEXT**. Tick `used` in the app or set it here.

### 🏘️ Community lots (`lots`)
```jsonc
"lots": [ { "name": "The Golden Anchor", "emoji": "🍺", "status": "Open", "notes": "Beach road!!" } ]
```
`status` keywords drive the icon: *open/ready* → ✅, *needs/revamp/rebuild* → 🔧, *becoming/progress* → 🔄, *not built* → ⬜.

### 🏅 Badges (on a person)
```jsonc
"badges": { "Flower Arranging": "Bronze", "Robotics": "Silver" }   // None/Bronze/Silver/Gold
```

### 🏆 Lifetime-want tracker (on a person)
```jsonc
"tracker": { "target": 20, "items": [ { "label": "Marigold", "id": "marigold", "done": true } ] }
```
The `lifetimeWant` text shows above the bar; progress = items marked `done` / `target`.

### 🔄 Rotation
- `meta.rotation` — the global rotation number.
- each household's `daysThisRotation` (0–3) — its play progress this rotation. When every
  household hits 3, the app rolls `meta.rotation` over and resets them to 0.

### 📜 Lifespan & life events (on a person)
These power the **📊 Stats** page and its **Timeline**. All optional.
```jsonc
"cas": true,            // made in Create-A-Sim, never a real resident (e.g. P.T. 83). Hidden from every stat.
"bornRotation": 3,      // the rotation they were born / arrived
"bornDay": 1,           // 1–4 within that rotation
"diedRotation": 7,      // the rotation they died (leave out if alive)
"diedDay": 2,
"causeOfDeath": "Old age",
"townElder": true       // ⭐ pin the genuinely-oldest Sim (only one at a time). Drives "Longest-lived".
```
- **Born vs arrived:** the Timeline shows 👶 *born* when a parent is a real played Sim, and
  ➡️ *arrived* otherwise — so founders (parents are CAS ancestors) read as *arrived*, and only
  in-town babies count as 👶 births in the stats.
- **Weddings:** put `weddingRotation` (and optional `weddingDay`) on a **partner** link (see
  the person template). It shows as 💒 on the Timeline. Fill it in on **one** partner only —
  the app dedupes the couple so it isn't listed twice.
- **`cas: true`** means CAS-only — kept out of population, births, lifespan and the timeline.
  Don't put it on founders (Søren etc.); they *are* residents, just give them `bornRotation`.
- **`townElder`** is for when everyone arrived at R1 and "Longest-lived" can't tell who's
  really oldest — tick it on the true elder. It does **not** affect "Longest in Sunnyside",
  which always counts rotations actually lived in town.

