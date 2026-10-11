// The Lonestar tab's helpers: the stats it shows (thinking-bball lib/lonestar.js), how to
// write each, and whether a rise is better (up), worse (down) or neither (a volume stat).
// Grouped by what they say about him: his role, his shot diet, his efficiency, and the
// team's offense around him.
export const STATS = [
  { key: 'load', label: 'Load', short: 'Load', group: 'Role', dir: 0 },
  { key: 'pts75', label: 'Pts / 75', short: 'Pts', group: 'Role', dir: 0 },
  { key: 'boxCreation', label: 'Box Creation', short: 'BC', group: 'Role', dir: 0 },
  { key: 'passerRating', label: 'Passer Rating', short: 'PR', group: 'Role', dir: 1 },
  { key: 'pa3_75', label: '3PA / 75', short: '3PA', group: 'Shot diet', dir: 0 },
  { key: 'fta75', label: 'FTA / 75', short: 'FTA', group: 'Shot diet', dir: 0 },
  { key: 'rts', label: 'rTS%', short: 'rTS', group: 'Efficiency', dir: 1, pct: true },
  { key: 'pct3', label: '3P%', short: '3P%', group: 'Efficiency', dir: 1, pct: true },
  { key: 'ctov', label: 'cTOV%', short: 'cTOV', group: 'Efficiency', dir: -1, pct: true },
  { key: 'ortg', label: 'ORTG', short: 'ORTG', group: 'Team', dir: 1 },
  { key: 'rortg', label: 'rORTG', short: 'rORTG', group: 'Team', dir: 1 },
  { key: 'net', label: 'Net', short: 'Net', group: 'Team', dir: 1 }
]
export const GROUPS = [...new Set(STATS.map(s => s.group))].map(name => ({ name, stats: STATS.filter(s => s.group === name) }))

// A value: percentages ×100, everything to one decimal; "—" when missing.
export const value = (stat, v) => (v === null || v === undefined ? '—' : (stat.pct ? v * 100 : v).toFixed(1))

// A change with its sign, no "−0.0".
export const change = (stat, v) => {
  if (v === null || v === undefined) return '—'
  const x = stat.pct ? v * 100 : v
  return Math.abs(x) < 0.05 ? '0.0' : `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`
}

// A lift (blue) or a cost (orange) by which way the stat helps; a volume stat (Load,
// Pts / 75, …) is blue for more and orange for less. Neither only when it doesn't move.
export const toneOf = (stat, v) => (v === null || v === undefined || Math.abs(v) < 1e-9 ? 'neutral' : (stat.dir || 1) * v > 0 ? 'good' : 'bad')

// How strongly a column takes its change's colour, by how big the change is (`size`, the
// percentile of |change| among every player's): 20% for the smallest, 90% for the
// biggest, 45% when unknown.
export const tintOf = size => (size === null || size === undefined ? 45 : Math.round(20 + 0.7 * size))

// A league percentile as lit segments of a 10-segment column.
export const segmentsOf = p => (p === null || p === undefined ? 0 : Math.max(0, Math.min(10, Math.round(p / 10))))

// A column's 10 segments, bottom up, for his percentile with the stars and without:
// held either way, gained without them, lost without them (lit only with), or empty.
export const cellsOf = (pOn, pOff) => {
  const w = segmentsOf(pOn)
  const wo = segmentsOf(pOff)
  return Array.from({ length: 10 }, (_, i) => (i < Math.min(w, wo) ? 'held' : i < wo ? 'gained' : i < w ? 'lost' : 'empty'))
}

// The stats whose league percentile moves most without his stars, biggest first:
// { stat, on, off, delta } (delta in percentile points, without − with).
export const shiftsOf = (pctl, n = 3) => STATS
  .filter(stat => pctl.on[stat.key] !== null && pctl.on[stat.key] !== undefined && pctl.off[stat.key] !== null && pctl.off[stat.key] !== undefined)
  .map(stat => ({ stat, on: pctl.on[stat.key], off: pctl.off[stat.key], delta: pctl.off[stat.key] - pctl.on[stat.key] }))
  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  .slice(0, n)

// How many of a 10-segment meter a rank lights: all for #1, none for the last.
export const litOf = r => (r && r.of > 1 ? Math.round(10 * (1 - (r.rank - 1) / (r.of - 1))) : 0)

// The stars of a scenario as words: "Murray", "Murray & Valančiūnas".
const last = name => (name || '?').split(' ').slice(1).join(' ') || name || '?'
export const starsText = stars => stars.map(s => last(s.name)).join(' & ')

// "2024–25 and 2025–26" / "2025–26"
export const seasonsText = seasons => seasons.map(s => s.replace('-', '–')).join(' and ')
