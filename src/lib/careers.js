// Career Trajectories: every player's seasons across the season boards (lib/board.js's
// documents, one per season), as one store the page charts any stat of, by season, age or
// year of career, or against another stat. A row is a season on the board (800+ minutes,
// a playoff run in the playoffs); a season under the floor is a gap.
import { ageIn } from './age.js'
import { singleYear } from './board.js'
import { quantile } from './leaderboard.js'
import { SHOT_VOLUME } from './span.js'

// The year a season ends, as the site writes seasons ('04 for 2003-04).
const yearOf = season => Number(season.slice(0, 4)) + 1

// The documents (any order) as careers. Values and percentiles are each season's own (the
// rolling tracking windows swapped for single seasons, singleYear), in the latest
// document's label order: an older document is read by label name, a stat it lacks null,
// so boards with fewer stats (the historical ones, later) join as they are. Ages are from
// the birth date alone (Feb 1 of the season, uncapped by today, so the season in progress
// reads like the rest): the boards' own `age` is missing for some and another player's for
// a merged name; a career with an age outside 17–45 loses its ages. A player already on the
// first board began before it: his year of career is unknown (`censored`).
export const careersOf = docs => {
  const sorted = [...docs].sort((a, b) => (a.season < b.season ? -1 : 1)).map(singleYear)
  const meta = sorted[sorted.length - 1]
  const labels = meta.labels
  const first = sorted[0].season
  const bySlug = new Map()
  const players = []
  for (const doc of sorted) {
    const same = doc.labels.length === labels.length && doc.labels.every((l, k) => l === labels[k])
    const at = same ? null : labels.map(l => { const k = doc.labels.indexOf(l); return k < 0 ? null : k })
    const pick = xs => (same ? xs : at.map(k => (k === null ? null : xs[k] ?? null)))
    for (const p of doc.players) {
      let pl = bySlug.get(p.slug)
      if (!pl) {
        pl = { i: players.length, slug: p.slug, rows: [] }
        bySlug.set(p.slug, pl)
        players.push(pl)
      }
      Object.assign(pl, { name: p.name, headshot: p.headshot, headshotVersion: p.headshotVersion, team: p.team })
      if (p.born) pl.born = p.born
      pl.rows.push({ season: doc.season, year: yearOf(doc.season), team: p.team, mp: p.mp, v: pick(p.v), p: pick(p.p) })
    }
  }
  const rows = []
  for (const pl of players) {
    pl.born = pl.born || null
    pl.censored = pl.rows[0].season === first
    const firstYear = pl.rows[0].year
    const ages = pl.rows.map(r => (pl.born ? Math.floor(ageIn(pl.born, r.season, Infinity)) : null))
    const sane = ages.every(a => a === null || (a >= 17 && a <= 45))
    pl.rows.forEach((r, k) => {
      r.age = sane ? ages[k] : null
      r.cy = pl.censored ? null : r.year - firstYear + 1
      rows.push(r)
    })
  }
  // Each stat's first season with a value.
  const since = labels.map(() => null)
  for (const r of rows) r.v.forEach((x, k) => { if (x !== null && x !== undefined && (since[k] === null || r.season < since[k])) since[k] = r.season })
  const stats = Object.fromEntries(labels.map((l, k) => [l, { ...meta.stats[l], since: since[k] }]))
  return { type: meta.type, seasons: sorted.map(d => d.season), labels, groups: meta.groups, stats, players, bySlug, rows }
}

// A row's place on a time axis.
export const TIME = { season: r => r.year, age: r => r.age, career: r => r.cy }

// Rows averaged as the profile averages a span (lib/span.js spanMean): values weighted by
// minutes, a shooting stat's by minutes times its attempt rate; percentiles by minutes.
const spanOf = (rows, k, vk) => {
  let sv = 0
  let wv = 0
  let sp = 0
  let wp = 0
  for (const r of rows) {
    const x = r.v[k]
    if (x === null || x === undefined || !r.mp) continue
    const shots = vk < 0 ? 1 : r.v[vk]
    if (shots) {
      sv += x * r.mp * shots
      wv += r.mp * shots
    }
    if (r.p[k] !== null && r.p[k] !== undefined) {
      sp += r.p[k] * r.mp
      wp += r.mp
    }
  }
  return { v: wv ? sv / wv : null, p: wp ? Math.round(sp / wp) : null }
}

// A stat for each player's rows (`players`, every player's by default): `{ v, p }`, lined
// up with his rows. Smoothed (`smooth` 3), each season averages itself with his seasons a
// year either side (centred, so a peak stays in its year); a season without the stat stays
// empty rather than borrowing a neighbour's.
export const column = (store, label, smooth = 1, players = store.players) => {
  const k = store.labels.indexOf(label)
  const vk = SHOT_VOLUME[label] ? store.labels.indexOf(SHOT_VOLUME[label]) : -1
  const half = (smooth - 1) / 2
  return players.map(pl => {
    if (k < 0) return { v: pl.rows.map(() => null), p: pl.rows.map(() => null) }
    if (smooth <= 1) return { v: pl.rows.map(r => r.v[k] ?? null), p: pl.rows.map(r => r.p[k] ?? null) }
    const out = pl.rows.map(r => (r.v[k] === null || r.v[k] === undefined ? { v: null, p: null } : spanOf(pl.rows.filter(o => Math.abs(o.year - r.year) <= half), k, vk)))
    return { v: out.map(o => o.v), p: out.map(o => o.p) }
  })
}

// The league's spread at each x (`points`: [x, y], x whole): its 10th, 50th and 90th
// percentiles where at least `least` seasons fall.
export const envelope = (points, least = 20) => {
  const bins = new Map()
  for (const [x, y] of points) {
    if (x === null || y === null) continue
    if (!bins.has(x)) bins.set(x, [])
    bins.get(x).push(y)
  }
  return [...bins].filter(([, ys]) => ys.length >= least).sort((a, b) => a[0] - b[0])
    .map(([x, ys]) => ({ x, n: ys.length, lo: quantile(ys, 0.1), mid: quantile(ys, 0.5), hi: quantile(ys, 0.9) }))
}

// A player's peak in a stat (his best season by percentile, more minutes breaking a tie),
// his best run of three seasons with it (by mean percentile; a season off the board between
// them doesn't break it, as the Leaderboard's runs), and which seasons were 90th or better
// (null without a percentile). Single seasons, whatever the chart's smoothing.
export const peakOf = (store, player, label) => {
  const k = store.labels.indexOf(label)
  const vk = SHOT_VOLUME[label] ? store.labels.indexOf(SHOT_VOLUME[label]) : -1
  const rows = player.rows
  const pc = r => (k < 0 ? null : r.p[k] ?? null)
  let peak = null
  rows.forEach((r, i) => {
    if (pc(r) === null) return
    if (peak === null || pc(r) > pc(rows[peak]) || (pc(r) === pc(rows[peak]) && (r.mp || 0) > (rows[peak].mp || 0))) peak = i
  })
  const with_ = rows.map((r, i) => i).filter(i => pc(rows[i]) !== null)
  let run = null
  for (let j = 0; j + 3 <= with_.length; j++) {
    const span = spanOf(with_.slice(j, j + 3).map(i => rows[i]), k, vk)
    if (span.p !== null && (!run || span.p > run.p)) run = { from: with_[j], to: with_[j + 2], ...span }
  }
  return { peak, run, elite: rows.map(r => (pc(r) === null ? null : pc(r) >= 90)) }
}

// A raw axis's values: the league's middle 98%, so a handful of extreme seasons don't
// squeeze every career into the middle of the frame (they run off its edge instead).
export const middle98 = vs => {
  const lo = quantile(vs, 0.01)
  const hi = quantile(vs, 0.99)
  return vs.filter(v => v >= lo && v <= hi)
}

// The years a time chart spans: the shown players' (`mine`; the league's when there are
// none), eight at least, never past the league's own (no age 18 when no one on the boards
// was 18), edge to edge.
export const domainOf = (mine, league) => {
  const xs = mine.length ? mine : league
  if (!xs.length) return [0, 1]
  const lo = Math.min(...league)
  const hi = Math.max(...league)
  let d0 = Math.max(lo, Math.min(...xs))
  let d1 = Math.min(hi, Math.max(...xs))
  if (d1 - d0 < 8) {
    d1 = Math.min(hi, d0 + 8)
    d0 = Math.max(lo, d1 - 8)
  }
  return [d0, d1]
}
