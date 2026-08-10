# 🌿💗 Pink to Leaf — Setup

A gentle plant-care tracker for the Crobat's growing plant family. Every baby tracked,
every mum supported — watering, feeding, misting, health and growth, all in one pocket.
Named **Pink to Leaf** because *rosa al raggio al foglia* — pink to ray to leaf. 🤙💗🌞🌿

It's a sibling of the Sunnyside family tree, the Budget Tracker and the Meal Planner,
and uses the exact same auto-save pattern — so it **shares their token**.

---

## 1. Turn on the web page (one time)

Served from the **same GitHub Pages site** as the other apps (everything under `/docs`),
so if Pages is already on for one of them you're basically done.

1. On GitHub: repo → **Settings** → **Pages**.
2. **Source:** Deploy from a branch → **Branch** `main`, folder **`/docs`** → **Save**.
3. Wait ~1 minute. Your plant tracker lives at:
   **`https://cannedelf.github.io/iris-journal/plants/`**
4. Open it on your phone and **Add to Home Screen** so it feels like a real app —
   it's built to be tapped one-thumbed while you're stood at the windowsill.

At this point it's **read-only** — you can look around, but logging won't save.
To save, do step 2.

---

## 2. Turn on auto-save (shares the other apps' token!)

If you already set up a token for the **Budget Tracker** or **Meal Planner** in this
browser, Pink to Leaf **is already connected** — they share the same token. Open ⚙️
**More** and you'll see **● Auto-saving** at the top. Nothing to do. 🎉

If not, set one up (takes ~2 minutes):

1. Go to **https://github.com/settings/tokens?type=beta** → **Generate new token**.
2. **Token name:** `Sunshine apps` (anything).
3. **Expiration:** 1 year is fine.
4. **Repository access:** **Only select repositories** → pick **`iris-journal`**.
5. **Permissions:** Repository permissions → **Contents** → **Read and write**.
6. **Generate token** and **copy** it (starts with `github_pat_…`). You only see it once.
7. In the app: ⚙️ **More** → paste into **Access token** → **Save & connect**.

> 🔒 The token is stored **only in your browser** (localStorage). It's never committed
> to the repo. To revoke it, delete it on the GitHub tokens page.

---

## How to use it

- **🌿 Plants** — every plant baby as a card, colour-coded by 🍑 Bum Club (the left
  stripe), with what it needs today. The **☀️ Good morning, Stevie** card keeps your
  daily-hello streak. Tap any plant for its full page.
- **A plant's page** — tap **💧 Water** the moment you water (it records today's date),
  **🧴 Fed** and **💦 Misted** the same way. Below that: watering, light, feeding,
  misting, temperature and handling notes, special-care flags, and — for Etta — her
  root-surgery history. The **🌱 Growth log** is the special bit (see below).
- **☀️ Today** — everything the babies need right now: waterings that are due, Laura's
  daily moisture check, misting nudges, and the morning hello. When nothing's urgent it
  tells you so. 🌿
- **🧴 Feeding** — the September fertiliser schedule (Weekend 1 and Weekend 3), who gets
  what dose, and who to skip — plus a quick "log a feed" list.
- **🚢 Away** — cruise mode. Hand this screen to whoever's plant-sitting (Widdle?? 🍊):
  simplified instructions per plant, ⚠️ for the needy ones (Laura, Tina, Etta) and 💤 for
  the ones to leave be (Stevie).
- **⚙️ More** — the token, the 🍑 Bum Club rules, incoming & dream plants, a room-by-room
  guide to the flat, and a one-tap data backup.

### The Growth log 🌱
The Crobat spotted Brandi's new leaves by comparing **photos** — so the app makes that
easy. On any plant, add a growth entry with a **note**, a **🍃 leaf count**, or a
**📷 photo** (resized in your browser so the repo stays lean). Photos also collect into a
little album on the plant's page, newest as the cover. Every entry is dated, so you can
scroll back and watch a fighter like Janis come back from a stump.

### Where the data lives
Everything is one file: **`docs/plants/data/plants.json`** — the plants, their care, the
bum clubs, the fertiliser schedule and the cruise plan. Photos live in
`docs/plants/photos/`. You can edit the JSON by hand on github.com any time; the app reads
it on load and writes back on save. After a hand-edit, open ⚙️ **More → 🔄 Reload latest**
before logging in the app so nothing overwrites.

### Adding new plants 🌿➕
New babies are added by editing `docs/plants/data/plants.json` — on github.com or by Iris.
There's a full step-by-step in **[ADDING_PLANTS.md](ADDING_PLANTS.md)**: the shortest
possible plant is just an `id`, `name` and `bumClub`, and everything else fills in from
there.

### For Iris 💛
Because it's a plain JSON file in the repo, Iris can read the whole plant family via the
GitHub API any time — to remind the Crobat that Laura needs a bottom-water, cheer on a new
leaf, check whether Etta's still green before surgery night, or add a new plant using the
guide above.

*Specced by Miss Iris Golden Rainbow. Built by an acorn. From 0 plants in July to a whole
family in August. 🤙💗🌞🌿🌻💛*
