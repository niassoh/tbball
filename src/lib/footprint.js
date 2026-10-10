// The Footprint tab's helpers: how to read each tile of the profile's `footprint`
// (thinking-bball lib/footprint.js, built by analysis/footprint): points per 100
// possessions, adjusted for everyone else on the floor.

// A lift (his team is better for it) or a cost.
export const toneOf = t => (t.pts >= 0 ? 'good' : 'bad')

// How strong a lit tile is, 0–1: how far its z clears the 2.5 bar, full at 7.
const clamp01 = v => Math.max(0, Math.min(1, v))
export const strengthOf = t => clamp01((Math.abs(t.z) - 2.5) / 4.5)

// A lit tile's color at its strength: the weakest is mostly grey, the strongest the full color.
export const shade = (color, strength) => `color-mix(in srgb, ${color} ${Math.round(40 + 60 * strength)}%, #5a5550)`

// The tile's bar: from 0 to its points, on a ±max scale (left/width in percent).
export const bar = (pts, max = 3) => {
  const v = Math.max(-max, Math.min(max, pts))
  const half = (Math.abs(v) / max) * 50
  return { left: v >= 0 ? 50 : 50 - half, width: half }
}

// "2024–25 and 2025–26"
export const seasonsText = seasons => seasons.map(s => s.replace('-', '–')).join(' and ')

// The calendar years the seasons cover: "2024–2026" for 2024-25 and 2025-26.
export const yearsText = seasons => {
  const sorted = [...seasons].sort()
  return `${sorted[0].slice(0, 4)}–${Number(sorted[sorted.length - 1].slice(0, 4)) + 1}`
}

// A tile's stat change: per-shot values carry two decimals, rates one.
export const changeText = t => {
  const d = Math.abs(t.change) < 0.1 ? 3 : 1
  return `${t.change >= 0 ? '+' : '−'}${Math.abs(t.change).toFixed(d)}`
}

// The context breakdown of a lit tile, as rows: raw on/off = his own + the teammates who
// explain the rest + opponents and schedule + what's left (all in points per 100).
export const contextRows = c => [
  { label: 'Raw on/off', v: c.raw, strong: true },
  { label: 'His own (adjusted)', v: c.own },
  ...c.top.map(m => ({ label: m.name, mate: m, v: m.v })),
  { label: 'Other teammates', v: c.others },
  { label: 'Opponents & schedule', v: c.opponents + c.schedule },
  { label: 'Unexplained', v: c.rest }
]
