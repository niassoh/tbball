// The lineup tooltip's beeswarm: every qualified unit's net rating as a dot, packed
// into columns along the x axis and stacked out from the middle, so dense nets read as
// a wider band. Columns that would overflow the height squeeze their spacing instead.

// values: net ratings; include: values the domain must hold (the marked unit).
// Returns the x scale, its gridline ticks and a dot per value.
export const swarm = (values, { width, height, r = 1.6, include = [] }) => {
  const sorted = [...values].sort((a, b) => a - b)
  const at = q => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]
  // The domain fits the data: the middle 96% plus anything in `include`, rounded out to
  // multiples of 5 (the few beyond it sit on the edge). Ticks every 5, or every 10 over a
  // wider span, so there are a few evenly spaced gridlines.
  const lo = Math.floor(Math.min(at(0.02), ...include) / 5) * 5
  const hi = Math.max(lo + 5, Math.ceil(Math.max(at(0.98), ...include) / 5) * 5)
  const tickStep = hi - lo > 30 ? 10 : 5
  const ticks = []
  for (let t = Math.ceil(lo / tickStep) * tickStep; t <= hi; t += tickStep) ticks.push(t)
  const x = v => r + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (width - 2 * r)
  const colW = 2 * r + 0.4
  const cols = Math.max(1, Math.floor(width / colW))
  const colOf = v => Math.round(((x(v) - r) / (width - 2 * r)) * (cols - 1))
  const byCol = new Map()
  for (const v of sorted) {
    const c = colOf(v)
    if (!byCol.has(c)) byCol.set(c, [])
    byCol.get(c).push(v)
  }
  const mid = height / 2
  const dots = []
  for (const [c, vs] of byCol) {
    const step = Math.min(2 * r + 0.3, (mid - r) / Math.max(1, Math.ceil((vs.length - 1) / 2)))
    vs.forEach((v, i) => {
      const k = Math.ceil(i / 2) * (i % 2 ? -1 : 1)
      dots.push({ v, x: r + (c / Math.max(1, cols - 1)) * (width - 2 * r), y: mid + k * step })
    })
  }
  // The net at an x position (the swarm's hover readout).
  const value = px => lo + ((Math.max(r, Math.min(width - r, px)) - r) / (width - 2 * r)) * (hi - lo)
  return { lo, hi, ticks, x, value, dots }
}

// Where a rank sits, as a share of the pool at or below it (1 = the best unit).
export const rankPct = (rank, of) => (of > 1 ? 1 - (rank - 1) / (of - 1) : 1)

// Blue for the better half, orange for the worse, strongest at the ends.
export const rankColor = pct => (pct >= 0.9 ? '#8fb0e6' : pct >= 0.5 ? '#6e8bbd' : pct >= 0.1 ? '#c98a4b' : '#fa962a')

// The swarm's dot colour: a soft, continuous fade by rank from muted orange (worst)
// through warm grey (middle) to muted blue (best), so the swarm reads as one painted
// shape rather than two blocks with a hard edge.
const WORST = [176, 120, 72]
const MIDDLE = [110, 104, 98]
const BEST = [110, 140, 190]
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
export const dotTint = pct => {
  const p = Math.max(0, Math.min(1, pct))
  const [r, g, b] = p < 0.5 ? mix(WORST, MIDDLE, p / 0.5) : mix(MIDDLE, BEST, (p - 0.5) / 0.5)
  return `rgb(${r},${g},${b})`
}

// Dot radius for a pool of n units: full size for a few hundred, smaller for more, so a
// large pool reads as texture instead of a solid slab.
export const dotRadius = n => Math.max(0.8, Math.min(1.5, 1.5 * Math.sqrt(300 / Math.max(1, n))))

// "TOP 2%" / "BOTTOM 6%": the smallest share of the pool, from its end, that holds it.
export const rankLabel = (rank, of) =>
  rank / of <= 0.5 ? `TOP ${Math.ceil((rank / of) * 100)}%` : `BOTTOM ${Math.ceil(((of - rank + 1) / of) * 100)}%`
