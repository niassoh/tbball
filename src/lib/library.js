// The player index's team view: a franchise's best seasons, from the season boards (the
// Leaderboard's documents, one per season).
import { MIN_FLOOR } from './seasons.js'

// Codes a franchise played under before (teams.js PAST_TEAM_COLORS): the 1988-2002 Hornets'
// history is Charlotte's, the New Orleans and Oklahoma City Hornets' the Pelicans'.
const FRANCHISE = { SEA: 'OKC', NJN: 'BKN', CHH: 'CHA', NOH: 'NOP', NOK: 'NOP', VAN: 'MEM' }
export const franchiseOf = team => FRANCHISE[team] || team

// Every qualified season on the boards, by its team that season and BPM. Qualified is the
// best season's floor (800+ minutes): the boards' own floor sits lower in the 1990s and
// the season in progress has everyone. A traded season's row is his teams' together
// ('2 TM'), so it's no one franchise's.
export const seasonRows = docs => docs.flatMap(doc => {
  const i = doc.labels.indexOf('BPM')
  return doc.players.filter(p => p.mp >= MIN_FLOOR.regular && p.v[i] !== null).map(p => ({ slug: p.slug, name: p.name, season: doc.season, team: p.team, bpm: p.v[i] }))
})

// Everyone who had a qualified season with a franchise, once, by his best season there
// (by BPM), best first; but those in `except` (slugs: the ones its tiles already show).
export const franchisePlayers = (rows, franchise, except = new Set()) => {
  const seen = new Set(except)
  return rows.filter(r => franchiseOf(r.team) === franchise).sort((a, b) => b.bpm - a.bpm).filter(r => !seen.has(r.slug) && seen.add(r.slug))
}

// A franchise's players with a season among the league's best: the top 5% (`share`) of
// every qualified season, all teams and years, by BPM. Each comes once, by his best season
// there, best first, bringing his `set`: his seasons there over that bar, by season; two
// or more make a collection. A franchise can have none.
export const topSeasons = (rows, franchise, share = 0.05) => {
  const all = rows.map(r => r.bpm).sort((a, b) => b - a)
  const bar = all[Math.max(0, Math.ceil(all.length * share) - 1)]
  const top = rows.filter(r => franchiseOf(r.team) === franchise && r.bpm >= bar).sort((a, b) => b.bpm - a.bpm)
  const seen = new Set()
  return top.filter(r => !seen.has(r.slug) && seen.add(r.slug)).map(r => ({
    ...r, set: top.filter(t => t.slug === r.slug).sort((a, b) => (a.season < b.season ? -1 : 1))
  }))
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
