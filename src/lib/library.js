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
  return doc.players.filter(p => p.mp >= MIN_FLOOR.regular && p.v[i] !== null).map(p => ({ slug: p.slug, season: doc.season, team: p.team, bpm: p.v[i] }))
})

// The top 5% (`share`) of a franchise's seasons by BPM, at least one; a player can have
// several.
export const topSeasons = (rows, franchise, share = 0.05) => {
  const own = rows.filter(r => franchiseOf(r.team) === franchise).sort((a, b) => b.bpm - a.bpm)
  return own.slice(0, Math.ceil(own.length * share))
}

// A team's depth chart (teams.json) as its two tiers, by slug: the starters (each
// position's first, PG to C), then the bench in depth order (every position's second, then
// third...). A player listed at two positions sits where he's higher.
export const depthTiers = depth => {
  const rows = depth ? depth.rows : []
  const seen = new Set()
  const at = k => rows.map(r => r.players[k]).filter(p => p && !seen.has(p.slug) && seen.add(p.slug)).map(p => p.slug)
  const starters = at(0)
  const bench = []
  for (let k = 1; k < Math.max(1, ...rows.map(r => r.players.length)); k++) bench.push(...at(k))
  return [starters, bench]
}
