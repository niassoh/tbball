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
# here: preview the static build as Pages serves it
VITE_STATIC=1 npm run build && cp dist/index.html dist/404.html
npx vite preview
```

Pushing `main` runs `.github/workflows/pages.yml`, which tests, checks out thinking-bball
with a read-only deploy key (secret `BACKEND_DEPLOY_KEY`), exports its data into `public/`
as above (not committed here: `.gitignore`; about half an hour, so a thinking-bball commit
already exported restores its export from the Actions cache instead, and an app-only deploy
takes a few minutes), builds and publishes to
https://data.thinkingbasketball.net/ (repo `niassoh/tbball`'s Pages custom domain; the DNS
is thinkingbasketball.net's, on SiteGround). Old niassoh.github.io/tbball/ links redirect there.
thinking-bball's nightly run dispatches it after committing new data (its
`docs/daily-pipeline-requirements.md`). `dist/404.html` is a copy of the app so deep links
(`/player/<slug>`) work on Pages.

## Layout

- `src/lib/` — pure logic ported from the design (percentile colors, chart geometry, shot-zone map) and season-span averages (`span.js`: minutes-weighted, shooting % attempts-weighted; used by the stat tables' drag-to-average and career rows); unit tested.
- `src/components/` — one component per design section.
- Stat definitions: `src/lib/glossary.js` maps each stat label to a one- or two-sentence definition. `Gloss.jsx` shows it at once on hover, focus or tap over the profile's percentile and recent-shift cards, the stat tables' column heads and chart titles, and the Leaderboard player card. The Leaderboard's column heads keep their native title, now read from the glossary (falling back to the sheet's `desc`).
- Routes: `/` player search (ALL-TIME: each player as his best 800+ minute season; a team's logo, its franchise's best players by their best season there, as many as 5% of its seasons, from the 31 season boards, with a player's other top-5% seasons as a collection, `src/lib/library.js`. CURRENT: active players, or a team's depth chart), `/player/:slug` profile, `/leaderboard` leaderboard, `/teams` team board (2026-27 from the team sheet: thinking-bball `lib/teamboard.js`, `api/teamboard/<season>.json`), `/careers` career trajectories (not linked from the site yet; reach it by URL). Every page's header row carries PLAYERS · LEADERBOARD · TEAMS (`components/SiteNav.jsx`, the page you're on in ink; under 1000px a box that opens them), after the logo at the same spot on every page: each header row is one height (`--head-h`, index.css); the home page's big search fills the rest of its row past a hairline.
- Tours (`src/components/Tour.jsx`): a TOUR button in the Footprint and Lonestar section headers and the Leaderboard's controls row walks through the feature, a cutout on one control or datapoint at a time with a callout card under it. Each step says what the part is in general, then shows it on a worked example. Steps are data (target selector, caption with its takeaway in `**…**`, an optional worked sum revealed a term at a time, the example, optional action); the profile tours' example tile or row is the player's own (`tourExample` in `lib/footprint.js` and `lib/lonestar.js`), and the Leaderboard's answers one question step by step, setting the board to the best 5-season runs of ScoreVal.
- `/careers` builds every career from the 30 season boards (`lib/careers.js`, once a session per season type, about 2 MB gzipped). Its state lives in the URL: `?p=slug,slug,slug&x=age|season|career&y=<stat>&scale=pctl&smooth=3` (defaults left out: career year across, BPM, raw, 1Y), plus `?playoffs`.

## Differences from the design reference

- The shift card ("Recent Shift") uses **the last 30 days of the season vs. the rest** (one league-wide window), not last 15 games; the subheader shows how many games that is for the player.
- The Career "Gravity" cell shows ORTG On / DRTG On per season (the data the handoff specifies); the design's rim-points copy and hard-coded historical peaks are not used.
- WOWY covers the latest season with the current team rather than career.
- Careers (not in the design reference): up to six players: the first is green, the rest quieter lilac, sand, teal, pink and brown (no greys), all kept clear of the site's blue (better), orange (worse) and the playoffs' gold. A colour names a player, not better/worse; better is shown by position only, and the league band is neutral grey. Its 3Y smoothing is centred (a season and those either side), unlike the profile's trailing ROLLING 3-YR, so peaks stay in their year. Ages come from birth dates only, so players without one (mostly pre-1996 careers and this season's rookies) are left out of the age view; careers already under way in 1996-97 have no year of career.
- Draft and jersey number are omitted from the bio line; stats without a data source (Matchup DFG% Diff, Pts / 100 Allowed) are hidden.
