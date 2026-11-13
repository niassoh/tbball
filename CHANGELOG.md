# Changelog

What's on the test site (https://niassoh.github.io/tbball-test/) and not on prod yet sits under "On test". When something ships, its line moves under a "Shipped" heading with the ship date, newest first, below "On test". One line per thing to check, written to paste into Slack as is.

## On test

- Teams: new UNITS view (TEAMS | UNITS switch). Every team's best 2- to 5-man units, sortable by net, ORTG, DRTG and the four factors, with a MIN filter
- Units: net is now ORTG minus DRTG, matching pbpstats and Lonestar
- Leaderboard: on a laptop, controls fit on one line with a smaller chart
- Leaderboard card: footprint badges now show on small samples, marked SMALL SAMPLE. A quiet "none notable" line when there's nothing to show
- Profile: games and minutes for the season in the bio header (GP · MIN)
- Profile Footprint tab: small-sample swings light up too, marked SMALL SAMPLE
- Ben's new stats sheet (DEV): every regular season 2000-01 to 2026-27 now comes from it, with 22 new stats (matchup defense, steal types, assisted shares, ORTG/DRTG off and on/off, off-ball and movement scoring, rim assisted %), each with a definition. FTA is now per 75. Touches per drive is gone (hidden in Ben's sheet)
- Leaderboard: opens filtered to the top 50% by minutes (one playoff season stays at 75%)
- Salaries: Leaderboard chart can plot Salary or Salary % Cap (Player group in the axis picker, chart only). Profile header hover shows the season's salary next to the draft pick
- Data: past seasons (2000-01 to 2025-26) re-pulled to include low-minute players; on/off and AuPM re-pulled; 2013-14 BPM and rTS% filled in

## Shipped 2026-11-09

- Leaderboard chart: multi-season runs plot every player at his peak, all dots shown. Hover a player to see his other seasons as a trail
- Leaderboard chart: hovering is much faster, about 6 ms a hover instead of 40
