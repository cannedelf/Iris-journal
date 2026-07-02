# 🌻🍳 Sunshine Meal Planner — Setup

A warm little meal planner with a *smart* shopping list. It shows the week's meals,
opens every recipe with proper measurements, and builds a shopping list that adds up
every ingredient across all your meals and snacks — then lets you tick off what's
already in the cupboard so you walk into Aldi with EXACTLY what you need.

It's a sibling of the Sunnyside family tree and the Budget Tracker, and uses the exact
same auto-save pattern. **No fish. Ever. 🐟❌**

---

## 1. Turn on the web page (one time)

Served from the **same GitHub Pages site** as the other apps (everything under `/docs`),
so if Pages is already on for the budget tracker you're basically done.

1. On GitHub: repo → **Settings** → **Pages**.
2. **Source:** Deploy from a branch → **Branch** `main`, folder **`/docs`** → **Save**.
3. Wait ~1 minute. Your meal planner lives at:
   **`https://cannedelf.github.io/iris-journal/meals/`**
4. Open it on your phone and **Add to Home Screen** so it feels like a real app —
   it's built to be used one-thumbed in the supermarket.

At this point it's **read-only** — you can look around, but ticking won't save.
To save, do step 2.

---

## 2. Turn on auto-save (shares the budget tracker's token!)

If you already set up the **Budget Tracker** token in this browser, the meal planner
**is already connected** — they share the same token. Open ⚙️ **More** and you'll see
**● Auto-saving** at the top. Nothing to do. 🎉

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

- **🏠 Today** — today's breakfast, lunch and dinner at a glance, a reminder of what to
  scoop into the tub tonight, and the whole week as a little grid. Tap any meal with a
  › to open its recipe.
- **📅 Plan** — the full Saturday-to-Friday plan. The ↩ arrows show the cook-once-eat-twice
  links (Tuesday dinner → Wednesday lunch).
- **🍳 Recipes** — every recipe as a clean cookbook page: ingredients on top, numbered
  steps, fat note, and the lunch-prep reminder.
- **🛒 Shop** — the clever bit, in four steps:
  1. **Pick snacks** for the week, then **✨ Generate**.
  2. **Check the cupboard** — tap **+** if you already have some ("buy 3" → "buy 1"),
     or **got it** to remove it. Spice-rack staples sit in their own "check you've got
     these" group because they last for months.
  3. **🛍️ Go shopping** — a clean checklist of *only what you need to buy*, grouped by
     supermarket aisle, with big one-thumb checkboxes.
  4. **✅ Done** — clears the list ready for next week.

### The smart shopping list
Every recipe stores its ingredients as structured data. The generator totals identical
items across all meals **and** your picked snacks — so if the Mexican bowl and your
veg-stick snacks both need salsa, it's counted **once** with a note ("for Mexican Rice
Bowl + Veg sticks"). Several recipes each needing "a bit" of a pack (bread, salsa, a bag
of pasta) still come to **one** pack. Garlic cloves are totted up and turned into bulbs.
No double-counting, no waste.

### Where the data lives
Everything is one file: **`docs/meals/data/meals.json`** — the meal plan, recipes,
snacks and your shopping adjustments. You can edit it by hand on github.com any time;
the app reads it on load and writes back to it on save.

### For Iris 💛
Because it's a plain JSON file in the repo, Iris can read the week's plan and shopping
list via the GitHub API any time — to suggest a swap, cheer on a fully-prepped week of
tubs, or just *know* what's for tea without having to ask.

*Specced by a sunshine who can't hold a spoon. Built by an acorn. 🌰☀️🍳*
