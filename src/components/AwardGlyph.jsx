// The trophy case's glyphs: one line drawing per award, on a 24 grid, in the Footprint
// glyphs' manner (one stroke weight, square ends, no fills but where a shape needs one),
// each shaped so it reads as its award: the title the Larry O'Brien trophy (a ball on a
// tapering cup), Finals MVP a two-handled cup with a star, MVP a crown, Defensive Player a
// shield, Rookie a sprout, Sixth Man a jersey numbered 6, Most Improved rising bars and an
// arrow, Clutch a stopwatch, All-Star a star.
import { MONO } from '../lib/format.js'

const Svg = ({ children, size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="square" strokeLinejoin="miter" style={{ display: 'block' }} aria-hidden="true">{children}</svg>
)

const GLYPHS = {
  champion: <>
    <circle cx={12} cy={4.6} r={3.1} />
    <path d="M9.2 3.4 C11 4.6 13 4.6 14.8 3.4 M12 1.5 V7.7" />
    <path d="M7.6 8.6 H16.4 L14 17.2 H10 Z" />
    <path d="M8.6 11.6 H15.4 M9.4 14.4 H14.6" />
    <path d="M8.5 19.4 H15.5 V22 H8.5 Z" />
  </>,
  fmvp: <>
    <path d="M6.5 3.5 H17.5 V9.5 C17.5 13 15 15 12 15 C9 15 6.5 13 6.5 9.5 Z" />
    <path d="M6.5 5.5 H3.5 V7.5 C3.5 9.5 5 10.5 6.8 10.5 M17.5 5.5 H20.5 V7.5 C20.5 9.5 19 10.5 17.2 10.5" />
    <path d="M12 15 V18.5 M8 21.5 H16 V18.5 H8 Z" />
    <path d="M12 5.6 L12.9 7.6 L15 7.8 L13.4 9.2 L13.9 11.2 L12 10.1 L10.1 11.2 L10.6 9.2 L9 7.8 L11.1 7.6 Z" fill="currentColor" stroke="none" />
  </>,
  mvp: <>
    <path d="M3.5 18 L2.8 7 L8 11.5 L12 4.5 L16 11.5 L21.2 7 L20.5 18 Z" />
    <path d="M3.5 21 H20.5" />
    <circle cx={12} cy={14.5} r={1.2} fill="currentColor" stroke="none" />
  </>,
  dpoy: <>
    <path d="M12 2.5 L20 5.5 V11.5 C20 16.5 16.5 19.8 12 21.5 C7.5 19.8 4 16.5 4 11.5 V5.5 Z" />
    <path d="M12 6 V18 M7.5 10.5 H16.5" />
  </>,
  roy: <>
    <path d="M12 21.5 V10.5" />
    <path d="M12 13.5 C12 9 9 6.5 4.5 6.8 C4.6 11 7.5 13.6 12 13.5 Z" />
    <path d="M12 10.5 C12 6.4 14.6 3.6 19.5 3.6 C19.5 7.8 16.7 10.6 12 10.5 Z" />
    <path d="M7.5 21.5 H16.5" />
  </>,
  smoy: <>
    <path d="M8.5 2.5 C9.3 4.2 10.5 5 12 5 C13.5 5 14.7 4.2 15.5 2.5 L20.5 5 L19 10 L17 9.4 V21.5 H7 V9.4 L5 10 L3.5 5 Z" />
    <text x={12} y={17.6} textAnchor="middle" fontFamily={MONO} fontSize={9} fontWeight={700} fill="currentColor" stroke="none">6</text>
  </>,
  mip: <>
    <path d="M3.5 21.5 H20.5" />
    <path d="M5 21.5 V16.5 H8.5 V21.5 M10.5 21.5 V13 H14 V21.5 M16 21.5 V9 H19.5 V21.5" />
    <path d="M4 11.5 L11 5 L13.5 7.5 L19.5 2.5 M15.8 2.5 H19.5 V6.2" />
  </>,
  clutch: <>
    <circle cx={12} cy={13.5} r={8} />
    <path d="M10 2.5 H14 M12 2.5 V5.5 M18.4 6.6 L19.8 5.2" />
    <path d="M12 13.5 V8.5 M12 13.5 L15.2 15.4" />
  </>,
  allstar: <>
    <path d="M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 13.9 L17.9 20.5 L12 17.2 L6.1 20.5 L7.4 13.9 L2.5 9.4 L9.1 8.6 Z" />
  </>
}

export default function AwardGlyph({ award, size = 24 }) {
  return GLYPHS[award] ? <Svg size={size}>{GLYPHS[award]}</Svg> : null
}
