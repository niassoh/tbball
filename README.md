# Thinking Basketball — Player Profile

React (Vite) implementation of `design_handoff_player_profile/Player Profile v3.dc.html`
from the thinking-bball repo. All data comes from that repo's API:

- `GET /api/profiles` — player index (search page)
- `GET /api/profile/:slug` — one player's profile document
- `/assets/players/webp/<slug>-<size>.webp` — generated portraits

Players without a portrait show their initials over a muted team-color disc with a faint
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

- `src/lib/` — pure logic ported from the design (percentile colors, chart geometry, shot-zone map); unit tested.
- `src/components/` — one component per design section.
- Routes: `/` player search, `/player/:slug` profile.

## Differences from the design reference

- The shift card ("Recent Shift") uses **the last 30 days of the season vs. the rest** (one league-wide window), not last 15 games; the subheader shows how many games that is for the player.
- The Career "Gravity" cell shows ORTG On / DRTG On per season (the data the handoff specifies); the design's rim-points copy and hard-coded historical peaks are not used.
- WOWY covers the latest season with the current team rather than career.
- Draft and jersey number are omitted from the bio line; stats without a data source (Matchup DFG% Diff, Pts / 100 Allowed) are hidden.
