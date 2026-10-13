// Line glyphs for the Footprint's tiles (Claude Design "Footprint" module), one per stat,
// keyed like the stats (thinking-bball lib/footprint.js). Drawn on 28×28 (shown at `size`),
// in currentColor.
const Svg = ({ children, size }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" style={{ display: 'block' }} aria-hidden="true">{children}</svg>
)
const Hoop = () => <><line x1={4} y1={10} x2={24} y2={10} /><path d="M8 10 L10 20 L18 20 L20 10" /><line x1={9} y1={15} x2={19} y2={15} /></>
const Arc = () => <><line x1={3} y1={25} x2={25} y2={25} /><path d="M3 17 Q14 2 25 17" /></>
const Corners = () => <><line x1={3} y1={17} x2={3} y2={25} /><line x1={25} y1={17} x2={25} y2={25} /></>
const Ball = ({ x, y, r }) => <><circle cx={x} cy={y} r={r} /><line x1={x - r} y1={y} x2={x + r} y2={y} /><line x1={x} y1={y - r} x2={x} y2={y + r} /></>
const Dot = ({ x, y, r }) => <circle cx={x} cy={y} r={r} fill="currentColor" />
const Whistle = () => <><circle cx={8} cy={14} r={4} /><circle cx={20} cy={14} r={4} /><line x1={12} y1={14} x2={16} y2={14} /><line x1={14} y1={10} x2={14} y2={18} /></>
const Board = () => <><rect x={4} y={4} width={20} height={14} /><rect x={10} y={8} width={8} height={6} /></>

const GLYPHS = {
  // A scoreboard's line rising.
  ortg: <><rect x={3} y={5} width={22} height={17} /><path d="M7 18 L12 13 L15 15 L21 9" /><path d="M17 9 L21 9 L21 13" /></>,
  cornerRate: <><Arc /><Corners /><Dot x={3} y={21} r={1.8} /><Dot x={25} y={21} r={1.8} /></>,
  tovPct: <><circle cx={14} cy={14} r={7} /><line x1={14} y1={14} x2={14} y2={9} /><line x1={14} y1={14} x2={18} y2={14} /><circle cx={14} cy={14} r={10} /></>,
  orebPct: <><Board /><line x1={14} y1={18} x2={14} y2={24} /><path d="M11 21 L14 24 L17 21" /></>,
  pace: <><circle cx={14} cy={15} r={9} /><line x1={14} y1={15} x2={14} y2={9} /><line x1={14} y1={15} x2={19} y2={15} /><line x1={14} y1={3} x2={14} y2={6} /><line x1={11} y1={3} x2={17} y2={3} /></>,
  tmTs: <><Hoop /><Dot x={14} y={5} r={2.5} /></>,
  rimPts: <><Hoop /><Dot x={14} y={10} r={2.5} /><line x1={14} y1={3} x2={14} y2={7} /></>,
  tm3Rate: <><Arc /><Dot x={5} y={13} r={1.5} /><Dot x={14} y={6} r={1.5} /><Dot x={23} y={13} r={1.5} /></>,
  // The arc with a made shot's check.
  tm3Pct: <><Arc /><path d="M9 12 L13 16 L20 8" /></>,
  oppRimPts: <><Hoop /><line x1={14} y1={2} x2={14} y2={9} /><line x1={8} y1={5} x2={20} y2={5} /></>,
  // The lane, walled off at its top.
  oppPaintPts: <><path d="M8 25 L8 11 L20 11 L20 25" /><path d="M8 18 Q14 23 20 18" /><line x1={6} y1={6} x2={22} y2={6} /><line x1={14} y1={2} x2={14} y2={6} /></>,
  oppCorner3: <><Arc /><Corners /><path d="M10 9 L18 17 M18 9 L10 17" /></>,
  oppFtRate: <><Whistle /><line x1={6} y1={4} x2={22} y2={24} /></>,
  forcedTov: <><Ball x={14} y={14} r={7} /><path d="M14 3 A11 11 0 0 1 25 14" /><path d="M22 11 L25 14 L28 11" /></>,
  drebPct: <><Board /><line x1={14} y1={24} x2={14} y2={18} /><path d="M11 21 L14 18 L17 21" /></>
}

export default function FootprintGlyph({ stat, size = 28 }) {
  return GLYPHS[stat] ? <Svg size={size}>{GLYPHS[stat]}</Svg> : null
}
