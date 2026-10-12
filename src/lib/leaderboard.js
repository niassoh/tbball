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

// The value a share `q` of the way up the values there are (linear between them).
export const quantile = (values, q) => {
  const s = values.filter(v => v !== null).sort((a, b) => a - b)
  if (!s.length) return null
  const i = (s.length - 1) * q
  const k = Math.floor(i)
  return k + 1 < s.length ? s[k] + (s[k + 1] - s[k]) * (i - k) : s[k]
}

// A scatter axis for a stat's values, its median at the middle: the lower half runs from
// the median down to the lowest value and the upper half up to the highest, each with a
// small margin, so every player is inside the frame and neither side is left empty. A
// stat that's never negative and whose top runs at least twice as far from the median
// as its bottom (drives, time of possession, attempts; judged on its 5th and 95th
// percentiles) goes on a square-root scale first, which evens its two sides, so neither
// half is stretched much past the other. `pos(v)` is where a value sits, 0–1, better up
// and right (a lower-is-better stat reversed); `lo` and `hi` are its ends, in the stat's
// own units.
export const axisOf = (values, lowerBetter = false) => {
  const vs = values.filter(v => v !== null)
  const mid = median(vs)
  const root = Math.min(...vs) >= 0 && quantile(vs, 0.95) - mid >= 2 * (mid - quantile(vs, 0.05))
  const f = v => (root ? Math.sqrt(Math.max(0, v)) : v)
  const back = t => (root ? Math.max(0, t) ** 2 : t)
  const m = f(mid)
  const reach = (m - f(Math.min(...vs))) * 1.06
  const top = (f(Math.max(...vs)) - m) * 1.06
  const down = reach || top || 1
  const up = top || reach || 1
  return {
    root,
    lo: back(m - down),
    hi: back(m + up),
    pos: v => {
      const t = f(v) <= m ? 0.5 - (0.5 * (m - f(v))) / down : 0.5 + (0.5 * (f(v) - m)) / up
      const c = Math.max(0, Math.min(1, t))
      return lowerBetter ? 1 - c : c
    }
  }
}
