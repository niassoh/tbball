// The lineup tooltip's beeswarm: every qualified unit's net rating as a dot at its exact
// place along the x axis, pushed out from the middle just far enough not to overlap the
// dots beside it, so dense nets read as a wider band.

// values: net ratings; include: values the domain must hold (the marked unit).
// Returns the x scale, its gridline ticks and a dot per value, lowest first, each with
// its value's index in `values` (i).
export const swarm = (values, { width, height, r = 1.6, include = [] }) => {
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b])
  const sorted = order.map(i => values[i])
  // The domain holds every value (the tooltip names any dot, so none may sit off its
  // true place) and anything in `include`, rounded out to multiples of 5. Ticks every 5,
  // or every 10 over a wider span, so there are a few evenly spaced gridlines.
  const lo = Math.floor(Math.min(...sorted.slice(0, 1), ...include) / 5) * 5
  const hi = Math.max(lo + 5, Math.ceil(Math.max(...sorted.slice(-1), ...include) / 5) * 5)
  const tickStep = hi - lo > 30 ? 10 : 5
  const ticks = []
  for (let t = Math.ceil(lo / tickStep) * tickStep; t <= hi; t += tickStep) ticks.push(t)
  const x = v => r + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (width - 2 * r)
  const mid = height / 2
  // Lowest first, each dot tries slots out from the middle (alternating sides, `gap`
  // apart) and takes the first that overlaps no dot already placed within `gap` along x.
  const place = gap => {
    const dots = []
    let from = 0
    for (const i of order) {
      const px = x(values[i])
      while (from < dots.length && px - dots[from].x >= gap) from++
      const near = dots.slice(from)
      let k = 0
      for (let n = 1; near.some(d => (d.x - px) ** 2 + (d.y - (mid + k * gap)) ** 2 < gap * gap - 1e-9); n++) k = Math.ceil(n / 2) * (n % 2 ? -1 : 1)
      dots.push({ v: values[i], i, x: px, y: mid + k * gap })
    }
    return dots
  }
  // A crowd too wide for the height packs tighter (the dots overlap a little) until it fits.
  let gap = 2 * r + 0.3
  let dots = place(gap)
  while (gap > 0.01 && dots.some(d => Math.abs(d.y - mid) > mid - r)) dots = place((gap *= 0.85))
  return { lo, hi, ticks, x, dots }
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
