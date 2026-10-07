// The season chart's hover histogram: a season's league values in equal-width bins,
// oriented so better is always to the right (flipped for lower-is-better stats).

// values: the season's pool, sorted ascending.
export const histogram = (values, lowerBetter, bins = 24) => {
  const lo = values[0]
  const hi = values[values.length - 1]
  const span = hi - lo || 1
  // 0 at the worst end, 1 at the best.
  const pos = v => {
    const t = Math.max(0, Math.min(1, (v - lo) / span))
    return lowerBetter ? 1 - t : t
  }
  const counts = Array(bins).fill(0)
  for (const v of values) counts[Math.min(bins - 1, Math.floor(pos(v) * bins))]++
  const tallest = Math.max(...counts)
  // Each bar's percentile: the share of the pool worse than its middle.
  let worse = 0
  const bars = counts.map(count => {
    const pct = Math.round(((worse + count / 2) / values.length) * 100)
    worse += count
    return { count, height: count / tallest, pct }
  })
  return { bars, pos, worst: lowerBetter ? hi : lo, best: lowerBetter ? lo : hi, bin: v => Math.min(bins - 1, Math.floor(pos(v) * bins)) }
}
