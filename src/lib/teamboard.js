// The Team board's chart (thinking-bball lib/teamboard.js documents): ORTG across and DRTG
// up, a lower DRTG higher (better up and right), both on one scale, so a point of rating is
// the same length either way and a net rating's line (ORTG − DRTG constant) runs at 45°.

// The ratings' frame: every team inside with `pad` points to spare, centred on the league's
// average, both axes as long as the longer one needs. [lo, hi] each, in rating points.
export const frameOf = (xs, ys, league, pad = 1.5) => {
  const reach = vals => Math.max(...vals.map(v => Math.abs(v - league)))
  const half = Math.max(reach(xs), reach(ys)) + pad
  return { x: [league - half, league + half], y: [league - half, league + half] }
}

// The net-rating lines crossing the frame, every `step` points: each [k, [o0, d0], [o1, d1]],
// the ends where ORTG − DRTG = k meets the frame's edges.
export const netLines = (frame, step = 5) => {
  const [x0, x1] = frame.x
  const [y0, y1] = frame.y
  const out = []
  for (let k = Math.ceil((x0 - y1) / step) * step; k <= Math.floor((x1 - y0) / step) * step; k += step) {
    const a = Math.max(x0, y0 + k)
    const b = Math.min(x1, y1 + k)
    if (b > a) out.push([k, [a, a - k], [b, b - k]])
  }
  return out
}

// A team's place in a stat among the 30, best first (1), a lower-is-better stat by its
// lowest; null without a value.
export const placeOf = (doc, team, label) => {
  const k = doc.labels.indexOf(label)
  const v = team.v[k]
  if (v === null || v === undefined) return null
  const low = doc.stats[label].lowerBetter
  return 1 + doc.teams.filter(t => t.v[k] !== null && (low ? t.v[k] < v : t.v[k] > v)).length
}

// Whether another team has the same value: a shared place reads "T-4th".
export const tiedOf = (doc, team, label) => {
  const k = doc.labels.indexOf(label)
  const v = team.v[k]
  return v !== null && v !== undefined && doc.teams.some(t => t !== team && t.v[k] === v)
}
