# Sunnyside Family Tree — Setup 🌻

A warm, clickable family tree and encyclopedia for the Sunnyside Sims 2 neighbourhood.
No install, no terminal — it runs as a web page you bookmark.

---

## 1. Turn on the web page (one time)

1. On GitHub, go to this repo → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Set **Branch** to `main` and the folder to **`/docs`**, then **Save**.
4. Wait ~1 minute. GitHub shows a link like:
   **`https://cannedelf.github.io/iris-journal/`**
5. Open it and **bookmark it**. That's your app! It works on your laptop, iPad or phone.

> The app is built on the `claude/epic-volta-9dk8e0` branch. Merge that branch into `main`
> first (or point Pages at that branch) so the files exist where Pages is looking.

At this point the tree is **read-only** — you can click around everyone, but edits won't save.
To save edits, do step 2.

---

## 2. Turn on auto-save (one time, ~2 minutes)

Auto-save lets every edit and photo commit itself straight back to this repo (full history,
nothing lost). It needs a **fine-grained access token** — a password-like key scoped to only
this one repo.

1. Go to **https://github.com/settings/tokens?type=beta** (GitHub → your profile photo →
   Settings → Developer settings → **Fine-grained tokens** → **Generate new token**).
2. **Token name:** `Sunnyside app` (anything you like).
3. **Expiration:** 1 year is fine.
4. **Repository access:** choose **Only select repositories** → pick **`iris-journal`**.
5. **Permissions:** expand **Repository permissions**, find **Contents**, set it to
   **Read and write**. (Leave everything else as "No access".)
6. Click **Generate token** and **copy** the token (starts with `github_pat_…`).
   You won't be able to see it again, so copy it now.
7. In the app, click **⚙️ (Settings)** → paste the token into **Access token** →
   **Save & connect**.

You'll see **● Auto-saving to GitHub** in the top corner. Done! 🎉

> 🔒 The token is stored **only in your browser** (localStorage on your device). It is never
> committed to the repo. If you ever want to revoke it, delete it on the GitHub tokens page.

---

## How saving works

- Every time you **Save** a profile, the app:
  1. Writes your change to a local cache in the browser immediately (so it's never lost), and
  2. Commits the updated `docs/data/sunnyside.json` to the repo (if a token is set).
- Photos you upload are committed to `docs/photos/`.
- Because everything is a normal file in git, you get **automatic backups and full history**.

### Your own backup copy 💾

Even with all that, you can keep a personal copy on your computer. In **⚙️ Settings**:

- **💾 Download data backup (.json)** — saves the whole neighbourhood as a single
  `sunnyside-backup-YYYY-MM-DD.json`. Instant, works even read-only.
- **🗂️ Download full backup with photos (.zip)** — a complete keepsake: the data file
  plus every photo, zipped together.

Tuck these somewhere safe now and then for total peace of mind.

---

## Tips

- Press **`/`** anywhere to search for a Sim.
- Use the **family tabs** to jump between the Hill, Frisbee, Rainbow, Okafor and Vance trees.
- Click a married-in spouse's chip to jump to **their** family tree and see their ancestors —
  that's how the hidden genetics stay traceable across families.
- **🏠 Households** toggles to a household-grouped view.
- Drag to pan, scroll to zoom, **⤢** to fit the tree to the screen.

---

## Editing the data directly (optional)

The whole neighbourhood lives in **`docs/data/sunnyside.json`**. You can edit it by hand on
github.com if you ever want to — the app reads from it on load.
