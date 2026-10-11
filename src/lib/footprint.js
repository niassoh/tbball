// The Footprint tab's helpers: how to read each effect of the profile's `footprint`
// (thinking-bball lib/footprint.js): his team's stat with him on the floor minus off.

// A lift (his team is better for it), a cost, or neither (a style stat, such as tempo).
export const toneOf = e => (!e.good ? 'neutral' : e.good * e.diff >= 0 ? 'good' : 'bad')

// How strong a lit tile is, 0–1: how far its z clears the 2.5 bar, full at 7.
const clamp01 = v => Math.max(0, Math.min(1, v))
export const strengthOf = e => clamp01((Math.abs(e.z) - 2.5) / 4.5)

// A lit tile's color at its strength: the weakest is mostly grey, the strongest the full color.
export const shade = (color, strength) => `color-mix(in srgb, ${color} ${Math.round(40 + 60 * strength)}%, #5a5550)`

// The tile's bar: from the middle, as long as the swing ranks among players' swings in
// that stat (its percentile, left/width in percent), toward the lift side (right) or the
// cost side (left); a style stat goes the way the stat moved.
export const bar = e => {
  const half = ((e.pctl || 0) / 100) * 50
  const right = (e.good ? e.good * e.diff : e.diff) >= 0
  return { left: right ? 50 : 50 - half, width: half }
}

// A swing with its sign and one decimal, with no "−0.0".
export const swingText = v => (v === null || v === undefined ? '—' : Math.abs(v) < 0.05 ? '0.0' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`)

// What each kind of stat's swing is counted in.
export const UNITS = { pct: 'PCT PTS', pts: 'PTS/100', pace: 'POSS/48' }

// The seasons a footprint covers, from its spans (a traded player has two in a season).
export const seasonsOf = fp => [...new Set(fp.spans.map(s => s.season))].sort()

// "2024–25 and 2025–26"
export const seasonsText = seasons => seasons.map(s => s.replace('-', '–')).join(' and ')

// The calendar years the seasons cover: "2024–2026" for 2024-25 and 2025-26.
export const yearsText = seasons => {
  const sorted = [...seasons].sort()
  return `${sorted[0].slice(0, 4)}–${Number(sorted[sorted.length - 1].slice(0, 4)) + 1}`
}
