// The Leaderboard's board: rows built from one or more season documents (thinking-bball
// lib/profile.js leaderboard, leaderboardDelta), in the documents' shape (`labels`,
// `stats`, `groups`, and players with values `v` and percentiles `p` in label order),
// each row with an `id` (his slug, or slug|season when a player has a row per season)
// and the `season` it stands for (the span's last, for a combined row).
import { quantile } from './leaderboard.js'
import { SHOT_VOLUME } from './span.js'

// A value's percentile among a pool: the share of the pool strictly worse, as the stats
// sheet and thinking-bball lib/percentile.js count it.
export const percentileOf = (value, pool, lowerBetter = false) => {
  const nums = pool.filter(v => v !== null)
  if (!nums.length || value === null) return null
  const worse = nums.filter(v => (lowerBetter ? v > value : v < value)).length
  return Math.round((worse / nums.length) * 100)
}

// Each player-season in the documents its own row, ranked as its season ranked it.
export const eachSeason = docs => {
  const meta = docs[docs.length - 1]
  const many = docs.length > 1
  const players = docs.flatMap(d => d.players.map(p => ({ ...p, id: many ? `${p.slug}|${d.season}` : p.slug, season: d.season })))
  return { ...meta, many, players }
}

// One player's seasons (`entries`: [{ doc, p }]) as one: games and minutes summed, every
// stat averaged as the profile averages a span (lib/span.js spanMean): weighted by
// minutes, a shooting stat by minutes times its attempt rate that season, a season
// without the stat (or its attempt rate) left out.
const combineOne = (entries, labels) => {
  const last = entries[entries.length - 1].p
  const teams = [...new Set(entries.flatMap(({ p }) => p.teams || [p.team]).filter(t => !/TM$/.test(t)))]
  const v = labels.map(l => {
    const volume = SHOT_VOLUME[l]
    let sum = 0
    let weight = 0
    for (const { doc, p } of entries) {
      const k = doc.labels.indexOf(l)
      const x = k < 0 ? null : p.v[k]
      if (x === null || !p.mp) continue
      const shots = volume ? p.v[doc.labels.indexOf(volume)] ?? null : 1
      if (!shots) continue
      sum += x * p.mp * shots
      weight += p.mp * shots
    }
    return weight ? sum / weight : null
  })
  return {
    slug: last.slug,
    id: last.slug,
    name: last.name,
    team: teams.length > 1 ? `${teams.length} TM` : teams[0] || last.team,
    ...(teams.length > 1 ? { teams } : {}),
    pos: last.pos,
    age: last.age,
    gp: entries.reduce((a, { p }) => a + (p.gp || 0), 0),
    mp: entries.reduce((a, { p }) => a + (p.mp || 0), 0),
    headshot: last.headshot,
    headshotVersion: last.headshotVersion,
    seasons: entries.map(({ doc }) => doc.season),
    v
  }
}

// Each row's percentile in every stat among the rows (the way the stat helps; a style
// stat as is).
const ranked = (labels, stats, players) => {
  labels.forEach((l, k) => {
    const pool = players.map(p => p.v[k])
    for (const p of players) p.p[k] = percentileOf(p.v[k], pool, !!stats[l].lowerBetter)
  })
  return players
}

const bySlug = docs => {
  const out = new Map()
  for (const doc of docs) for (const p of doc.players) out.set(p.slug, [...(out.get(p.slug) || []), { doc, p }])
  return out
}

// One row per player over the documents' seasons, ranked among the combined rows. A
// combined Footprint swing is his seasons' swings averaged; whether it clears the noise
// can't be told from them, so it carries no mark.
export const combined = docs => {
  const meta = docs[docs.length - 1]
  const players = [...bySlug(docs).values()].map(entries => ({ ...combineOne(entries, meta.labels), season: meta.season, p: [] }))
  return { ...meta, combined: true, players: ranked(meta.labels, meta.stats, players) }
}

// Playoffs minus regular season over a span, one row per playoff player: his combined
// playoffs against his combined regular seasons in the same seasons (the runs' own
// seasons), ranked among the changes; games and minutes are the playoffs'.
export const combinedDelta = (playoffDocs, regularDocs) => {
  const meta = playoffDocs[playoffDocs.length - 1]
  const reg = bySlug(regularDocs)
  const players = []
  for (const runs of bySlug(playoffDocs).values()) {
    const seasons = new Set(runs.map(({ doc }) => doc.season))
    const regular = (reg.get(runs[0].p.slug) || []).filter(({ doc }) => seasons.has(doc.season))
    if (!regular.length) continue
    const po = combineOne(runs, meta.labels)
    const rs = combineOne(regular, meta.labels)
    players.push({ ...po, season: meta.season, v: po.v.map((x, k) => (x === null || rs.v[k] === null ? null : x - rs.v[k])), p: [] })
  }
  const last = regularDocs[regularDocs.length - 1]
  const stats = Object.fromEntries(meta.labels.map(l => [l, { ...meta.stats[l], relative: true, years: last.stats[l] ? last.stats[l].years : null }]))
  return { ...meta, type: 'delta', combined: true, stats, players: ranked(meta.labels, stats, players) }
}

// The rows at or above a share of the way up the minutes (`top`: 1 for all, 0.75, 0.5,
// 0.25 for the top three-quarters, half, quarter).
export const qualified = (rows, top) => {
  if (top >= 1) return rows
  const line = quantile(rows.map(p => p.mp), 1 - top)
  return rows.filter(p => p.mp !== null && p.mp >= line)
}
