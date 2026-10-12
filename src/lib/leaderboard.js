// The Leaderboard page's helpers. A season's document (thinking-bball lib/leaderboard.js)
// lists its stats once (`labels`, with each stat's display rules in `stats`) and gives
// each player his values (`v`) and percentiles (`p`) in that order.

// A player's value and percentile in a stat.
export const valueOf = (doc, player, label) => player.v[doc.labels.indexOf(label)] ?? null
export const pctlOf = (doc, player, label) => player.p[doc.labels.indexOf(label)] ?? null

// Players best first in a stat (lowest first where lower is better), or the reverse;
// those without a value last either way.
export const ranked = (doc, players, label, reverse = false) => {
  const i = doc.labels.indexOf(label)
  const sign = (doc.stats[label].lowerBetter ? 1 : -1) * (reverse ? -1 : 1)
  return [...players].sort((a, b) => {
    const x = a.v[i]
    const y = b.v[i]
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    return sign * (x - y)
  })
}

export const median = values => {
  const s = values.filter(v => v !== null).sort((a, b) => a - b)
  if (!s.length) return null
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Where a player sits against the medians, each axis read the way its stat is good:
// 'both' (better in both), 'neither', or 'split'. On a median counts as better.
export const quadrantOf = (x, y, mx, my, xLow, yLow) => {
  const good = (v, m, low) => (low ? v <= m : v >= m)
  const a = good(x, mx, xLow)
  const b = good(y, my, yLow)
  return a && b ? 'both' : !a && !b ? 'neither' : 'split'
}

// A dot's radius by minutes, its area in proportion: `lo` px for the fewest (`least`), `hi`
// for the most.
export const radiusOf = (minutes, most, lo = 3, hi = 11, least = 0) => lo + (hi - lo) * Math.sqrt(Math.max(0, minutes - least) / ((most - least) || 1))

// Where a value sits on an axis from lo to hi, 0–1 (lower-is-better stats run reversed,
// so better is always up and right), clamped.
export const along = (v, lo, hi, low) => {
  const t = hi > lo ? (v - lo) / (hi - lo) : 0.5
  return Math.max(0, Math.min(1, low ? 1 - t : t))
}
