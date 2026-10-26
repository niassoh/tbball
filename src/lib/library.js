// The player index's ALL-TIME peaks: each player's best season, and a franchise's best
// seasons, by a stat, from the season boards (the Leaderboard's documents, one per season).
import { MIN_FLOOR } from './seasons.js'

// Codes a franchise played under before (teams.js PAST_TEAM_COLORS): the 1988-2002 Hornets'
// history is Charlotte's, the New Orleans and Oklahoma City Hornets' the Pelicans'.
const FRANCHISE = { SEA: 'OKC', NJN: 'BKN', CHH: 'CHA', NOH: 'NOP', NOK: 'NOP', VAN: 'MEM' }
export const franchiseOf = team => FRANCHISE[team] || team

// The stats ALL-TIME can rank peaks by, in the Leaderboard's groups: those on every board
// with a value for every qualified season (but Danny Schayes's 1997-98, a row the play-by-
// play stats never had). Team ratings (the same for every teammate) are left out, as are
// the stats a season or an era lacks (AuPM, OBPM, ScoreVal, tracking, lineups).
export const PEAKS = [
  ['Impact', ['BPM', 'Net On', 'Net On/Off']],
  ['Creation', ['Load', 'Box Creation', 'Passer Rating', 'cTOV%']],
  ['Offense', ['Pts / 75', 'rTS%', 'ORTG On']],
  ['Rim', ['Rim FGA', 'Rim FG%', 'Rim+FT TSA%', 'FTA']],
  ['Shooting', ['Midrange FGA', 'Midrange FG%', 'FT%']],
  ['Defense', ['DRTG On']]
]

// Every qualified season on the boards with a value of `stat` (`v`), by its team that
// season; `s` ranks it, higher better (`v`, or −`v` where lower is better: cTOV%, DRTG On).
// Qualified is the best season's floor (800+ minutes): the boards' own floor sits lower in
// the 1990s and the season in progress has everyone. A traded season's row is his teams'
// together ('2 TM'), so it's no one franchise's.
export const seasonRows = (docs, stat = 'BPM') => docs.flatMap(doc => {
  const i = doc.labels.indexOf(stat)
  const down = doc.stats?.[stat]?.lowerBetter
  return doc.players.filter(p => p.mp >= MIN_FLOOR.regular && p.v[i] != null)
    .map(p => ({ slug: p.slug, name: p.name, season: doc.season, team: p.team, v: p.v[i], s: down ? -p.v[i] : p.v[i] }))
})

// Each player once, by his best of `rows`, best first; but those in `except` (slugs).
const once = (rows, except = new Set()) => {
  const seen = new Set(except)
  return [...rows].sort((a, b) => b.s - a.s).filter(r => !seen.has(r.slug) && seen.add(r.slug))
}
// Every player's peak season, any team.
export const peakSeasons = rows => once(rows)
// Everyone who had a qualified season with a franchise, by his best season there; but
// those in `except` (the ones its tiles already show).
export const franchisePlayers = (rows, franchise, except) => once(rows.filter(r => franchiseOf(r.team) === franchise), except)

// A franchise's seasons among the league's best: the top 5% (`share`) of every qualified
// season, all teams and years, best first, each its own (a player's dominance shows as his
// count). A franchise can have none.
export const topSeasons = (rows, franchise, share = 0.05) => {
  const all = rows.map(r => r.s).sort((a, b) => b - a)
  const bar = all[Math.max(0, Math.ceil(all.length * share) - 1)]
  return rows.filter(r => franchiseOf(r.team) === franchise && r.s >= bar).sort((a, b) => b.s - a.s)
}

// A team's depth chart (teams.json) as its two tiers of its players: the starters (each
// position's first, PG to C), then the bench in depth order (every position's second, then
// third...). A player listed at two positions sits where he's higher.
export const depthTiers = depth => {
  const rows = depth ? depth.rows : []
  const seen = new Set()
  const at = k => rows.map(r => r.players[k]).filter(p => p && !seen.has(p.slug) && seen.add(p.slug))
  const starters = at(0)
  const bench = []
  for (let k = 1; k < Math.max(1, ...rows.map(r => r.players.length)); k++) bench.push(...at(k))
  return [starters, bench]
}
