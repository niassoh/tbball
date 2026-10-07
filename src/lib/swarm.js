// The lineup tooltip's beeswarm: every qualified unit's net rating as a dot, packed
// into columns along the x axis and stacked out from the middle, so dense nets read as
// a wider band. Columns that would overflow the height squeeze their spacing instead.

// values: net ratings. Returns the x scale and a dot per value.
export const swarm = (values, { width, height, r = 1.6 }) => {
  const sorted = [...values].sort((a, b) => a - b)
  const at = q => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]
  // A symmetric domain around 0 that covers the middle 96%, in steps of 5; the few
  // beyond it sit on the edge.
  const reach = Math.max(5, Math.ceil(Math.max(Math.abs(at(0.02)), Math.abs(at(0.98))) / 5) * 5)
  const lo = -reach
  const hi = reach
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
  return { lo, hi, x, dots }
}

// Where a rank sits, as a share of the pool at or below it (1 = the best unit).
export const rankPct = (rank, of) => (of > 1 ? 1 - (rank - 1) / (of - 1) : 1)

// Blue for the better half, orange for the worse, strongest at the ends.
export const rankColor = pct => (pct >= 0.9 ? '#8fb0e6' : pct >= 0.5 ? '#6e8bbd' : pct >= 0.1 ? '#c98a4b' : '#fa962a')

// "TOP 2%" / "BOTTOM 6%": the smallest share of the pool, from its end, that holds it.
export const rankLabel = (rank, of) =>
  rank / of <= 0.5 ? `TOP ${Math.ceil((rank / of) * 100)}%` : `BOTTOM ${Math.ceil(((of - rank + 1) / of) * 100)}%`
