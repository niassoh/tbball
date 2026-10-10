// Line glyphs for the Footprint's tiles (Claude Design "Footprint" module), named for the
// stat each was drawn for; Footprint.jsx maps tiles to them. 28×28, drawn in currentColor.
const Svg = ({ children }) => (
  <svg viewBox="0 0 28 28" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" style={{ display: 'block' }} aria-hidden="true">{children}</svg>
)
const Hoop = () => <><line x1={4} y1={10} x2={24} y2={10} /><path d="M8 10 L10 20 L18 20 L20 10" /><line x1={9} y1={15} x2={19} y2={15} /></>
const Arc = () => <><line x1={3} y1={25} x2={25} y2={25} /><path d="M3 17 Q14 2 25 17" /></>
const Ball = ({ x, y, r }) => <><circle cx={x} cy={y} r={r} /><line x1={x - r} y1={y} x2={x + r} y2={y} /><line x1={x} y1={y - r} x2={x} y2={y + r} /></>
const Dot = ({ x, y, r }) => <circle cx={x} cy={y} r={r} fill="currentColor" />
const Whistle = () => <><circle cx={8} cy={14} r={4} /><circle cx={20} cy={14} r={4} /><line x1={12} y1={14} x2={16} y2={14} /><line x1={14} y1={10} x2={14} y2={18} /></>
const Board = () => <><rect x={4} y={4} width={20} height={14} /><rect x={10} y={8} width={8} height={6} /></>

const GLYPHS = {
  efg: <><Hoop /><Dot x={14} y={5} r={2.5} /></>,
  threeRate: <><Arc /><Dot x={5} y={13} r={1.5} /><Dot x={14} y={6} r={1.5} /><Dot x={23} y={13} r={1.5} /></>,
  cornerRate: <><Arc /><line x1={3} y1={17} x2={3} y2={25} /><line x1={25} y1={17} x2={25} y2={25} /><Dot x={3} y={21} r={1.8} /><Dot x={25} y={21} r={1.8} /></>,
  ftRate: <Whistle />,
  tovPct: <><circle cx={14} cy={14} r={7} /><line x1={14} y1={14} x2={14} y2={9} /><line x1={14} y1={14} x2={18} y2={14} /><circle cx={14} cy={14} r={10} /></>,
  orebPct: <><Board /><line x1={14} y1={18} x2={14} y2={24} /><path d="M11 21 L14 24 L17 21" /></>,
  astPct: <><circle cx={6} cy={20} r={2.5} /><circle cx={22} cy={20} r={2.5} /><circle cx={14} cy={7} r={2.5} /><line x1={8} y1={18} x2={12} y2={9} /><line x1={16} y1={9} x2={20} y2={18} /><line x1={9} y1={20} x2={19} y2={20} /></>,
  oppEfg: <path d="M14 3 L24 7 V14 Q24 22 14 26 Q4 22 4 14 V7 Z" />,
  oppFtRate: <><Whistle /><line x1={6} y1={4} x2={22} y2={24} /></>,
  forcedTov: <><Ball x={14} y={14} r={7} /><path d="M14 3 A11 11 0 0 1 25 14" /><path d="M22 11 L25 14 L28 11" /></>,
  drebPct: <><Board /><line x1={14} y1={24} x2={14} y2={18} /><path d="M11 21 L14 18 L17 21" /></>,
}

export default function FootprintGlyph({ stat }) {
  return GLYPHS[stat] ? <Svg>{GLYPHS[stat]}</Svg> : null
}
