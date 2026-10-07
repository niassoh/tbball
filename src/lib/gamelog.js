// The bio card's game-log summary: averages over the shown games. TS% is total points
// over total shooting attempts (each game's attempts from the API, or recovered from
// its points and TS% for logs pulled before attempts were saved).
const attempts = g => (g.tsa !== undefined ? g.tsa : g.ts > 0 ? g.pts / (2 * (g.ts / 100)) : null)

export const recentLine = games => {
  if (!games.length) return null
  const sum = f => games.reduce((a, g) => a + f(g), 0)
  const n = games.length
  const shooting = games.filter(g => attempts(g) !== null)
  const pts = shooting.reduce((a, g) => a + g.pts, 0)
  const att = shooting.reduce((a, g) => a + attempts(g), 0)
  return {
    n,
    pts: sum(g => g.pts) / n,
    reb: sum(g => g.reb) / n,
    ast: sum(g => g.ast) / n,
    ts: att ? (pts / (2 * att)) * 100 : null
  }
}
