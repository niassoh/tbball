// Shot-map geometry in the design's SVG space: 500x320 viewBox, baseline at
// y=1, basket at (250, 52), 3pt arc radius 237.5, corner 3 lines at x=30 /
// x=470 down to y=141.5. 1 unit = 1/10 ft.
//
// Shots are grouped into distance bands around the basket, drawn as arcs. The
// band edges must match thinking-bball/lib/zones.js (rim 6 ft, short mid 14 ft).

export const BASKET = { x: 250, y: 52 }
export const R3 = 237.5
const CORNER_X = 30
const CORNER_Y = 141.5
export const RIM_R = 60
export const SHORT_MID_R = 140
const THREE_OUTER_R = 285 // how far beyond the arc the 3pt band is drawn

export const THREE_LINE = `M${CORNER_X} 1 L${CORNER_X} ${CORNER_Y} A${R3} ${R3} 0 0 0 ${500 - CORNER_X} ${CORNER_Y} L${500 - CORNER_X} 1`
// Everything inside the 3pt line (used to clip long midrange and cut out threes).
export const INSIDE_THREE = `${THREE_LINE} Z`

const disc = r => `M${BASKET.x - r} ${BASKET.y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`

// d is drawn with fill-rule evenodd; clip marks bands cut to inside the 3pt line.
export const BANDS = [
  { id: 'rim', name: 'RIM', d: disc(RIM_R), clip: false, lx: 250, ly: 86, points: 2 },
  { id: 'short_mid', name: 'SHORT MID', d: `${disc(SHORT_MID_R)} ${disc(RIM_R)}`, clip: false, lx: 250, ly: 152, points: 2 },
  { id: 'long_mid', name: 'LONG MID', d: `${disc(THREE_OUTER_R)} ${disc(SHORT_MID_R)}`, clip: true, lx: 250, ly: 241, points: 2 },
  { id: 'three', name: '3PT', d: `${disc(THREE_OUTER_R)} ${INSIDE_THREE}`, clip: false, lx: 250, ly: 304, points: 3 }
]

export const isThree = (X, Y) => (Y <= CORNER_Y ? X < CORNER_X || X > 500 - CORNER_X : Math.hypot(X - BASKET.x, Y - BASKET.y) > R3)

// Same rules as thinking-bball/lib/zones.js, in SVG coordinates.
export const classify = (X, Y, shotValue) => {
  if (shotValue === 3) return 'three'
  const r = Math.hypot(X - BASKET.x, Y - BASKET.y)
  if (r <= RIM_R) return 'rim'
  return r <= SHORT_MID_R ? 'short_mid' : 'long_mid'
}
