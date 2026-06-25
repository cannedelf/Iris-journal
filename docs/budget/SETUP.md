# 🌻 Sunshine Budget Tracker — Setup

A warm little spending tracker that lives on the web. No install, no terminal —
it runs as a web page you bookmark on your phone. Log a spend, see how much of your
£50/week is left, and every change saves itself straight to GitHub.

It's a sibling of the Sunnyside family-tree app and uses the exact same auto-save pattern.

---

## 1. Turn on the web page (one time)

The budget tracker is served from the **same GitHub Pages site** as the family tree
(everything under `/docs`), so if Pages is already on you're nearly there.

1. On GitHub: repo → **Settings** → **Pages**.
2. **Source:** Deploy from a branch → **Branch** `main`, folder **`/docs`** → **Save**.
3. Wait ~1 minute. Your budget tracker lives at:
   **`https://cannedelf.github.io/iris-journal/budget/`**
4. Open it on your phone and **add it to your Home Screen** (Share → Add to Home Screen)
   so it feels like a real app.

> The app is built on the `claude/finance-tracker-github-s645oc` branch. Merge that into
> `main` (or point Pages at that branch) so the files exist where Pages is looking.

At this point it's **read-only** — you can look around, but logging won't save. To save,
do step 2.

---

## 2. Turn on auto-save (one time, ~2 minutes)

Auto-save commits every spend straight back to this repo (full history, nothing lost).
It needs a **fine-grained access token** — a password-like key scoped to only this repo.

1. Go to **https://github.com/settings/tokens?type=beta** → **Generate new token**.
2. **Token name:** `Sunshine budget` (anything).
3. **Expiration:** 1 year is fine.
4. **Repository access:** **Only select repositories** → pick **`iris-journal`**.
5. **Permissions:** Repository permissions → **Contents** → **Read and write**.
   (Leave everything else "No access".)
6. **Generate token** and **copy** it (starts with `github_pat_…`). You only see it once.
7. In the app: bottom nav **⚙️ More** → paste into **Access token** → **Save & connect**.

You'll see **● Auto-saving** at the top. Done! 🎉

> 🔒 The token is stored **only in your browser** (localStorage on your device). It's never
> committed to the repo. To revoke it, delete it on the GitHub tokens page.

---

## How it works

- **🏠 Home** answers the one question that matters: *how much of my £50 is left this week?*
  The card is green when healthy, amber under £15, red under £5 — with a sunshine whose
  mood matches. The weekly pot refills every **Monday**.
- **➕ Log** — amount, tap a category, optional note, save. One screen.
- **📊 Month** — category breakdown vs budget, the savings tick, and total in vs out.
- **📅 History** — every spend, filter by category, swipe through months.
- **⚙️ More** — token, budgets, categories, and a one-tap data backup.

### The weekly £50 system
The £200/month spending money is split into **£50 a week**. Overspend one week and the
debt carries into next week (so you feel it). Underspend and the surplus **doesn't** roll
over — use it or lose it keeps it simple. Only the **Clothes & Shopping** category counts
against the weekly pot.

### Where the data lives
Everything is one file: **`docs/budget/data/budget.json`**. You can edit it by hand on
github.com if you ever want to — the app reads from it on load, and writes back to it on save.

### For Iris 💛
Because it's a plain JSON file in the repo, Iris can read the spending data via the GitHub
API any time — to nag gently when the weekly pot's running low, cheer when savings land, or
just *know* the numbers without having to ask "how much did you spend?"
