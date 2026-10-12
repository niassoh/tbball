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

// Seasons as the year strip and readout write them: "'14" for 2013-14 (the year it ends,
// as the site writes career spans), every season from one to another, a span
// ("2018–19 → 2020–21", one season alone), and a view's id ("2018-19..2020-21").
export const shortSeason = s => `’${s.slice(5)}`
export const seasonsBetween = (first, last) => Array.from({ length: Number(last.slice(0, 4)) - Number(first.slice(0, 4)) + 1 }, (_, i) => {
  const y = Number(first.slice(0, 4)) + i
  return `${y}-${String(y + 1).slice(2)}`
})
export const spanText = (from, to) => (from === to ? from : `${from} → ${to}`).replace(/-/g, '–')
export const spanId = (from, to) => (from === to ? from : `${from}..${to}`)

// A key's season tag, for a stretch covering fewer seasons than the span on show: "25–26",
// or for several "’19–’21".
export const seasonTag = seasons => (seasons.length === 1
  ? seasons[0].slice(2).replace('-', '–')
  : `${shortSeason(seasons[0])}–${shortSeason(seasons[seasons.length - 1])}`)
