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
// under it in type), shown at SIZE × `scale`. A player's own award (WON: MVP, Finals MVP,
// DPOY, ROY, Sixth Man, MIP, Clutch; not a title or a team selection) shines: a hard white
// bar steps across its metal, a spark flashes as it leaves, and its plinth's edge is lit
// in its metal (index.css .tr-*).
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { MONO } from '../lib/format.js'
import { shortSeason } from '../lib/seasons.js'
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
const WON = new Set(['fmvp', 'mvp', 'dpoy', 'roy', 'smoy', 'mip', 'clutch'])

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

// `delay`: when its shine first runs (ms), so trophies side by side take turns.
function Trophy({ award, scale: k = 1, delay = 0 }) {
  const mask = `tr-${useId().replace(/:/g, '')}`
  const e = EMBLEMS[award]
  if (!e) return null
  const [light, dark] = e.metal
  const scale = SIZE * k
  const won = WON.has(award)
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: TROPHY_W * k }}>
      <svg viewBox="0 0 32 34" width={32 * scale} height={34 * scale} style={{ display: 'block', overflow: 'visible', '--d': `${delay}ms` }} aria-hidden="true">
        {e.draw}
        <Stand light={light} dark={dark} />
        {/* The bar, through the trophy's own drawing (its metal bright, its engraving dark). */}
        {won && <>
          <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={32} height={34}>{e.draw}<Stand light={light} dark={dark} /></mask>
          <g mask={`url(#${mask})`}><polygon className="tr-glint" points="-4,0 0,0 -8,34 -12,34" fill="#fff" /></g>
          <path className="tr-spark" d="M27 0 V6 M24 3 H30" stroke="#fff" strokeWidth={1.2} />
        </>}
      </svg>
      <span style={{ width: TROPHY_W * k, height: 4 * scale, background: '#141312', borderTop: `1px solid ${won ? light : '#4a4642'}` }} />
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
// won none. A click (or Enter) on a trophy opens his accolades (`onOpen`, with where it
// stands, so it can fly there; CareerCase), and the case stays hidden while they're open
// (`away`): its trophies are in them.
export default function TrophyCase({ awards, season, room, right, away, onOpen }) {
  const l = layout(awards, season, room)
  if (!l) return null
  const { items, shown, scale, more } = l
  return (
    <div style={{ position: 'absolute', right, bottom: 0, display: 'flex', alignItems: 'flex-end', gap: GAP * scale, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))', visibility: away ? 'hidden' : undefined }}>
      {shown.map(([key, long], i) => {
        const tip = `${long} · ${season.replace('-', '–')}`
        return (
          <span key={key} className="tc-item" tabIndex={0} role="button" aria-label={`${tip}: open his accolades`} onClick={e => onOpen(key, e.currentTarget.getBoundingClientRect())} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(key, e.currentTarget.getBoundingClientRect()) } }}
            style={{ '--d': `${delayOf(i)}ms`, position: 'relative', display: 'flex', cursor: 'pointer', outline: 'none' }}>
            <Trophy award={key} scale={scale} delay={700 + i * 450} />
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

// His accolades, over the bio card when a trophy is clicked: a trophy case. A framed
// cabinet lit from its top edge, behind one pane of glass, its shelves in order of
// importance (SHELVES: the title and the MVPs on top, largest, down to All-Star), each award
// standing as many copies as he won, grouped close and centred on its shelf, with a plate
// in its metal on the shelf's lip (its name and how many); a crowded shelf closes its
// copies up, then shrinks (fit). Under the case a readout gives the seasons of the award
// under the pointer, else the one clicked (`focus`, its plate outlined). It opens under the
// banner (`top`), which stays as its head, his portrait and all: the trophy clicked flies
// from the banner (`from`, its box there) to its season's copy (`season`) on the shelf,
// while each shelf's plank wipes in, top first, its other trophies drop onto it one by one
// in hard steps, then their plates stamp on (index.css .ac-*). ✕ or Esc closes it.
const SHELVES = [
  [['champion', 'fmvp', 'mvp'], 1.3],
  [['dpoy', 'roy', 'smoy', 'mip', 'clutch'], 1.05],
  [['allnba1', 'allnba2', 'allnba3'], 0.9],
  [['alldef1', 'alldef2'], 0.85],
  [['allstar'], 0.72]
]
const PLAQUE = { allnba1: 'All-NBA 1st', allnba2: 'All-NBA 2nd', allnba3: 'All-NBA 3rd', alldef1: 'All-D 1st', alldef2: 'All-D 2nd' }
const LIP = 16
const PAD = 14
const plateText = (key, count) => `${PLAQUE[key] || EMBLEMS[key].label} ×${count}`
// A plate's width: its monospace letters (7.5px, .08em apart) and padding.
const plateW = text => text.length * 5.1 + 10
// A shelf's scale and how far each copy steps from the last: copies 0.6 of a trophy apart,
// closer (to 0.16) when the shelf is full, the whole shelf smaller past that (to 0.6 of its
// size), and wrapped past that. Each award takes the wider of its copies and its plate.
const fit = (groups, k0, width) => {
  const room = width - 2 * PAD
  const span = (k, step) => groups.reduce((n, [c, plate]) => n + Math.max(TROPHY_W * k * (1 + (c - 1) * step), plate), 0) + 22 * k * (groups.length - 1)
  for (let k = k0; k >= k0 * 0.6; k *= 0.94) {
    for (let step = 0.6; step >= 0.16; step -= 0.02) if (span(k, step) <= room) return { k, step }
  }
  return { k: k0 * 0.6, step: 0.16 }
}
export function CareerCase({ awards, seasons, name, focus, season, from, top = 0, onClose }) {
  const box = useRef(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState(null)
  // The flight: a copy of the trophy on the shelf, fixed over the page (the case clips),
  // from the banner's box to the shelf's, the shelf's own hidden till it lands. Once.
  const flown = useRef(false)
  useLayoutEffect(() => {
    if (flown.current || !width || !from) return undefined
    flown.current = true
    const el = box.current.querySelector(`[data-copy="${focus}|${season}"]`)
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const to = el.getBoundingClientRect()
    const fly = el.cloneNode(true)
    fly.removeAttribute('class')
    Object.assign(fly.style, { position: 'fixed', left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, margin: 0, zIndex: 50, pointerEvents: 'none' })
    document.body.appendChild(fly)
    el.style.visibility = 'hidden'
    const done = () => { el.style.visibility = ''; fly.remove() }
    const a = fly.animate([
      { transformOrigin: '0 0', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})` },
      { transformOrigin: '0 0', transform: 'none' }
    ], { duration: 620, easing: 'cubic-bezier(.3, .7, .15, 1)', fill: 'both' })
    a.onfinish = done
    return () => { a.cancel(); done() }
  }, [width]) // eslint-disable-line react-hooks/exhaustive-deps -- once, when the shelves are laid out
  useEffect(() => {
    const key = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const has = k => awards && awards[k] && awards[k].length
  const names = Object.fromEntries(AWARDS)
  const won = AWARDS.filter(([k]) => has(k)).flatMap(([k]) => awards[k])
  const shelves = SHELVES.map(([keys, k]) => [keys.filter(has), k]).filter(([keys]) => keys.length)
  const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a09a93' }
  // When each shelf starts: after the one above it has set its trophies down.
  const starts = shelves.reduce((at, [keys]) => [...at, at[at.length - 1] + 220 + Math.min(keys.reduce((n, x) => n + awards[x].length, 0), 10) * 70], [120])
  const read = has(hover) ? hover : has(focus) ? focus : null
  const flying = from ? season : null
  return (
    <div className="cc" role="dialog" aria-label={`${name}: accolades`} style={{ position: 'absolute', inset: `${top}px 0 0 0`, zIndex: 6, background: '#1f1d1c', display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 14px', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 24, fontWeight: 800, lineHeight: 0.9, textTransform: 'uppercase', color: INK }}>{won.length} Accolade{won.length === 1 ? '' : 's'}</span>
          <span style={{ ...label, letterSpacing: '.12em' }}>{shortSeason(seasons[0])}–{shortSeason(seasons[seasons.length - 1])}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close his accolades" style={{ ...label, fontSize: 8.5, background: 'none', border: 0, padding: '2px 0', cursor: 'pointer' }}>Esc ✕</button>
      </div>
      {/* The cabinet: its frame, a strip of light under its top, its shelves sharing its
          height, and over it all a hard-edged reflection on the glass. */}
      <div ref={box} onMouseLeave={() => setHover(null)} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: '2px solid #4a4642', borderTop: '4px solid #4a4642', background: '#181716', boxShadow: 'inset 0 22px 30px -24px rgba(255, 236, 210, .16)' }}>
        <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, background: '#8a8178' }} />
        {width > 0 && shelves.map(([keys, k0], s) => {
          const { k, step } = fit(keys.map(x => [awards[x].length, plateW(plateText(x, awards[x].length))]), k0, width)
          const W = TROPHY_W * k
          let n = 0
          return (
            <div key={keys[0]} style={{ position: 'relative', flex: '1 0 auto', minHeight: 38 * SIZE * k + LIP + 16, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', alignContent: 'flex-end', justifyContent: 'center', gap: `10px ${22 * k}px`, padding: `0 ${PAD}px` }}>
              {/* The shelf: its plank's lip, full width, the plates fixed on it. */}
              <span className="ac-plank" style={{ '--d': `${starts[s]}ms`, position: 'absolute', left: 0, right: 0, bottom: 0, height: LIP, background: '#121110', borderTop: '2px solid #55504b' }} />
              {keys.map(key => {
                const list = awards[key]
                const [metal] = EMBLEMS[key].metal
                return (
                  <div key={key} onMouseEnter={() => setHover(key)} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      {list.map((season, i) => (
                        <span key={season} data-copy={`${key}|${season}`} className={key === focus && season === flying ? undefined : 'ac-drop'} title={`${names[key]} · ${season.replace('-', '–')}`}
                          style={{ '--d': `${starts[s] + 160 + Math.min(n++, 12) * 70}ms`, display: 'flex', marginLeft: i ? -W * (1 - step) : 0, position: 'relative', zIndex: list.length - i }}>
                          <Trophy award={key} scale={k} delay={1600 + s * 500 + i * 180} />
                        </span>
                      ))}
                    </div>
                    <span style={{ height: LIP, display: 'flex', alignItems: 'center' }}>
                      <span className="ac-plaque" title={list.map(x => x.replace('-', '–')).join(', ')}
                        style={{ '--d': `${starts[s] + 260 + Math.min(n, 12) * 70}ms`, fontFamily: MONO, fontSize: 7.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1, padding: '2px 4px', background: metal, color: CUT, outline: key === focus ? `1px solid ${INK}` : 'none', outlineOffset: 1 }}>
                        {plateText(key, list.length)}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(118deg, transparent 58%, rgba(255, 255, 255, .03) 58%, rgba(255, 255, 255, .03) 66%, transparent 66%)' }} />
      </div>
      {/* The readout: the seasons of the award under the pointer, else the one clicked. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minHeight: 14, ...label, letterSpacing: '.1em' }}>
        {read && <>
          <span style={{ color: INK, fontWeight: 700, whiteSpace: 'nowrap' }}>{names[read]} ×{awards[read].length}</span>
          <span style={{ color: '#837d76', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{awards[read].map(shortSeason).join(' ')}</span>
        </>}
      </div>
    </div>
  )
}
