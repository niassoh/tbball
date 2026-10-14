// A trophy for the profile banner's case: a flat, solid silhouette in its metal (titles
// gold, the season's honours silver, All-Star ink), its details cut in as dark
// engraving, on a stem and pedestal, standing on a plain dark plinth (its name comes up on
// hover, TrophyCase). Each
// shaped so it reads as its award: the title the Larry O'Brien trophy (a ball on a
// tapering net), Finals MVP a two-handled cup with a star, MVP a crown, Defensive Player a
// shield, Rookie a medallion with a sprout, Sixth Man a jersey numbered 6, Most Improved
// an arrow climbing, Clutch a stopwatch, All-Star a star. Drawn on 32 × 34 (the plinth
// under it in type), shown at SIZE × `scale`.
import { MONO } from '../lib/format.js'

const GOLD = '#d4af37'
const GOLD_DARK = '#a8852a'
const SILVER = '#c9ced3'
const SILVER_DARK = '#8f969d'
const INK = '#ece8e3'
const CUT = '#2a2622'

// Stem and pedestal under every emblem.
const Stand = ({ light, dark }) => <>
  <rect x={14} y={24} width={4} height={4} fill={dark} />
  <rect x={11} y={27.5} width={10} height={1.6} fill={light} />
  <rect x={8.5} y={29} width={15} height={5} fill={dark} />
</>

const EMBLEMS = {
  champion: { label: 'Title', metal: [GOLD, GOLD_DARK], draw: <>
    <circle cx={16} cy={6.2} r={5.2} fill={GOLD} />
    <path d="M11.2 5.2 C13.8 7 18.2 7 20.8 5.2 M16 1.2 V11.2" stroke={GOLD_DARK} strokeWidth={0.8} fill="none" />
    <rect x={9.4} y={11.8} width={13.2} height={1.6} fill={GOLD_DARK} />
    <path d="M9.6 13.4 H22.4 L19.4 24 H12.6 Z" fill={GOLD} />
    <path d="M10.6 16.2 H21.4 M11.5 19.2 H20.5 M12.3 22 H19.7 M13.2 13.6 L15 23.8 M18.8 13.6 L17 23.8" stroke={GOLD_DARK} strokeWidth={0.7} fill="none" />
  </> },
  fmvp: { label: 'F-MVP', metal: [GOLD, GOLD_DARK], draw: <>
    <path d="M7.5 2.5 H24.5 V9 C24.5 15 20.8 18.6 16 18.6 C11.2 18.6 7.5 15 7.5 9 Z" fill={GOLD} />
    <path d="M7.6 4.8 C3.6 4.8 3.4 11.6 8.6 12.8 M24.4 4.8 C28.4 4.8 28.6 11.6 23.4 12.8" stroke={GOLD} strokeWidth={1.8} fill="none" />
    <path d="M16 5.6 L17.2 8.3 L20 8.5 L17.9 10.3 L18.6 13 L16 11.5 L13.4 13 L14.1 10.3 L12 8.5 L14.8 8.3 Z" fill={GOLD_DARK} />
    <rect x={14.4} y={18.4} width={3.2} height={5.6} fill={GOLD_DARK} />
  </> },
  mvp: { label: 'MVP', metal: [SILVER, SILVER_DARK], draw: <>
    <path d="M6 20.5 L5 7.5 L11 12.5 L16 3.5 L21 12.5 L27 7.5 L26 20.5 Z" fill={SILVER} />
    <rect x={6} y={20.5} width={20} height={3.5} fill={SILVER_DARK} />
    <circle cx={16} cy={15.5} r={1.6} fill={CUT} />
    <circle cx={10.5} cy={17} r={1} fill={CUT} />
    <circle cx={21.5} cy={17} r={1} fill={CUT} />
  </> },
  dpoy: { label: 'DPOY', metal: [SILVER, SILVER_DARK], draw: <>
    <path d="M16 2 L26 5.6 V12.6 C26 18.4 21.6 22.2 16 24 C10.4 22.2 6 18.4 6 12.6 V5.6 Z" fill={SILVER} />
    <path d="M16 5.5 V20.5 M10 11.5 H22" stroke={CUT} strokeWidth={1.2} fill="none" />
  </> },
  roy: { label: 'ROY', metal: [SILVER, SILVER_DARK], draw: <>
    <circle cx={16} cy={12.5} r={10} fill={SILVER} />
    <path d="M16 19 V11.5" stroke={CUT} strokeWidth={1.2} fill="none" />
    <path d="M16 14 C16 10.6 13.8 8.8 10.4 9 C10.5 12.2 12.6 14.1 16 14 Z M16 11.6 C16 8.4 18 6.3 21.6 6.3 C21.6 9.5 19.5 11.7 16 11.6 Z" fill={CUT} />
  </> },
  smoy: { label: '6MOY', metal: [SILVER, SILVER_DARK], draw: <>
    <path d="M11 2.5 C11.7 4.3 13.6 5.4 16 5.4 C18.4 5.4 20.3 4.3 21 2.5 L26.5 5.2 L25 10.5 L22.6 9.8 V24 H9.4 V9.8 L7 10.5 L5.5 5.2 Z" fill={SILVER} />
    <text x={16} y={20.4} textAnchor="middle" fontFamily={MONO} fontSize={10} fontWeight={700} fill={CUT}>6</text>
  </> },
  mip: { label: 'MIP', metal: [SILVER, SILVER_DARK], draw: <>
    <path d="M16 2 L25 11.5 H19.5 V24 H12.5 V11.5 H7 Z" fill={SILVER} />
    <path d="M14.5 21.5 H17.5 M14.5 18.5 H17.5 M14.5 15.5 H17.5" stroke={CUT} strokeWidth={1} fill="none" />
  </> },
  clutch: { label: 'Clutch', metal: [SILVER, SILVER_DARK], draw: <>
    <rect x={14} y={1.5} width={4} height={2.5} fill={SILVER_DARK} />
    <circle cx={16} cy={13.5} r={9.5} fill={SILVER} />
    <path d="M16 13.5 V7 M16 13.5 L20.2 16" stroke={CUT} strokeWidth={1.3} fill="none" />
    <circle cx={16} cy={13.5} r={1.2} fill={CUT} />
  </> },
  allstar: { label: 'All-Star', metal: [INK, '#a09a93'], draw: <>
    <path d="M16 1.5 L18.9 8.3 L26.2 8.9 L20.6 13.7 L22.3 20.8 L16 17 L9.7 20.8 L11.4 13.7 L5.8 8.9 L13.1 8.3 Z" fill={INK} />
    <rect x={15} y={19.5} width={2} height={4.5} fill="#a09a93" />
  </> }
}

// A trophy's size in the banner: its drawing at SIZE × 32 px, its plinth TROPHY_W wide.
const SIZE = 1.05
const TROPHY_W = 38 * SIZE

function Trophy({ award, scale: k = 1 }) {
  const e = EMBLEMS[award]
  if (!e) return null
  const [light, dark] = e.metal
  const scale = SIZE * k
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: TROPHY_W * k }}>
      <svg viewBox="0 0 32 34" width={32 * scale} height={34 * scale} style={{ display: 'block' }} aria-hidden="true">
        {e.draw}
        <Stand light={light} dark={dark} />
      </svg>
      <span style={{ width: TROPHY_W * k, height: 4 * scale, background: '#141312', borderTop: '1px solid #4a4642' }} />
    </span>
  )
}

// The bio card's trophy case, in its banner just left of his portrait: the awards he won
// in the season on show (`season`, from profile.awards, thinking-bball scripts/awards.js),
// each a trophy on its plinth (Trophy) standing on the banner's bottom edge, side by side;
// hovering one (or a tap, which focuses it) raises a tag over it with its name and the
// season (index.css .tc-tag). They keep their size while they fit in `room` (the banner
// between his name and his portrait, measured by the card), then shrink to fit, to
// MIN_SCALE, past which the last fold into a "+n". They rise into place in turn as each
// season comes in (index.css .tc-item). Nothing in a season he won none.
const AWARDS = [
  ['champion', 'NBA champion'],
  ['fmvp', 'Finals MVP'],
  ['mvp', 'Most Valuable Player'],
  ['dpoy', 'Defensive Player of the Year'],
  ['roy', 'Rookie of the Year'],
  ['smoy', 'Sixth Man of the Year'],
  ['mip', 'Most Improved Player'],
  ['clutch', 'Clutch Player of the Year'],
  ['allstar', 'All-Star']
]
const GAP = 6
const MIN_SCALE = 0.7

export default function TrophyCase({ awards, season, room, right }) {
  const items = AWARDS.filter(([k]) => awards && awards[k] && awards[k].includes(season))
  const width = n => n * TROPHY_W + (n - 1) * GAP
  let shown = items
  while (shown.length > 1 && width(shown.length) * MIN_SCALE > room) shown = shown.slice(0, -1)
  const scale = Math.min(1, Math.max(MIN_SCALE, room / width(shown.length)))
  if (!shown.length || width(1) * MIN_SCALE > room) return null
  const more = items.length - shown.length
  return (
    <div style={{ position: 'absolute', right, bottom: 3, display: 'flex', alignItems: 'flex-end', gap: GAP * scale, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' }}>
      {shown.map(([key, long], i) => {
        const tip = `${long} · ${season.replace('-', '–')}`
        return (
          <span key={key} className="tc-item" tabIndex={0} aria-label={tip} style={{ '--d': `${160 + i * 80}ms`, position: 'relative', display: 'flex', cursor: 'default', outline: 'none' }}>
            <Trophy award={key} scale={scale} />
            <span className="tc-tag" aria-hidden="true" style={{ position: 'absolute', left: '50%', bottom: 'calc(100% + 5px)', padding: '3px 6px', background: '#141312', border: '1px solid #4a4642', fontFamily: MONO, fontSize: 8, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#ece8e3', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              {EMBLEMS[key].label}<span style={{ color: '#a09a93', fontWeight: 400 }}> · {season.replace('-', '–')}</span>
            </span>
          </span>
        )
      })}
      {more > 0 && <span style={{ fontSize: 9, letterSpacing: '.06em', color: '#b3ada6' }} title={items.slice(shown.length).map(([, l]) => l).join(', ')}>+{more}</span>}
    </div>
  )
}
