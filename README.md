# Flashtune

A music timeline guessing game in the spirit of NYT Flashback — but for songs and compositions instead of historical events. You're shown a song and a vertical timeline of songs you've already placed; drop the new one in the right slot. Score = number placed correctly out of the round length you choose.

The library spans Henry Purcell through Taylor Swift across seven genres: classical (3× weighted), jazz, blues, rock, pop, hip-hop, and country.

## Stack

- **SvelteKit 2** with Svelte 5 (runes mode)
- **Vite+** (the VoidZero `vp` toolchain — Vite + Vitest + Oxlint + Oxfmt + Rolldown)
- **TypeScript 7 native preview** (`@typescript/native-preview`, the Go port — type-checks via `tsgo`)
- Static JSON dataset embedded at build time, with thumbnails sourced from Wikipedia

## Scripts

```sh
pnpm install              # install deps
pnpm dev              # start dev server on http://localhost:5173
pnpm build            # production build
pnpm preview          # preview the production build locally via Vite
pnpm start            # run the adapter-node server from ./build
pnpm check            # type-check with tsgo (no svelte-check; TS 7 ships only the CLI)
pnpm seed:songs       # re-fetch Wikipedia thumbnails into src/lib/data/songs.json
```

## Project layout

```
scripts/
  seeds.json             curated list of songs (title, artist, year, genre, wikipediaTitle)
  fetch-images.mjs       resolves each seed to a Wikipedia thumbnail and writes songs.json
  .cache.json            local cache of resolved Wikipedia lookups
src/lib/
  data/songs.json        generated dataset consumed by the server load fn
  server/songs.ts        pickRound() — filters by genre, samples variable-length rounds with difficulty-aware year gaps
  types.ts               Genre, Difficulty, Song, Placement
src/routes/
  +page.svelte           landing page (difficulty + genre + round length picker)
  play/+page.server.ts   load fn that picks the round for the chosen settings
  play/+page.svelte      vertical timeline, click/tap-to-place, drag-and-drop
```

## How a round works

1. Landing page lets you pick a difficulty (Easy / Medium / Hard), a round length (10 / 15 / 20 / 25 placements), and any subset of the seven genres.
2. The server samples enough songs to cover the chosen round length plus the initial seed song, while satisfying the year-gap rule for the chosen difficulty:
   - **Easy** — ≥10 years apart after 1950, ≥50 years apart before
   - **Medium** — ≥5 years after 1950, ≥25 before
   - **Hard** — anything goes
3. The first song is placed for free; you place the remaining songs by clicking/tapping a gap or dragging the active card onto it.
4. Score = number of placements that landed in a chronologically valid slot.

## Refreshing the song dataset

`pnpm seed:songs` walks `scripts/seeds.json` and resolves each entry to a Wikipedia thumbnail via the REST summary API, falling back through several search strategies (article title → song search → artist portrait). Results are cached in `scripts/.cache.json` — delete entries there to force a re-fetch.

## Running with PM2

For a long-running deployment, build and serve with [PM2](https://pm2.keymetrics.io/).

```sh
pnpm add -g pm2
pnpm install
pnpm build

# start
HOST=0.0.0.0 PORT=4173 pm2 start build/index.js --name flashtune

# common ops
pm2 logs flashtune
pm2 restart flashtune
pm2 stop flashtune
pm2 save                 # persist process list
pm2 startup              # generate boot script so PM2 restarts on reboot
```

`pnpm preview` is still useful for local smoke tests, but it starts Vite's preview server and may try to write temporary files under `node_modules/.vite-temp`. If PM2 runs as a different user, that can fail with `EACCES`. For deployment, run the adapter-node build directly.

PM2 stores environment variables with the process definition. If `HOST` or `PORT` changes after the app already exists in PM2, restart with updated env or recreate the process:

```sh
HOST=0.0.0.0 PORT=4173 pm2 restart flashtune --update-env
# or
pm2 delete flashtune
HOST=0.0.0.0 PORT=4173 pm2 start build/index.js --name flashtune
```

If `PORT` is missing, the adapter-node server falls back to `3000`.
