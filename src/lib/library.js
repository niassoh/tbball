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

// A franchise's best players, each by his best season there (by BPM), as many as 5%
// (`share`) of its seasons, at least one. Each brings his `set`: his seasons among those
// top 5% (his best always), by season; two or more make a collection.
export const topSeasons = (rows, franchise, share = 0.05) => {
  const own = rows.filter(r => franchiseOf(r.team) === franchise).sort((a, b) => b.bpm - a.bpm)
  const n = Math.ceil(own.length * share)
  const top = own.slice(0, n)
  const seen = new Set()
  return own.filter(r => !seen.has(r.slug) && seen.add(r.slug)).slice(0, n).map(r => {
    const set = top.filter(t => t.slug === r.slug)
    return { ...r, set: (set.length ? set : [r]).sort((a, b) => (a.season < b.season ? -1 : 1)) }
  })
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
