# Flashtune

A music timeline guessing game in the spirit of NYT Flashback — but for songs and compositions instead of historical events. You're shown a song and a vertical timeline of songs you've already placed; drop the new one in the right slot. Score = number placed correctly out of 10.

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
pnpm preview          # preview the production build
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
  server/songs.ts        pickRound() — filters by genre, samples 10 per round with difficulty-aware year gaps
  types.ts               Genre, Difficulty, Song, Placement
src/routes/
  +page.svelte           landing page (difficulty + genre picker)
  play/+page.server.ts   load fn that picks the round for the chosen settings
  play/+page.svelte      vertical timeline, click/tap-to-place, drag-and-drop
```

## How a round works

1. Landing page lets you pick a difficulty (Easy / Medium / Hard) and any subset of the seven genres.
2. The server samples 11 songs that satisfy the year-gap rule for the chosen difficulty:
   - **Easy** — ≥10 years apart after 1950, ≥50 years apart before
   - **Medium** — ≥5 years after 1950, ≥25 before
   - **Hard** — anything goes
3. The first song is placed for free; you place the remaining 10 by clicking/tapping a gap or dragging the active card onto it.
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
pm2 start pnpm --name flashtune -- preview --host 0.0.0.0 --port 4173

# common ops
pm2 logs flashtune
pm2 restart flashtune
pm2 stop flashtune
pm2 save                 # persist process list
pm2 startup              # generate boot script so PM2 restarts on reboot
```

`pnpm preview` serves the production build via Vite's preview server. For a real Node deployment, swap `@sveltejs/adapter-auto` for `@sveltejs/adapter-node`, then `pm2 start build/index.js --name flashtune` after `pnpm build`.
