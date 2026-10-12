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

// A league range centred on its median: the same reach either side (the farther of the
// two ends), so a plot's median lines sit in the middle on one linear scale.
export const centered = scale => {
  if (!scale) return null
  const [lo, mid, hi] = scale
  const reach = Math.max(mid - lo, hi - mid)
  return [mid - reach, mid, mid + reach]
}

// A row's strip across the stat's league range: `n` cells (2% of the range each at 50),
// the cell he's in with the stars ('with'), without them ('without'), the same one
// either way ('both'), the cells between ('between'), and the rest ('empty').
export const stripOf = (on, off, scale, n = 50) => {
  const at = v => {
    const x = posOf(scale, v)
    return x === null ? null : Math.min(n - 1, Math.floor(x * n))
  }
  const a = at(on)
  const b = at(off)
  return Array.from({ length: n }, (_, i) => {
    if (i === a && i === b) return 'both'
    if (i === a) return 'with'
    if (i === b) return 'without'
    if (a !== null && b !== null && i > Math.min(a, b) && i < Math.max(a, b)) return 'between'
    return 'empty'
  })
}

// How far each of a strip's 'between' cells is along the way from the WITH cell to the
// WITHOUT cell (0–1, the ends excluded), so the trail can fade in toward where he ends
// up; null for every other cell.
export const fadeOf = states => {
  const a = states.indexOf('with')
  const b = states.indexOf('without')
  return states.map((state, i) => (state === 'between' && a >= 0 && b >= 0 ? Math.abs(i - a) / Math.abs(b - a) : null))
}

// The stars of a scenario as words: "Murray", "Murray & Valančiūnas".
const last = name => (name || '?').split(' ').slice(1).join(' ') || name || '?'
export const lastName = last
export const starsText = stars => stars.map(s => last(s.name)).join(' & ')

// "2024–25 and 2025–26" / "2025–26"
export const seasonsText = seasons => seasons.map(s => s.replace('-', '–')).join(' and ')
