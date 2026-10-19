# Thinking Basketball — Player Profile

React (Vite) implementation of `design_handoff_player_profile/Player Profile v3.dc.html`
from the thinking-bball repo. All data comes from that repo's API:

- `GET /api/profiles` — player index (search page)
- `GET /api/profile/:slug` — one player's profile document
- `GET /api/teams` — every team with nickname and depth chart, for the team switcher (header
  logo / depth-chart team name) and team results in the top-bar search, which open the
  player in the viewed player's depth slot on the picked team (`src/lib/depth.js`)
- `/assets/players/webp/<slug>-<size>.webp?v=<headshotVersion>` — generated portraits (the
  version comes with each player from the API and changes when a portrait is replaced)
- `/assets/players/nba/<slug>-<size>.webp?v=<headshotVersion>` — for players without a
  portrait, NBA.com's headshot styled toward the portraits; the API's `headshot` says which
  (`'portrait'`, `'nba'` or `null`)

Players with neither show their initials over a muted team-color disc with a faint
team logo (`public/logos/<ABBR>.png`, ESPN's white primary logos at 184px; colors in
`src/lib/teams.js`). Defunct franchises have no logo and get a plain disc.

## Run

```sh
npm install
VITE_API_BASE=http://localhost:8080 npm run dev   # thinking-bball: PORT=8080 node index.js
npm test                                            # vitest: src/lib
npm run build
```

`VITE_API_BASE` defaults to `http://localhost:8080`.

## Deploy (GitHub Pages, static)

The public site has no server: thinking-bball's `npm run export:static` writes the API's
documents as files into `public/` (`api/profile/<slug>.json`, `api/profiles.json`,
`api/teams.json`, `api/distribution/<stat key>.json`, `api/lineups-league.json`, and the
100/400px headshots under `assets/players/`). A build with `VITE_STATIC=1` reads those
instead of the API, under the base path `VITE_BASE`.

```sh
# in thinking-bball, after a data pull
npm run export:static -- --out ../thinking-bball-profile/public
# here: preview the static build at its Pages path
VITE_STATIC=1 VITE_BASE=/tbball/ npm run build && cp dist/index.html dist/404.html
npx vite preview --base /tbball/
```

Pushing `main` runs `.github/workflows/pages.yml`, which tests, builds and publishes to
https://niassoh.github.io/tbball/ (repo `niassoh/tbball`). `dist/404.html` is a copy of the app so
deep links (`/player/<slug>`) work on Pages. The daily-refresh plan is in thinking-bball
`docs/daily-pipeline-requirements.md`.

## Layout

- `src/lib/` — pure logic ported from the design (percentile colors, chart geometry, shot-zone map) and season-span averages (`span.js`: minutes-weighted, shooting % attempts-weighted; used by the stat tables' drag-to-average and career rows); unit tested.
- `src/components/` — one component per design section.
- Routes: `/` player search, `/player/:slug` profile, `/leaderboard` leaderboard, `/careers` career trajectories (not linked from the site yet; reach it by URL).
- `/careers` builds every career from the 30 season boards (`lib/careers.js`, once a session per season type, about 2 MB gzipped). Its state lives in the URL: `?p=slug,slug,slug&x=age|season|career&y=<stat>&scale=pctl&smooth=3` (defaults left out: career year across, BPM, raw, 1Y), plus `?playoffs`.

## Differences from the design reference

- The shift card ("Recent Shift") uses **the last 30 days of the season vs. the rest** (one league-wide window), not last 15 games; the subheader shows how many games that is for the player.
- The Career "Gravity" cell shows ORTG On / DRTG On per season (the data the handoff specifies); the design's rim-points copy and hard-coded historical peaks are not used.
- WOWY covers the latest season with the current team rather than career.
- Careers (not in the design reference): up to six players: the first is green, the rest quieter lilac, sand, teal, pink and brown (no greys), all kept clear of the site's blue (better), orange (worse) and the playoffs' gold. A colour names a player, not better/worse; better is shown by position only, and the league band is neutral grey. Its 3Y smoothing is centred (a season and those either side), unlike the profile's trailing ROLLING 3-YR, so peaks stay in their year. Ages come from birth dates only, so players without one (mostly pre-1996 careers and this season's rookies) are left out of the age view; careers already under way in 1996-97 have no year of career.
- Draft and jersey number are omitted from the bio line; stats without a data source (Matchup DFG% Diff, Pts / 100 Allowed) are hidden.
