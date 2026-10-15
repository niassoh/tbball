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

// The Player group: each row's age (the site's own, in the season: lib/age.js liveAges) and
// listed height in inches (`ht`) as stats, for the chart's axes only (`axesOnly`: not one
// of the table's tabs); their percentiles are a style's (neither end is better).
export const withPlayer = doc => {
  if (doc.labels.includes('Age')) return doc
  const vals = doc.players.map(p => [p.age ?? null, p.ht ?? null])
  const pools = [0, 1].map(k => vals.map(v => v[k]))
  return {
    ...doc,
    labels: [...doc.labels, 'Age', 'Height'],
    stats: { ...doc.stats, Age: { dec: 1, neutral: true }, Height: { dec: 0, neutral: true, feet: true } },
    groups: [...doc.groups, { id: 'player', name: 'Player', stats: ['Age', 'Height'], axesOnly: true }],
    players: doc.players.map((p, i) => ({ ...p, v: [...p.v, ...vals[i]], p: [...p.p, ...vals[i].map((v, k) => percentileOf(v, pools[k]))] }))
  }
}

// A regular season's document with its rolling-window shooting stats (the sheet's 3yr)
// replaced by that season alone (the document's hidden `1yr` columns), values and
// percentiles, for views over many seasons, whose windows would overlap. A stat with no
// single season on file keeps its window.
export const singleYear = doc => {
  const at = new Map(doc.labels.map((l, k) => [l, k]))
  const swaps = doc.labels.map((l, k) => [k, at.get(`1yr ${l}`)]).filter(([, j]) => j !== undefined)
  if (!swaps.length) return doc
  const stats = { ...doc.stats }
  for (const [k] of swaps) stats[doc.labels[k]] = { ...stats[doc.labels[k]], years: null }
  const swap = xs => {
    const out = [...xs]
    for (const [k, j] of swaps) out[k] = xs[j]
    return out
  }
  return { ...doc, stats, players: doc.players.map(p => ({ ...p, v: swap(p.v), p: swap(p.p) })) }
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
// A document's label positions, found once (eras average thousands of rows).
const POSITIONS = new WeakMap()
const positionsOf = doc => {
  if (!POSITIONS.has(doc)) POSITIONS.set(doc, new Map(doc.labels.map((l, k) => [l, k])))
  return POSITIONS.get(doc)
}

const combineOne = (entries, labels) => {
  const last = entries[entries.length - 1].p
  const teams = [...new Set(entries.flatMap(({ p }) => p.teams || [p.team]).filter(t => !/TM$/.test(t)))]
  const at = entries.map(({ doc }) => positionsOf(doc))
  const v = labels.map(l => {
    const volume = SHOT_VOLUME[l]
    let sum = 0
    let weight = 0
    entries.forEach(({ p }, i) => {
      const k = at[i].get(l)
      const x = k === undefined ? null : p.v[k]
      if (x === null || !p.mp) return
      const shots = volume ? p.v[at[i].get(volume)] ?? null : 1
      if (!shots) return
      sum += x * p.mp * shots
      weight += p.mp * shots
    })
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

// How many of an ascending list sit below v (strict), or at or below it.
const countBelow = (sorted, v, strict) => {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (strict ? sorted[mid] < v : sorted[mid] <= v) lo = mid + 1
    else hi = mid
  }
  return lo
}

// Each row's percentile in every stat among the rows (the way the stat helps; a style
// stat as is): percentileOf's share strictly worse, counted on each stat's sorted values
// (eras run to thousands of rows).
const ranked = (labels, stats, players) => {
  labels.forEach((l, k) => {
    const pool = players.map(p => p.v[k]).filter(v => v !== null).sort((a, b) => a - b)
    const lower = !!stats[l].lowerBetter
    for (const p of players) {
      const v = p.v[k]
      const worse = v === null ? null : lower ? pool.length - countBelow(pool, v, false) : countBelow(pool, v, true)
      p.p[k] = worse === null || !pool.length ? null : Math.round((worse / pool.length) * 100)
    }
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

// Every player's eras of `n` seasons: each run of n of his seasons in a row on the board
// (`docs` in season order; a season he spent under the minutes floor isn't on it, so a run
// can stretch past n years), one row apiece (`era`: its first and last season), averaged
// as a combined span is, ranked among all of them.
export const eras = (docs, n) => {
  const meta = docs[docs.length - 1]
  const players = []
  for (const entries of bySlug(docs).values()) {
    for (let i = 0; i + n <= entries.length; i++) {
      const run = entries.slice(i, i + n)
      const era = [run[0].doc.season, run[n - 1].doc.season]
      const row = combineOne(run, meta.labels)
      players.push({ ...row, id: `${row.slug}|${era.join('..')}`, season: era[1], era, p: [] })
    }
  }
  return { ...meta, combined: true, eras: n, players: ranked(meta.labels, meta.stats, players) }
}

// Each player's best era for two stats (labels `x`, `y`): the one with the highest
// percentiles in both together (each read the way it helps), for the scatter, which would
// otherwise draw thousands of eras. Eras missing either stat are left out.
export const bestEras = (doc, x, y) => {
  const kx = doc.labels.indexOf(x)
  const ky = doc.labels.indexOf(y)
  const best = new Map()
  for (const p of doc.players) {
    const a = p.p[kx]
    const b = p.p[ky]
    if (a === null || a === undefined || b === null || b === undefined) continue
    const held = best.get(p.slug)
    if (!held || a + b > held.score) best.set(p.slug, { p, score: a + b })
  }
  return { ...doc, players: [...best.values()].map(b => b.p) }
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
