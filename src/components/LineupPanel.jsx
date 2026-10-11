import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { headshotUrl, loadLineupLeague } from '../api.js'
import { MONO, ord, signed } from '../lib/format.js'
import TeamInitials from './TeamInitials.jsx'
import { initials } from '../lib/teams.js'
import { dotRadius, dotTint, rankColor, rankLabel, rankPct, swarm } from '../lib/swarm.js'
import { useSeasonType } from '../useSeasonType.js'
import { arrange } from '../lib/units.js'

const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#6b655f'
const BLUE = '#8fb0e6'
const ORANGE = '#fa962a'
const RULE = '1px solid #3d3a37'
const EDGE = '1px solid #544f4b'
const TILE = 36
// A 3-man tile's column is a little wider than its headshot, so the name centred
// under it has room.
const COL = 40
const SMALL = 25
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: DIM }
const lastName = name => name.split(' ').slice(1).join(' ') || name
const net = v => (v === null || v === undefined ? '—' : signed(v))
// Colour is kept for the verdicts (Δ and a unit's net); everything else is ink and grey.
const verdict = v => (v === null || v === undefined ? FAINT : v >= 0 ? BLUE : ORANGE)
const neutral = v => (v === null || v === undefined ? FAINT : v >= 0 ? INK : '#a8a29c')
const mins = m => m.toLocaleString()

// Links to teammates carry the season (his page opens on it, when he played it).
function Mate({ mate, season }) {
  const { playerPath } = useSeasonType()
  const name = mate.name ? lastName(mate.name) : '?'
  return mate.slug
    ? <Link to={playerPath(mate.slug)} state={{ season }} className="depth-link" style={{ color: INK, borderBottom: '1px solid transparent' }}>{name}</Link>
    : <span style={{ color: DIM }}>{name}</span>
}

// A round headshot with the last name under it, or in 4- and 5-man units' small tiles the
// initials (the full name is on hover). A ring in the team colour frames each; his own
// is stronger. Teammates' tiles link to their pages.
function Tile({ player, team, accent, self, small, state }) {
  const { playerPath } = useSeasonType()
  const [failed, setFailed] = useState(false)
  const size = small ? SMALL : TILE
  const name = player.name ? (small ? initials(player.name) : lastName(player.name)) : '?'
  const face = player.headshot && !failed
    ? <img src={headshotUrl(player.slug, 100, player.headshotVersion, player.headshot)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%', display: 'block' }} />
    : <TeamInitials name={player.name || '?'} team={team} fontSize={small ? 9 : 15} />
  const box = (
    <span className="lineup-tile" style={{ position: 'relative', display: 'block', width: size, height: size, borderRadius: '50%', border: self ? `2px solid color-mix(in srgb, ${accent || INK} 70%, ${INK})` : `1.5px solid color-mix(in srgb, ${accent || INK} 40%, #544f4b)`, background: '#34312e', overflow: 'hidden' }}>
      {face}
    </span>
  )
  return (
    <span title={player.name || ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: small ? SMALL : COL, minWidth: 0, flex: 'none' }}>
      {player.slug && !self ? <Link to={playerPath(player.slug)} state={state} style={{ display: 'block' }}>{box}</Link> : box}
      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '.02em', textTransform: 'uppercase', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: small ? 'clip' : 'ellipsis', fontWeight: self ? 700 : 400, color: self ? INK : DIM }}>
        {player.slug && !self ? <Link to={playerPath(player.slug)} state={state} className="depth-link" style={{ color: 'inherit', borderBottom: '1px solid transparent' }}>{name}</Link> : name}
      </span>
    </span>
  )
}

// Unit-size switch (2- to 5-man), styled like the percentile card's season menu.
function SizePicker({ size, setSize, open, setOpen }) {
  return (
    <span style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Unit size" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'transparent', border: 'none', borderBottom: '1px dotted #8fb0e6', padding: 0, color: INK, fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', cursor: 'pointer' }}>
        {size}-MAN<span style={{ fontSize: 6.5, color: BLUE }}>▼</span>
      </button>
      {open && (
        <span style={{ position: 'absolute', left: -4, top: 'calc(100% + 4px)', zIndex: 10, background: '#1f1d1c', border: '1px solid #6b655f', boxShadow: '0 8px 24px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', minWidth: 64 }}>
          {[2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => { setSize(n); setOpen(false) }} style={{ textAlign: 'left', background: n === size ? '#3d3a37' : 'transparent', border: 'none', borderBottom: '1px solid #3d3a37', color: n === size ? INK : '#b8b2ab', fontFamily: MONO, fontSize: 10, fontWeight: n === size ? 600 : 400, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {n}-MAN
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

// The best unit's minutes minimum, opened from a label like the size menu: every
// multiple of 50 in the API's range for the size, plus the default (underlined in blue),
// as a grid of numbers so the whole range shows at once without scrolling.
const STEP = 50
function MinutesPicker({ value, def, range, onChange, open, setOpen }) {
  const [lo, hi] = range
  const choices = [...new Set([def, ...Array.from({ length: Math.floor((hi - lo) / STEP) + 1 }, (_, i) => lo + i * STEP)])].sort((a, b) => a - b)
  return (
    <span style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Minimum minutes" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'transparent', border: 'none', padding: 0, color: INK, fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', cursor: 'pointer' }}>
        {value}+ MIN<span style={{ fontSize: 6.5, color: BLUE }}>▼</span>
      </button>
      {open && (
        <span style={{ position: 'absolute', left: -4, top: 'calc(100% + 4px)', zIndex: 10, background: '#1f1d1c', border: '1px solid #6b655f', boxShadow: '0 8px 24px rgba(0,0,0,.5)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...label, fontSize: 8, whiteSpace: 'nowrap' }}>MINIMUM MINUTES</span>
          <span style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 38px)', gap: 2 }}>
            {choices.map(n => (
              <button key={n} onClick={() => { onChange(n); setOpen(false) }} title={n === def ? 'Default' : undefined} style={{ background: n === value ? INK : 'transparent', border: 'none', color: n === value ? '#1f1d1c' : '#b8b2ab', fontFamily: MONO, fontSize: 10, fontWeight: n === value ? 700 : 400, padding: '4px 0', textAlign: 'center', cursor: 'pointer', textDecoration: n === def ? `underline 1px ${BLUE}` : 'none', textUnderlineOffset: 3 }}>
                {n}
              </button>
            ))}
          </span>
        </span>
      )}
    </span>
  )
}

// A unit's net. Hovering (or focusing) it opens the rank tooltip, which sits on the
// number itself.
function Net({ unit, onTip, tip }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span tabIndex={0} onMouseEnter={() => onTip(true)} onMouseLeave={() => onTip(false)} onFocus={() => onTip(true)} onBlur={() => onTip(false)}
        style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1, color: verdict(unit.net), cursor: 'default', borderBottom: `1px dotted ${FAINT}`, paddingBottom: 1, outline: 'none' }}>
        {net(unit.net)}
      </span>
      {tip}
    </span>
  )
}

// The rank tooltip is one TIP_IN-wide column: every row shares its left and right edge.
// The swarm fills that width, net running up SL px, its dots spread SS px about the
// middle.
const TIP_W = 184
const TIP_PAD = 10
const TIP_IN = TIP_W - 2 * TIP_PAD - 2
const SL = 196
const SS = 92
const NAMES_PX = 11.5

// The swarm's dots, drawn once per pool so pointing at them only redraws the ring and
// the readout.
const SwarmDots = memo(function SwarmDots({ dots, r, dx }) {
  return <g pointerEvents="none">{dots.map((d, i) => <circle key={i} cx={dx + d.y} cy={SL - d.x} r={r} fill={dotTint(dots.length > 1 ? i / (dots.length - 1) : 1)} opacity={0.5} />)}</g>
})

// The rank tooltip, a narrow popover just above the hovered net: the unit's league rank
// among units of its size over the minutes floor (coloured blue to orange by where it
// falls), and a vertical swarm of every such unit's net with this one marked. Pointing
// at a dot names that unit in the readout under the swarm (otherwise it shows this
// one). It stays open while the pointer is over it. The league pool is fetched on the
// first hover.
function RankTip({ unit, size, floor, isDefault, self, team, season, onHover }) {
  const [league, setLeague] = useState(null)
  const [hot, setHot] = useState(null)
  const frame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  // Opens above the number; when that would run off the top of the window, below it.
  const box = useRef(null)
  const [below, setBelow] = useState(false)
  useLayoutEffect(() => {
    if (box.current && box.current.getBoundingClientRect().top < 8) setBelow(true)
  }, [])
  const { playoffs } = useSeasonType()
  useEffect(() => {
    let live = true
    loadLineupLeague(playoffs, season).then(d => live && setLeague(d)).catch(() => {})
    return () => { live = false }
  }, [playoffs, season])
  // Every league unit of this size over the chosen minimum as [minutes, net, player ids,
  // team], and their nets best first.
  const units = useMemo(() => league && league.pool ? league.pool[size].filter(([m]) => m >= floor) : null, [league, size, floor])
  const nets = useMemo(() => units && units.map(u => u[1]).sort((a, b) => b - a), [units])
  const dotR = nets ? dotRadius(nets.length) : 1.5
  const sw = useMemo(() => units && swarm(units.map(u => u[1]), { width: SL, height: SS, r: dotR, include: [unit.net] }), [units, dotR, unit.net])
  const yOf = v => SL - sw.x(v)
  const dx = (TIP_IN - SS) / 2
  // The rank at the chosen minimum, from the pool (until it loads, the API's rank at the default).
  const r = nets ? (unit.minutes >= floor ? { rank: nets.filter(n => n > unit.net).length + 1, of: nets.length } : null) : isDefault ? unit.rank : null
  const tone = r ? rankColor(rankPct(r.rank, r.of)) : FAINT
  // The dot nearest the pointer, looked up once per frame.
  const point = e => {
    const at = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - at.left
    const py = e.clientY - at.top - 4
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      let near = null
      let gap = Infinity
      for (const d of sw.dots) {
        const g = (dx + d.y - px) ** 2 + (SL - d.x - py) ** 2
        if (g < gap) [near, gap] = [d, g]
      }
      setHot(near)
    })
  }
  const leave = () => {
    cancelAnimationFrame(frame.current)
    setHot(null)
  }
  const shown = hot
    ? (([m, n, ids, t]) => ({ names: (ids || []).map(id => league.people && league.people[id]), team: t, net: n, minutes: m, rank: nets.filter(x => x > n).length + 1 }))(units[hot.i])
    : { names: [self, ...unit.mates].map(pl => pl && pl.name), team, net: unit.net, minutes: unit.minutes, rank: r && r.rank }
  const names = shown.names.map(n => (n ? lastName(n) : '?')).join(' · ')
  // The names stay on one line: a lineup too long for the tooltip shrinks to fit it.
  const namesBox = useRef(null)
  useLayoutEffect(() => {
    const el = namesBox.current
    el.style.fontSize = `${NAMES_PX}px`
    if (el.scrollWidth > el.clientWidth) el.style.fontSize = `${Math.floor(NAMES_PX * el.clientWidth / el.scrollWidth * 10) / 10}px`
  }, [names, hot])
  const tick = { fontFamily: MONO, fontSize: 9, fill: FAINT }
  const section = { borderTop: RULE, paddingTop: 7 }
  return (
    <div ref={box} role="tooltip" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} style={{ position: 'absolute', right: -6, ...(below ? { top: 'calc(100% + 8px)' } : { bottom: 'calc(100% + 8px)' }), zIndex: 20, width: TIP_W, background: 'rgba(31, 29, 28, .92)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid #6b655f', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: TIP_PAD, display: 'flex', flexDirection: 'column', gap: 7, fontFamily: 'Montserrat,sans-serif', fontWeight: 400, lineHeight: 'normal', textAlign: 'left', color: INK, cursor: 'default' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {r ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, lineHeight: 1, color: tone }}>{ord(r.rank).toUpperCase()}</span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: `color-mix(in srgb, ${tone} 55%, ${INK})`, background: `color-mix(in srgb, ${tone} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${tone} 60%, transparent)`, padding: '2px 5px' }}>{rankLabel(r.rank, r.of)}</span>
          </div>
        ) : (
          <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, lineHeight: 1, color: FAINT }}>UNRANKED</span>
        )}
        {r ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ ...label, fontSize: 10.5 }}>OF <span style={{ color: INK, fontWeight: 700, fontSize: 12.5 }}>{r.of.toLocaleString()}</span> UNITS</span>
            <span style={{ ...label, fontSize: 9.5 }}>{floor}+ MIN</span>
          </div>
        ) : (
          <span style={{ ...label, fontSize: 9.5 }}>UNDER {floor} MIN TOGETHER</span>
        )}
      </div>
      <div style={section}>
        {sw ? (
          <svg width={TIP_IN} height={SL + 8} viewBox={`0 -4 ${TIP_IN} ${SL + 8}`} onMouseMove={point} onMouseLeave={leave} style={{ display: 'block', overflow: 'visible' }}>
            <rect x={0} y={-4} width={TIP_IN} height={SL + 8} fill="transparent" />
            {sw.ticks.map(v => (
              <g key={v}>
                <line x1={0} x2={TIP_IN} y1={yOf(v)} y2={yOf(v)} stroke="#3d3a37" strokeDasharray={v ? undefined : '2 3'} />
                <text x={0} y={yOf(v) - 3} style={tick}>{v ? signed(v, 0) : '0'}</text>
              </g>
            ))}
            <SwarmDots dots={sw.dots} r={dotR} dx={dx} />
            <g pointerEvents="none">
              <line x1={0} x2={TIP_IN} y1={yOf(unit.net)} y2={yOf(unit.net)} stroke={INK} strokeWidth={1} />
              <circle cx={TIP_IN / 2} cy={yOf(unit.net)} r={3.5} fill={tone} stroke={INK} strokeWidth={1.25} />
              <text x={TIP_IN} y={yOf(unit.net) - 4} textAnchor="end" style={{ ...tick, fill: INK, fontWeight: 700, fontSize: 10 }}>{net(unit.net)}</text>
              {hot && <circle cx={dx + hot.y} cy={SL - hot.x} r={dotR + 1.5} fill={INK} stroke="#1f1d1c" strokeWidth={1} />}
            </g>
          </svg>
        ) : (
          <div style={{ height: SL + 8, display: 'flex', alignItems: 'center', justifyContent: 'center', ...label, color: FAINT }}>LOADING…</div>
        )}
      </div>
      {/* A fixed height, so the tooltip doesn't shift as the names change. */}
      <div style={{ ...section, height: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <span ref={namesBox} style={{ fontSize: NAMES_PX, lineHeight: '14px', fontWeight: hot ? 600 : 400, color: INK, whiteSpace: 'nowrap', overflow: 'hidden' }}>{names}</span>
        <span style={{ ...label, fontSize: 9.5, display: 'flex', gap: 7 }}>
          <span>{shown.team}</span>
          <span style={{ color: INK, fontWeight: 700 }}>{net(shown.net)}</span>
          {shown.rank && nets && <span style={{ color: rankColor(rankPct(shown.rank, nets.length)), fontWeight: 700 }}>{ord(shown.rank).toUpperCase()}</span>}
          <span style={{ marginLeft: 'auto' }}>{mins(shown.minutes)} MIN</span>
        </span>
      </div>
    </div>
  )
}

// One unit he plays in: him and his teammates in it as tiles, then its net and minutes
// (and its share of his minutes when it's his most-used). Without a unit over the
// floor, the same frame shows empty tiles. The row keeps one height for both sizes.
function Unit({ title, unit, size, self, team, season, accent, empty, className, onTip, tip }) {
  // Four and five tiles don't fit at full size beside the numbers; they go small with initials.
  const small = size >= 4
  // Arrived by clicking a teammate's tile: that unit's order holds (lib/units.js), and
  // these tiles' links carry this order (and the season) on.
  const from = useLocation().state
  const players = unit ? arrange([self, ...unit.mates], from && from.unitOrder) : null
  const state = players && { unitOrder: players.map(pl => pl.slug), season }
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 11, minWidth: 0 }}>
      <span style={{ ...label, display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ height: TILE + 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0 }}>
          {unit
            ? players.map((pl, i) => <Tile key={i} player={pl} team={team} accent={accent} self={pl === self} small={small} state={state} />)
            : Array.from({ length: size }, (_, i) => <span key={i} style={{ width: small ? SMALL : TILE, height: small ? SMALL : TILE, margin: small ? 0 : `0 ${(COL - TILE) / 2}px`, flex: 'none', borderRadius: '50%', border: '1px dashed #4a4643' }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flex: 'none' }}>
          {unit ? <Net unit={unit} onTip={onTip} tip={tip} /> : <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1, color: FAINT }}>—</span>}
          <span style={{ ...label, fontSize: 8, whiteSpace: unit ? 'nowrap' : 'pre-line', textAlign: 'right', lineHeight: 1.4 }}>{unit ? `${mins(unit.minutes)} MIN` : empty}</span>
          {unit && unit.share !== undefined && <span style={{ ...label, fontSize: 8, whiteSpace: 'nowrap' }}>{unit.share}% OF MIN</span>}
        </div>
      </div>
    </div>
  )
}

const mateGrid = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px 44px 44px 40px', columnGap: 6, alignItems: 'baseline' }

// The bio card's lineup module. First his most-shared teammates, with the team's net
// with both on (ON) and with him on and the teammate off (OFF); Δ = OFF − ON,
// how he does without that teammate, so one he leans on reads negative (orange). Then
// side by side his best and his most-used unit as headshot tiles, three-man by default
// and switchable to 2-, 4- and 5-man (best: over that size's league minutes floor, which
// the API sets); each net shows its league rank on hover.
// All net rating per 100 possessions, from the season's five-man lineups.
export default function LineupPanel({ profile: p, accent }) {
  // Lineups in an older shape (no `units`) show as no data rather than breaking the page.
  const L = p.lineups && p.lineups.units ? p.lineups : null
  const [size, setSize] = useState(3)
  // A minimum the reader picked, per size; otherwise the API's default (L.floors).
  const [picked, setPicked] = useState({})
  const def = L ? L.floors[size] : null
  const floor = L ? (picked[size] ?? def) : null
  const isDefault = floor === def
  const used = L ? L.units[size].mostUsed : null
  // At the default the API's best unit; at another minimum, the best of his options over it.
  const best = !L ? null : isDefault ? L.units[size].best : (() => {
    const o = (L.units[size].options || []).find(([, m]) => m >= floor)
    return o ? { minutes: o[1], net: o[2], mates: o[0].map(id => L.people[id] || { name: null, slug: null }) } : null
  })()
  const [tip, setTip] = useState(null)
  // One menu open at a time; a click outside the control row or Escape closes it.
  const [menu, setMenu] = useState(null)
  const controls = useRef(null)
  const toggle = which => next => setMenu(m => {
    const open = typeof next === 'function' ? next(m === which) : next
    return open ? which : m === which ? null : m
  })
  useEffect(() => {
    if (!menu) return
    const outside = e => { if (controls.current && !controls.current.contains(e.target)) setMenu(null) }
    const escape = e => { if (e.key === 'Escape') setMenu(null) }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [menu])
  const closing = useRef(null)
  const hover = which => on => {
    clearTimeout(closing.current)
    if (on) setTip(which)
    else closing.current = setTimeout(() => setTip(null), 180)
  }
  useEffect(() => () => clearTimeout(closing.current), [])
  const unitProps = { size, self: L && L.self, team: L && L.team, season: L && L.season, accent }

  return (
    <div key={`lineups-${p.slug}`} className="swap-in" style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10, '--team': accent || INK }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...label }}>
        <span>{L ? `${L.season.replace('-', '–')}${p.seasonType === 'playoffs' ? ' PLAYOFFS' : ''} · ${L.team} · LINEUPS` : 'LINEUPS'}</span>
        <span>NET / 100</span>
      </div>

      {!L ? (
        <span style={{ ...label, color: FAINT, padding: '6px 0', borderTop: RULE, borderBottom: RULE }}>{p.seasonType === 'playoffs' ? 'NO PLAYOFF LINEUPS THIS SEASON' : 'NO LINEUP DATA THIS SEASON'}</span>
      ) : (
        <>
          <div>
            <div style={{ ...mateGrid, ...label, paddingBottom: 5, borderBottom: EDGE }}>
              <span style={{ gridColumn: '1 / 3', textAlign: 'right' }}>MINUTES WITH</span>
              <span title="Team net with both on" style={{ textAlign: 'right' }}>ON</span>
              <span title="Team net with him on and the teammate off" style={{ textAlign: 'right' }}>OFF</span>
              <span title="OFF − ON: how he does without this teammate" style={{ textAlign: 'right' }}>Δ</span>
            </div>
            {L.mates.map((m, i) => {
              const d = m.together.net !== null && m.apart.net !== null ? m.apart.net - m.together.net : null
              return (
                <div key={i} style={{ ...mateGrid, fontFamily: MONO, fontSize: 11, padding: '5px 0', borderBottom: RULE }}>
                  <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Mate mate={m} season={L.season} /></span>
                  <span style={{ textAlign: 'right', color: DIM, fontSize: 9.5 }}>{mins(m.together.minutes)}</span>
                  <span style={{ textAlign: 'right', color: neutral(m.together.net) }}>{net(m.together.net)}</span>
                  <span style={{ textAlign: 'right', color: neutral(m.apart.net) }}>{net(m.apart.net)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: verdict(d) }}>{net(d)}</span>
                </div>
              )
            })}
          </div>

          {/* Size and minimum apply to both units (the minimum picks the best one and sets
              the league pool both are ranked in), so they sit on one row above them. */}
          <div ref={controls} style={{ ...label, display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: -6 }}>
            <span>UNITS</span>
            <SizePicker size={size} setSize={setSize} open={menu === 'size'} setOpen={toggle('size')} />
            <span>·</span>
            <MinutesPicker open={menu === 'minutes'} setOpen={toggle('minutes')} value={floor} def={def} range={(L.floorRange && L.floorRange[size]) || [def, def]} onChange={v => setPicked(m => ({ ...m, [size]: v }))} />
          </div>
          <div className="lineup-units-wrap"><div className="lineup-units">
            <Unit {...unitProps} title="BEST" unit={best} empty={`NONE\n${floor}+ MIN`} onTip={hover('best')} tip={tip === 'best' && best && <RankTip unit={best} size={size} floor={floor} isDefault={isDefault} self={L.self} team={L.team} season={L.season} onHover={hover('best')} />} className="lineup-unit-a" />
            <Unit {...unitProps} title="MOST USED" unit={used} onTip={hover('used')} tip={tip === 'used' && used && <RankTip unit={used} size={size} floor={floor} isDefault={isDefault} self={L.self} team={L.team} season={L.season} onHover={hover('used')} />} className="lineup-unit-b" />
          </div></div>
        </>
      )}

    </div>
  )
}
