// Line glyphs for the Footprint's tiles (Claude Design "Footprint" module), one per stat,
// keyed like the stats (thinking-bball lib/footprint.js). Drawn on 28×28 (shown at `size`),
// in currentColor.
const Svg = ({ children, size }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" style={{ display: 'block' }} aria-hidden="true">{children}</svg>
)
const Hoop = () => <><line x1={4} y1={10} x2={24} y2={10} /><path d="M8 10 L10 20 L18 20 L20 10" /><line x1={9} y1={15} x2={19} y2={15} /></>
const Arc = () => <><line x1={3} y1={25} x2={25} y2={25} /><path d="M3 17 Q14 2 25 17" /></>
// The court's corner: sideline, baseline and the three-point line leaving its straight
// stretch, the corner three's pocket between them.
const Corner = () => <><path d="M4 3 L4 24 L25 24" /><path d="M11 24 L11 15 Q13 6 25 4" /></>
const Dot = ({ x, y, r }) => <circle cx={x} cy={y} r={r} fill="currentColor" />
const Cross = ({ x, y, s }) => <path d={`M${x - s} ${y - s} L${x + s} ${y + s} M${x + s} ${y - s} L${x - s} ${y + s}`} />
const Whistle = () => <><circle cx={11} cy={17} r={6} /><path d="M11 11 L25 11 L25 15.5 L16.5 15.5" /><Dot x={11} y={17} r={1.6} /></>
const Board = () => <><rect x={4} y={4} width={20} height={14} /><rect x={10} y={8} width={8} height={6} /></>

const GLYPHS = {
  // A scoreboard's line rising.
  ortg: <><rect x={3} y={5} width={22} height={17} /><path d="M7 18 L12 13 L15 15 L21 9" /><path d="M17 9 L21 9 L21 13" /></>,
  // A shot in the corner's pocket.
  cornerRate: <><Corner /><Dot x={7.5} y={19.5} r={2} /></>,
  // A padlock.
  tovPct: <><path d="M9 13 L9 9 A5 5 0 0 1 19 9 L19 13" /><rect x={5} y={13} width={18} height={12} /><Dot x={14} y={18} r={1.8} /><line x1={14} y1={19} x2={14} y2={22} /></>,
  orebPct: <><Board /><line x1={14} y1={18} x2={14} y2={24} /><path d="M11 21 L14 24 L17 21" /></>,
  pace: <><circle cx={14} cy={15} r={9} /><line x1={14} y1={15} x2={14} y2={9} /><line x1={14} y1={15} x2={19} y2={15} /><line x1={14} y1={3} x2={14} y2={6} /><line x1={11} y1={3} x2={17} y2={3} /></>,
  // A sight's crosshairs on a bullseye.
  tmTs: <><circle cx={14} cy={14} r={9.5} /><circle cx={14} cy={14} r={5} /><Dot x={14} y={14} r={1.5} /><path d="M14 1 L14 7 M14 21 L14 27 M1 14 L7 14 M21 14 L27 14" /></>,
  rimPts: <><Hoop /><Dot x={14} y={10} r={2.5} /><line x1={14} y1={3} x2={14} y2={7} /></>,
  tm3Rate: <><Arc /><Dot x={5} y={13} r={1.5} /><Dot x={14} y={6} r={1.5} /><Dot x={23} y={13} r={1.5} /></>,
  // The arc with a made shot's check.
  tm3Pct: <><Arc /><path d="M9 12 L13 16 L20 8" /></>,
  drtg: <><rect x={3} y={5} width={22} height={17} /><path d="M7 9 L12 14 L15 12 L21 18" /><path d="M17 18 L21 18 L21 14" /></>,
  oppRimPts: <><Hoop /><line x1={14} y1={2} x2={14} y2={9} /><line x1={8} y1={5} x2={20} y2={5} /></>,
  // The lane, walled off at its top.
  oppPaintPts: <><path d="M8 25 L8 11 L20 11 L20 25" /><path d="M8 18 Q14 23 20 18" /><line x1={6} y1={6} x2={22} y2={6} /><line x1={14} y1={2} x2={14} y2={6} /></>,
  // A floater lofted over a raised hand into the hoop.
  oppFloaterPts: <><line x1={17} y1={10} x2={25} y2={10} /><path d="M18 10 L19 15 L23 15 L24 10" /><path d="M3 24 Q7 1 21 8" strokeDasharray="2 2" /><line x1={9} y1={11} x2={9} y2={20} /><line x1={6} y1={13} x2={12} y2={13} /></>,
  // The corner's pocket crossed out.
  oppCorner3: <><Corner /><Cross x={7.5} y={19.5} s={2.2} /></>,
  // The whistle, crossed out.
  oppFtRate: <><Whistle /><Cross x={21.5} y={4.5} s={2.8} /></>,
  // A steal: a hand swiping at the ball, speed lines clear behind it. The hand is
  // solid (palm, four fingers, thumb, wrist), drawn upright and tilted toward the ball, so it
  // reads as a hand at the tile's size.
  forcedTov: <><circle cx={20} cy={8.2} r={5.6} /><path d="M14.4 8.2 H25.6 M20 2.6 V13.8 M16.1 4.2 Q18.1 8.2 16.1 12.2 M23.9 4.2 Q21.9 8.2 23.9 12.2" />
    <g transform="translate(8.8 19) rotate(40)" fill="currentColor" stroke="none">
      <rect x={-3.4} y={-1.2} width={6.8} height={6.2} rx={1.6} /><rect x={-3.4} y={-6.2} width={1.55} height={5.6} rx={0.75} />
      <rect x={-1.65} y={-6.9} width={1.55} height={6.3} rx={0.75} /><rect x={0.1} y={-6.5} width={1.55} height={5.9} rx={0.75} />
      <rect x={1.85} y={-5.4} width={1.55} height={4.8} rx={0.75} /><rect x={-2.5} y={4.4} width={5} height={6} rx={0.4} />
      <path d="M-2.6 2.6 L-5.4 -0.6" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </g><path d="M3.4 6.6 H7 M1.4 9.6 H7.4 M2.6 12.6 H6.2" strokeLinecap="round" /></>,
  drebPct: <><Board /><line x1={14} y1={24} x2={14} y2={18} /><path d="M11 21 L14 18 L17 21" /></>
}

export default function FootprintGlyph({ stat, size = 28 }) {
  return GLYPHS[stat] ? <Svg size={size}>{GLYPHS[stat]}</Svg> : null
}
