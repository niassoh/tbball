import { shortSeason } from './seasons.js'

// The Lonestar tab's helpers: the stats it shows (thinking-bball lib/lonestar.js), how to
// write each, and whether a rise is better (up), worse (down) or neither (a volume stat).
export const STATS = [
  { key: 'load', label: 'Load', dir: 0 },
  { key: 'pts75', label: 'Pts / 75', dir: 0 },
  { key: 'boxCreation', label: 'Box Creation', dir: 0 },
  { key: 'passerRating', label: 'Passer Rating', dir: 1 },
  { key: 'pa3_75', label: '3PA / 75', dir: 0 },
  { key: 'fta75', label: 'FTA / 75', dir: 0 },
  { key: 'rts', label: 'rTS%', dir: 1, pct: true },
  { key: 'pct3', label: '3P%', dir: 1, pct: true },
  { key: 'ctov', label: 'cTOV%', dir: -1, pct: true },
  { key: 'ortg', label: 'ORTG', dir: 1 },
  { key: 'rortg', label: 'rORTG', dir: 1 },
  { key: 'net', label: 'Net', dir: 1 }
]

// A value: percentages ×100, everything to one decimal; "—" when missing.
export const value = (stat, v) => (v === null || v === undefined ? '—' : (stat.pct ? v * 100 : v).toFixed(1))

// A change with its sign, no "−0.0".
export const change = (stat, v) => {
  if (v === null || v === undefined) return '—'
  const x = stat.pct ? v * 100 : v
  return Math.abs(x) < 0.05 ? '0.0' : `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`
}

// A lift (blue) or a cost (orange) by which way the stat helps; a volume stat (Load,
// Pts / 75, …) is blue for more and orange for less. Neither when it shows as 0.0.
export const toneOf = (stat, v) => {
  if (v === null || v === undefined || Math.abs(stat.pct ? v * 100 : v) < 0.05) return 'neutral'
  return (stat.dir || 1) * v > 0 ? 'good' : 'bad'
}

// Where a value sits on its stat's league range (`scale`: [low, median, high]), 0–1,
// clamped to the ends; null without a value or a range. Linear, so a big change near the
// top shows as big as one in the middle.
export const posOf = (scale, v) => {
  if (!scale || v === null || v === undefined) return null
  const [lo, , hi] = scale
  return hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 0.5
}

// The stars of a scenario as words: "Murray", "Murray & Valančiūnas".
const last = name => (name || '?').split(' ').slice(1).join(' ') || name || '?'
export const lastName = last
export const starsText = stars => stars.map(s => last(s.name)).join(' & ')
// In full, for the keys: "Jamal Murray & Jonas Valančiūnas".
export const namesText = stars => stars.map(s => s.name || '?').join(' & ')

// A key's season tag, for a stretch covering fewer seasons than the span on show: "25–26",
// or for several "’19–’21".
export const seasonTag = seasons => (seasons.length === 1
  ? seasons[0].slice(2).replace('-', '–')
  : `${shortSeason(seasons[0])}–${shortSeason(seasons[seasons.length - 1])}`)

// A stretch's seasons in runs, for one with a gap (Curry sat out Green's 2019-20):
// "’13–’19, ’21–’23".
export const seasonRanges = seasons => {
  const runs = []
  for (const s of seasons) {
    const run = runs[runs.length - 1]
    if (run && Number(s.slice(0, 4)) === Number(run[run.length - 1].slice(0, 4)) + 1) run.push(s)
    else runs.push([s])
  }
  return runs.map(seasonTag).join(', ')
}

// The Lonestar document comes packed (thinking-bball lib/profile.js lonestarDoc): each
// stretch's per-stat values as arrays in `fields` order, its change (off less on) left to
// take here. Back to { on, off, change, pctl: { on, off }, ranks: { [stat]: { rank, of } } }.
export const unpackLonestar = doc => {
  const byField = a => Object.fromEntries(doc.fields.map((k, i) => [k, a[i]]))
  const scenario = ({ on: onRow, off: offRow, pctl, ranks, ...s }) => {
    const on = byField(onRow)
    const off = byField(offRow)
    return {
      ...s,
      on,
      off,
      change: Object.fromEntries(doc.fields.map(k => [k, on[k] === null || off[k] === null ? null : off[k] - on[k]])),
      pctl: { on: byField(pctl[0]), off: byField(pctl[1]) },
      ranks: ranks && Object.fromEntries(doc.fields.flatMap((k, i) => (ranks.rank[i] === null ? [] : [[k, { rank: ranks.rank[i], of: ranks.of[i] }]])))
    }
  }
  return { ...doc, views: doc.views.map(v => ({ ...v, scenarios: v.scenarios.map(scenario) })) }
}

// What each stat counts, in the tour's words.
export const MEANS = {
  load: 'how much of the offense runs through him, in possessions used or created per 100',
  pts75: 'his points per 75 possessions',
  boxCreation: 'the open shots he creates for teammates per 100 possessions',
  passerRating: 'how well he passes, on a 1–10 scale',
  pa3_75: 'his three-point attempts per 75 possessions',
  fta75: 'his free-throw attempts per 75 possessions',
  rts: 'his true shooting above or below the league average',
  pct3: 'his three-point percentage',
  ctov: 'how often his chances to score or pass end in a turnover',
  ortg: 'the points he produces per 100 possessions he uses',
  rortg: 'his offensive rating above or below the league average',
  net: "his team's margin per 100 possessions while he plays"
}

// The row the tour walks through, and its caption (Tour.jsx's markup): the stat his change
// stands out most in among players' (its rank nearest either end), else Load where none is
// ranked (too few minutes). `text` says what the stat counts, which way is better (none
// for a volume stat) and how its row's vector reads; `math` works out his change; `example`
// reads it. `who`: the stars who sit; `name`: his surname.
export const tourExample = (s, who, name) => {
  const ranked = STATS.filter(x => s.ranks && s.ranks[x.key] && s.change[x.key] !== null)
  const edge = x => Math.min(s.ranks[x.key].rank, s.ranks[x.key].of + 1 - s.ranks[x.key].rank) / s.ranks[x.key].of
  const stat = ranked.reduce((a, x) => (edge(x) < edge(a) ? x : a), ranked[0]) || STATS[0]
  const k = stat.key
  const v = s.change[k]
  const tone = toneOf(stat, v)
  const moves = `his ${stat.label} ${v > 0 ? 'rises' : 'falls'} by ${change(stat, Math.abs(v)).replace('+', '')}${stat.pct ? ' points' : ''}`
  return {
    key: k,
    title: stat.label,
    text: `${stat.label} is **${MEANS[k]}**. ${stat.dir > 0 ? 'Higher is better. ' : stat.dir < 0 ? 'Lower is better. ' : ''}The vectors start with the values **with** ${name}'s best teammates (the square) and point to ${name}'s stats **without** his best teammates.`,
    math: [['W/O', value(stat, s.off[k])], '−', ['WITH', value(stat, s.on[k])], '=', `**${tone === 'neutral' ? '' : `${tone}:`}${change(stat, v)}**`],
    example: `Without ${who}, ${moves}${stat.dir ? `, which is ${stat.dir * v > 0 ? 'better' : 'worse'}` : ''}.`
  }
}
