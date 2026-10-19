// A trophy for the profile banner's case: a flat, solid silhouette in its metal (titles
// gold, the season's honours silver, All-Star ink), its details cut in as dark
// engraving, on a stem and pedestal, standing on a plain dark plinth (its name comes up on
// hover, TrophyCase). Each
// shaped so it reads as its award: the title the Larry O'Brien trophy (a ball on a
// tapering net), Finals MVP a two-handled cup with a star, MVP a crown, Defensive Player a
// shield, All-NBA a laurel wreath round its team's number and All-Defensive one round a
// shield (in the team's metal: first gold, second silver, third bronze), Rookie a
// medallion with a sprout, Sixth Man a jersey numbered 6, Most Improved an arrow climbing,
// Clutch a stopwatch, All-Star a star. Drawn on 32 × 34 (the plinth
// under it in type), shown at SIZE × `scale`.
import { useEffect } from 'react'
import { MONO } from '../lib/format.js'
import { seasonsBetween, shortSeason } from '../lib/seasons.js'
import { AWARDS, GAP, SIZE, TROPHY_W, delayOf, layout } from '../lib/trophies.js'

const GOLD = '#d4af37'
const GOLD_DARK = '#a8852a'
const SILVER = '#c9ced3'
const SILVER_DARK = '#8f969d'
const BRONZE = '#b8794a'
const BRONZE_DARK = '#8a5a35'
const INK = '#ece8e3'
const CUT = '#2a2622'
const TIERS = { 1: [GOLD, GOLD_DARK], 2: [SILVER, SILVER_DARK], 3: [BRONZE, BRONZE_DARK] }

// A laurel wreath (five leaves a side on a ring round 16, 12.5, tied at the foot) in
// `metal`, round `center`.
const Wreath = ({ metal, center }) => <>
  {[110, 135, 160, 185, 210, 70, 45, 20, -5, -30].map(a => {
    const x = 16 + 9 * Math.cos((a * Math.PI) / 180)
    const y = 12.5 + 9 * Math.sin((a * Math.PI) / 180)
    return <ellipse key={a} cx={x} cy={y} rx={1.5} ry={3.1} fill={metal} transform={`rotate(${a} ${x} ${y})`} />
  })}
  <path d="M12.6 21 Q16 23.6 19.4 21" stroke={metal} strokeWidth={1.2} fill="none" />
  {center}
</>
const allNba = tier => ({ label: 'All-NBA', metal: TIERS[tier], draw: <Wreath metal={TIERS[tier][0]} center={<text x={16} y={16.2} textAnchor="middle" fontFamily={MONO} fontSize={10} fontWeight={700} fill={TIERS[tier][0]}>{tier}</text>} /> })
const allDefense = tier => ({ label: 'All-D', metal: TIERS[tier], draw: <Wreath metal={TIERS[tier][0]} center={<path d="M16 7.6 L20.2 9.1 V12.2 C20.2 14.7 18.4 16.3 16 17.1 C13.6 16.3 11.8 14.7 11.8 12.2 V9.1 Z" fill={TIERS[tier][0]} />} /> })

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
  allnba1: allNba(1),
  allnba2: allNba(2),
  allnba3: allNba(3),
  alldef1: allDefense(1),
  alldef2: allDefense(2),
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
// each a trophy on its plinth (Trophy) standing flush on the banner's bottom edge (over its
// team bar), side by side, each with its name over it. The case shows only while the
// banner is under the pointer (or holds focus, as a tap gives it), the trophies rising in
// turn (index.css .tc-item, .tc-tag); a screen without hover shows them throughout, their
// names on a tap. They keep their size while they fit in `room` (the banner between his
// name and his portrait, measured by the card), then shrink to fit, to MIN_SCALE, past
// which the last fold into a "+n" (lib/trophies.js lays it out). Nothing in a season he
// won none. A click (or Enter) on a trophy opens his career trophy case (`onOpen`,
// CareerCase).
export default function TrophyCase({ awards, season, room, right, onOpen }) {
  const l = layout(awards, season, room)
  if (!l) return null
  const { items, shown, scale, more } = l
  return (
    <div style={{ position: 'absolute', right, bottom: 0, display: 'flex', alignItems: 'flex-end', gap: GAP * scale, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' }}>
      {shown.map(([key, long], i) => {
        const tip = `${long} · ${season.replace('-', '–')}`
        return (
          <span key={key} className="tc-item" tabIndex={0} role="button" aria-label={`${tip}: open his career trophy case`} onClick={() => onOpen(key)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(key) } }}
            style={{ '--d': `${delayOf(i)}ms`, position: 'relative', display: 'flex', cursor: 'pointer', outline: 'none' }}>
            <Trophy award={key} scale={scale} />
            {/* Every other name a line higher, so neighbours never touch. */}
            <span className="tc-tag" aria-hidden="true" style={{ position: 'absolute', left: '50%', bottom: `calc(100% + ${i % 2 ? 13 : 3}px)`, fontFamily: MONO, fontSize: 7.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              {EMBLEMS[key].label}
            </span>
          </span>
        )
      })}
      {more > 0 && <span className="tc-item" style={{ '--d': `${delayOf(shown.length)}ms`, fontSize: 9, letterSpacing: '.06em', color: '#b3ada6' }} title={items.slice(shown.length).map(([, l]) => l).join(', ')}>+{more}</span>}
    </div>
  )
}

// His career trophy case, over the bio card when a trophy is clicked: every award he won, a
// row each (its trophy, its name, how many), along a strip of his career's seasons, a lit
// step in the award's metal for each season he won it, like a sequencer's (hover one for its
// season); the row clicked (`focus`) marked. It wipes down over the card and its steps come
// on in turn, left to right, row by row (index.css .cc-*). ✕ or Esc closes it.
export function CareerCase({ awards, seasons, name, focus, onClose }) {
  useEffect(() => {
    const key = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  const rows = AWARDS.filter(([k]) => awards && awards[k] && awards[k].length)
  const won = rows.flatMap(([k]) => awards[k])
  const span = seasonsBetween([seasons[0], ...won].sort()[0], [seasons[seasons.length - 1], ...won].sort().pop())
  // Every fifth season from his first, and his last when it isn't crowding the one before.
  const ticks = new Set(span.filter((x, i) => i % 5 === 0 || (i === span.length - 1 && i % 5 >= 3)))
  const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: '#a09a93' }
  const cols = '40px minmax(96px, 150px) minmax(0, 1fr) 26px'
  return (
    <div className="cc" role="dialog" aria-label={`${name}: career trophy case`} style={{ position: 'absolute', inset: 0, zIndex: 6, background: '#1f1d1c', display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 14px 16px', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid #544f4b', paddingBottom: 9 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ ...label, color: INK, fontWeight: 700 }}>Career trophy case</span>
          <span style={{ ...label, letterSpacing: '.1em' }}>{name} · {won.length} honour{won.length === 1 ? '' : 's'} · {shortSeason(span[0])}–{shortSeason(span[span.length - 1])}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the trophy case" style={{ ...label, color: INK, background: 'none', border: '1px solid #544f4b', padding: '4px 8px', cursor: 'pointer' }}>Esc ✕</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(([key, long], r) => {
          const lit = new Set(awards[key])
          const metal = EMBLEMS[key].metal[0]
          return (
            <div key={key} className="cc-row" style={{ '--r': `${80 + r * 45}ms`, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: 10, boxShadow: key === focus ? `inset 2px 0 0 ${metal}` : 'none', paddingLeft: 6 }}>
              <Trophy award={key} scale={0.62} />
              <span style={{ ...label, fontSize: 8.5, letterSpacing: '.1em', color: key === focus ? INK : '#b3ada6', lineHeight: 1.3 }}>{long}</span>
              <span style={{ display: 'grid', gridTemplateColumns: `repeat(${span.length}, minmax(0, 1fr))`, gap: 2 }}>
                {span.map((season, i) => (
                  <span key={season} title={`${long} · ${season.replace('-', '–')}`} className={lit.has(season) ? 'cc-on' : undefined}
                    style={{ '--d': `${160 + r * 45 + i * 14}ms`, height: 12, background: lit.has(season) ? metal : 'transparent', boxShadow: lit.has(season) ? 'none' : 'inset 0 0 0 1px #34312e' }} />
                ))}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, textAlign: 'right', color: INK, fontVariantNumeric: 'tabular-nums' }}>{lit.size}</span>
            </div>
          )
        })}
        {/* The seasons under the steps. */}
        <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 10, paddingLeft: 6 }}>
          <span />
          <span />
          <span style={{ display: 'grid', gridTemplateColumns: `repeat(${span.length}, minmax(0, 1fr))`, gap: 2 }}>
            {span.map(season => <span key={season} style={{ fontFamily: MONO, fontSize: 7.5, color: '#837d76', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible' }}>{ticks.has(season) ? shortSeason(season) : ''}</span>)}
          </span>
          <span />
        </div>
      </div>
    </div>
  )
}

