// Shot-map geometry in SVG space: 500 wide x COURT_H deep (36 ft), baseline at
// y=1, basket at (250, 52), 3pt arc radius 237.5, corner 3 lines at x=30 /
// x=470 down to y=141.5. 1 unit = 1/10 ft.
//
// Shots are grouped into distance bands around the basket. Each band edge is
// shaped like the 3pt line: an arc in front of the basket and straight sides back
// to the baseline. Must match thinking-bball/lib/zones.js (rim 6 ft, short mid 14 ft).

export const BASKET = { x: 250, y: 52 }
export const R3 = 237.5
const CORNER_X = 30
const CORNER_Y = 141.5
export const RIM_R = 60
export const SHORT_MID_R = 140
export const COURT_H = 360

export const THREE_LINE = `M${CORNER_X} 1 L${CORNER_X} ${CORNER_Y} A${R3} ${R3} 0 0 0 ${500 - CORNER_X} ${CORNER_Y} L${500 - CORNER_X} 1`
// Everything inside the 3pt line (used to clip long midrange and cut out threes).
export const INSIDE_THREE = `${THREE_LINE} Z`

// A band edge, 3pt-line style: straight sides from the baseline to basket level,
// then a half circle in front of the basket. Closed, it is the area within r.
const edge = r => `M${BASKET.x - r} 1 L${BASKET.x - r} ${BASKET.y} A${r} ${r} 0 0 0 ${BASKET.x + r} ${BASKET.y} L${BASKET.x + r} 1`
const arch = r => `${edge(r)} Z`
// Drawn over the bands with the 3pt line, so every band border looks the same.
export const BAND_EDGES = [edge(RIM_R), edge(SHORT_MID_R)]

const COURT = `M1 1 H499 V${COURT_H - 1} H1 Z`

// Order matches thinking-bball/lib/zones.js ZONES, which the shot list's band index uses.
// d is drawn with fill-rule evenodd; clip marks bands cut to inside the 3pt line.
// lx/ly place each band's value on the centre line, where no court line runs.
// Neighbouring bands meet; the edge lines drawn over them (BAND_EDGES and the
// 3pt line) separate them.
export const BANDS = [
  { id: 'rim', name: 'RIM', lx: 250, ly: 88, d: arch(RIM_R), clip: false, points: 2 },
  { id: 'short_mid', name: 'SHORT MID', lx: 250, ly: 152, d: `${arch(SHORT_MID_R)} ${arch(RIM_R)}`, clip: false, points: 2 },
  { id: 'long_mid', name: 'LONG MID', lx: 250, ly: 245, d: `${COURT} ${arch(SHORT_MID_R)}`, clip: true, points: 2 },
  { id: 'three', name: '3PT', lx: 250, ly: 322, d: `${COURT} ${INSIDE_THREE}`, clip: false, points: 3 }
]

export const isThree = (X, Y) => (Y <= CORNER_Y ? X < CORNER_X || X > 500 - CORNER_X : Math.hypot(X - BASKET.x, Y - BASKET.y) > R3)

// Same rules as thinking-bball/lib/zones.js, in SVG coordinates.
export const classify = (X, Y, shotValue) => {
  if (shotValue === 3) return 'three'
  const r = Y < BASKET.y ? Math.abs(X - BASKET.x) : Math.hypot(X - BASKET.x, Y - BASKET.y)
  if (r <= RIM_R) return 'rim'
  return r <= SHORT_MID_R ? 'short_mid' : 'long_mid'
}
