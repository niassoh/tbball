// The Lonestar tab's helpers: the stats it shows (thinking-bball lib/lonestar.js), how to
// write each, and whether a rise is better (up), worse (down) or neither (a volume stat).
export const STATS = [
  { key: 'load', label: 'Load', dir: 0 },
  { key: 'pts75', label: 'Pts / 75', dir: 0 },
  { key: 'rts', label: 'rTS%', dir: 1, pct: true },
  { key: 'boxCreation', label: 'Box Creation', dir: 0 },
  { key: 'passerRating', label: 'Passer Rating', dir: 1 },
  { key: 'pa3_75', label: '3PA / 75', dir: 0 },
  { key: 'pct3', label: '3P%', dir: 1, pct: true },
  { key: 'fta75', label: 'FTA / 75', dir: 0 },
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

// A lift (blue), a cost (orange) or neither, by which way the stat helps.
export const toneOf = (stat, v) => (!stat.dir || v === null || v === undefined || Math.abs(v) < 1e-9 ? 'neutral' : stat.dir * v > 0 ? 'good' : 'bad')

// Where a value sits on its stat's track, 0–100 across the league's spread (clamped to
// the ends), or null without a value or a spread.
export const trackPos = (scale, v) => {
  if (!scale || v === null || v === undefined) return null
  const [lo, hi] = scale
  return hi > lo ? Math.max(0, Math.min(100, (100 * (v - lo)) / (hi - lo))) : 50
}

// The colour of a point on a track: grey at the middle, the full colour at either end,
// coming on with the square of the distance from the middle (so it stays grey near the
// middle and saturates toward the ends). The high end is blue and the low end orange,
// volume stats too; a stat that's better low (cTOV%) flips.
export const rampAt = (x, dir = 1) => {
  const t = Math.min(1, Math.abs(x - 50) / 50)
  return { tone: (x >= 50) === (dir !== -1) ? 'good' : 'bad', share: Math.round(100 * t * t) }
}

// How many of a 10-segment meter a rank lights: all for #1, none for the last.
export const litOf = r => (r && r.of > 1 ? Math.round(10 * (1 - (r.rank - 1) / (r.of - 1))) : 0)

// The stars of a scenario as words: "Murray", "Murray & Valančiūnas".
const last = name => (name || '?').split(' ').slice(1).join(' ') || name || '?'
export const starsText = stars => stars.map(s => last(s.name)).join(' & ')

// "2024–25 and 2025–26" / "2025–26"
export const seasonsText = seasons => seasons.map(s => s.replace('-', '–')).join(' and ')
