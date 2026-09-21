# Iron Log

A minimal personal gym tracker. Black, white, a little pink, subtly glowing silver.
Static frontend (GitHub Pages) + optional Postgres sync (Vercel).

## Features

- **Week rail** — Mon–Sun, auto-selects today. Dots show progress per day (silver = partial, pink = complete).
- **Per-set ticks** — tap each circle, not just the exercise. Animated, haptic on mobile.
- **Rest timer** — starts automatically on a completed set: 105s on the big lifts, 50s on isolation.
- **Daily weight** — one number per day, starting at 62 kg, with a glowing sparkline and delta from your first entry.
- **Streak + session count**, completion ring, keyboard nav (`←` `→` days, `t` = today).
- Works offline; everything is kept in `localStorage` and exportable as JSON.

## Frontend — GitHub Pages

No build step. One manual step is required once, because the Actions token is not
allowed to create a Pages site (`Resource not accessible by integration`):

1. **Settings → Pages → Source: GitHub Actions**
2. **Actions → Deploy to GitHub Pages → Run workflow**

After that, `.github/workflows/pages.yml` redeploys the repo root on every push
to `main` or `claude/hopeful-babbage-k5j8xo`. The site lands at
`https://<user>.github.io/gym/`.

Locally: `python3 -m http.server 8080` and open `http://localhost:8080`
(it's ES modules, so it needs a server, not `file://`).

## Backend — optional cloud sync

Only needed if you want the same log on phone and laptop. Skip it and the app
still works fully, local-only.

1. Create a free Postgres database ([Neon](https://neon.tech) works well) and copy its connection string.
2. Deploy this repo to Vercel. Set env vars:
   - `DATABASE_URL` — the Postgres connection string
   - `SYNC_TOKEN` — any long random string, your password
   - `ALLOW_ORIGIN` *(optional)* — e.g. `https://arnavgandre.github.io`, defaults to `*`
3. Open the site, hit **Sync**, paste `https://<your-app>.vercel.app/api/data` and the token.

Stored in one row as JSONB (`schema.sql`); the table is created on first request.
Writes use last-write-wins on a timestamp, so the newest device wins.

## Editing the program

`data.js` — one object per weekday. `heavy: true` gives the 90–120s rest,
`cardio: true` skips the timer. Edit and push; nothing else to change.

## The plan

| Day | Focus |
|---|---|
| Mon | Push |
| Tue | Pull |
| Wed | Legs + Core |
| Thu | Push 2 |
| Fri | Pull 2 |
| Sat | Conditioning + Legs |
| Sun | Rest — walk or stretch |

Rest 90–120s on the big lifts, 45–60s on isolation. Warm up 5 minutes plus two light sets on your first exercise.
