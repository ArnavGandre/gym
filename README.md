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

Live at **https://arnavgandre.github.io/gym/**, deployed by
`.github/workflows/pages.yml` on every push to `main` or
`claude/hopeful-babbage-k5j8xo`.

If a fresh clone of this repo ever shows `Get Pages site failed` in that
workflow, Pages is not enabled on that repo yet: **Settings → Pages → Source:
GitHub Actions**, then re-run the workflow. The Actions token cannot enable it
for you — that API needs repo-admin rights.

Locally: `python3 -m http.server 8080` and open `http://localhost:8080`
(it's ES modules, so it needs a server, not `file://`).

## Backend — optional cloud sync

Only needed if you want the same log on phone and laptop. Skip it and the app
still works fully, local-only.

### Phone-only route (no laptop)

`.github/workflows/deploy-api.yml` runs the Vercel CLI in CI, so nothing has to
be installed anywhere.

1. Create a Postgres database at [neon.tech](https://neon.tech) and copy the
   connection string. The table creates itself on first request.
2. Create a Vercel token at [vercel.com/account/tokens](https://vercel.com/account/tokens).
3. In **Settings → Secrets and variables → Actions**, add:

   | Secret | Value |
   |---|---|
   | `VERCEL_TOKEN` | the Vercel token |
   | `DATABASE_URL` | the Neon connection string |
   | `SYNC_TOKEN` | any long random string — your password |
   | `ALLOW_ORIGIN` | `https://arnavgandre.github.io` |

4. **Actions → Deploy API to Vercel → Run workflow.** The run summary prints
   the endpoint URL.
5. In the app, tap **Sync**, paste that URL and the `SYNC_TOKEN`.

The workflow creates the Vercel project on its first run and redeploys whenever
`api/`, `package.json` or `vercel.json` changes.

### Or straight from vercel.com

Import the repo at [vercel.com/new](https://vercel.com/new) and set
`DATABASE_URL`, `SYNC_TOKEN` and `ALLOW_ORIGIN` in the project's env vars.

Data is stored in one row as JSONB (`schema.sql`). Writes use last-write-wins on
a timestamp, so the newest device wins.

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
