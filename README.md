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

## Layout

- `src/lib/` — pure logic ported from the design (percentile colors, chart geometry, shot-zone map) and season-span averages (`span.js`: minutes-weighted, shooting % attempts-weighted; used by the stat tables' drag-to-average and career rows); unit tested.
- `src/components/` — one component per design section.
- Routes: `/` player search, `/player/:slug` profile.

## Differences from the design reference

- The shift card ("Recent Shift") uses **the last 30 days of the season vs. the rest** (one league-wide window), not last 15 games; the subheader shows how many games that is for the player.
- The Career "Gravity" cell shows ORTG On / DRTG On per season (the data the handoff specifies); the design's rim-points copy and hard-coded historical peaks are not used.
- WOWY covers the latest season with the current team rather than career.
- Draft and jersey number are omitted from the bio line; stats without a data source (Matchup DFG% Diff, Pts / 100 Allowed) are hidden.
