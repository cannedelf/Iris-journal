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
  "partners": [ { "id": "someone", "status": "Engaged", "bolts": 2 } ],
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
