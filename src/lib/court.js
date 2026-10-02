// Half-court zone geometry for the shot-profile map, in the design's SVG space:
// 500x320 viewBox, baseline at y=1, basket at (250, 52), 3pt arc radius 237.5,
// corner 3 lines at x=30 / x=470 down to y=141.5. 1 unit = 1/10 ft.
//
// The design's hard-coded zone paths were wrong (arcs ending off the 3pt
// circle, the rim drawn inside MID C, each paint half filling both halves), so
// every zone is built here from the geometry and tiles the court exactly.
// classify() uses the same dividers; thinking-bball/lib/zones.js must match it.

export const BASKET = { x: 250, y: 52 }
export const R3 = 237.5
const RIM_R = 50
const CORNER_X = 30
const CORNER_Y = 141.5
const PAINT_X = 170 // paint spans x 170..330
const FT_Y = 190 // free-throw line depth: short vs long midrange
const MID_C_Y = 250 // end of the centre midrange box
// Long-midrange wedge divider: from (170, 250) along (-60, 52) to the arc.
const WEDGE_DIR = { x: -60, y: 52 }
// Wing/top 3 divider: from where the wedge meets the arc, along (-109, 17).
const WING_DIR = { x: -109, y: 17 }

const hypot = Math.hypot
const angleOf = p => Math.atan2(p.y - BASKET.y, p.x - BASKET.x)
const onArc = a => ({ x: BASKET.x + R3 * Math.cos(a), y: BASKET.y + R3 * Math.sin(a) })
const mirror = p => ({ x: 500 - p.x, y: p.y })

// Where a ray from `from` along `dir` meets the 3pt circle.
const rayToArc = (from, dir) => {
  const fx = from.x - BASKET.x
  const fy = from.y - BASKET.y
  const a = dir.x ** 2 + dir.y ** 2
  const b = 2 * (fx * dir.x + fy * dir.y)
  const c = fx ** 2 + fy ** 2 - R3 ** 2
  const t = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)
  return { x: from.x + t * dir.x, y: from.y + t * dir.y }
}

const A = { x: CORNER_X, y: CORNER_Y } // corner line meets the arc
const B = { x: BASKET.x - Math.sqrt(R3 ** 2 - (FT_Y - BASKET.y) ** 2), y: FT_Y } // FT depth meets the arc
export const P = rayToArc({ x: PAINT_X, y: MID_C_Y }, WEDGE_DIR) // wedge meets the arc (left)
const Q = { x: 1, y: P.y + ((P.x - 1) * WING_DIR.y) / -WING_DIR.x } // wing/top divider at the sideline

// Points along the arc from p to q (both on the circle), shorter way round.
const arc = (p, q, steps = 24) => {
  const a0 = angleOf(p)
  const a1 = angleOf(q)
  return Array.from({ length: steps + 1 }, (_, i) => onArc(a0 + ((a1 - a0) * i) / steps))
}
const circle = (c, r, steps = 48) =>
  Array.from({ length: steps }, (_, i) => ({ x: c.x + r * Math.cos((2 * Math.PI * i) / steps), y: c.y + r * Math.sin((2 * Math.PI * i) / steps) }))
const halfDisc = (side, steps = 24) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = Math.PI / 2 + (side === 'l' ? 1 : -1) * ((Math.PI * i) / steps)
    return { x: BASKET.x + RIM_R * Math.cos(a), y: BASKET.y + RIM_R * Math.sin(a) }
  })

// Left-side polygons; right side is the mirror image.
const LEFT = {
  c3: [{ x: 1, y: 1 }, { x: CORNER_X, y: 1 }, A, { x: 1, y: CORNER_Y }],
  mid_short: [{ x: CORNER_X, y: 1 }, { x: PAINT_X, y: 1 }, { x: PAINT_X, y: FT_Y }, ...arc(B, A)],
  mid_long: [{ x: PAINT_X, y: FT_Y }, { x: PAINT_X, y: MID_C_Y }, ...arc(P, B)],
  wing3: [{ x: 1, y: CORNER_Y }, ...arc(A, P), Q],
  // paint half minus the rim half-disc (evenodd)
  paint: [[{ x: PAINT_X, y: 1 }, { x: 250, y: 1 }, { x: 250, y: FT_Y }, { x: PAINT_X, y: FT_Y }], halfDisc('l')]
}

const Pm = mirror(P)
const Qm = mirror(Q)
// [id, rings, labelX, labelY, name, shot value] — label positions from the design.
const SHAPES = [
  ['rim', [circle(BASKET, RIM_R)], 250, 52, 'RIM', 2],
  ['paint_l', LEFT.paint, 208, 150, 'PAINT L', 2],
  ['paint_r', LEFT.paint.map(ring => ring.map(mirror)), 292, 150, 'PAINT R', 2],
  ['mid_l_short', [LEFT.mid_short], 100, 100, 'MID L SHORT', 2],
  ['mid_r_short', [LEFT.mid_short.map(mirror)], 400, 100, 'MID R SHORT', 2],
  ['mid_c', [[{ x: PAINT_X, y: FT_Y }, { x: 330, y: FT_Y }, { x: 330, y: MID_C_Y }, { x: PAINT_X, y: MID_C_Y }]], 250, 222, 'MID C', 2],
  ['mid_l_long', [LEFT.mid_long], 108, 232, 'MID L LONG', 2],
  ['mid_r_long', [LEFT.mid_long.map(mirror)], 392, 232, 'MID R LONG', 2],
  ['mid_c_long', [[{ x: PAINT_X, y: MID_C_Y }, { x: 330, y: MID_C_Y }, ...arc(Pm, P)]], 250, 268, 'MID C LONG', 2],
  ['c3_l', [LEFT.c3], 16, 72, 'CORNER 3 L', 3],
  ['c3_r', [LEFT.c3.map(mirror)], 484, 72, 'CORNER 3 R', 3],
  ['wing3_l', [LEFT.wing3], 30, 262, 'WING 3 L', 3],
  ['wing3_r', [LEFT.wing3.map(mirror)], 470, 262, 'WING 3 R', 3],
  ['top3', [[...arc(P, Pm), Qm, { x: 499, y: 319 }, { x: 1, y: 319 }, Q]], 250, 312, 'TOP 3', 3]
]

// Zone divider lines drawn over the court (the court outline is drawn separately).
const seg = (a, b) => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
export const DIVIDERS = [
  seg({ x: 250, y: 1 }, { x: 250, y: FT_Y }),
  seg(B, { x: PAINT_X, y: FT_Y }),
  seg(mirror(B), { x: 330, y: FT_Y }),
  seg({ x: PAINT_X, y: MID_C_Y }, { x: 330, y: MID_C_Y }),
  seg({ x: PAINT_X, y: MID_C_Y }, P),
  seg({ x: 330, y: MID_C_Y }, Pm),
  seg(P, Q),
  seg(Pm, Qm)
]

const toPath = rings =>
  rings.map(ring => 'M' + ring.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L') + ' Z').join(' ')

export const ZONES = SHAPES.map(([id, rings, lx, ly, name, points]) => ({ id, rings, d: toPath(rings), lx, ly, name, points }))

// Even-odd point-in-polygon over all rings (matches fill-rule="evenodd").
export const contains = (rings, x, y) => {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]
      const b = ring[j]
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
    }
  }
  return inside
}

// Same rules as thinking-bball/lib/zones.js, in SVG coordinates.
export const isThree = (X, Y) => (Y <= CORNER_Y ? X < CORNER_X || X > 500 - CORNER_X : hypot(X - BASKET.x, Y - BASKET.y) > R3)

export const classify = (X, Y, shotValue) => {
  const left = X < 250
  const mx = left ? X : 500 - X
  if (shotValue === 3) {
    if (Y <= CORNER_Y) return left ? 'c3_l' : 'c3_r'
    const top = mx >= P.x || Y > P.y + ((P.x - mx) * WING_DIR.y) / -WING_DIR.x
    return top ? 'top3' : left ? 'wing3_l' : 'wing3_r'
  }
  if (hypot(X - BASKET.x, Y - BASKET.y) <= RIM_R) return 'rim'
  if (Y <= FT_Y) return mx >= PAINT_X ? (left ? 'paint_l' : 'paint_r') : left ? 'mid_l_short' : 'mid_r_short'
  if (Y <= MID_C_Y && mx >= PAINT_X) return 'mid_c'
  const wedgeX = PAINT_X + ((Y - MID_C_Y) * WEDGE_DIR.x) / WEDGE_DIR.y
  if (Y > MID_C_Y && mx >= wedgeX) return 'mid_c_long'
  return left ? 'mid_l_long' : 'mid_r_long'
}
