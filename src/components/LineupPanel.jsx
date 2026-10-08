import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { headshotUrl, loadLineupLeague } from '../api.js'
import { MONO, ord, signed } from '../lib/format.js'
import TeamInitials from './TeamInitials.jsx'
import { initials } from '../lib/teams.js'
import { rankColor, rankLabel, rankPct, swarm } from '../lib/swarm.js'

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

function Mate({ mate }) {
  const name = mate.name ? lastName(mate.name) : '?'
  return mate.slug
    ? <Link to={`/player/${mate.slug}`} className="depth-link" style={{ color: INK, borderBottom: '1px solid transparent' }}>{name}</Link>
    : <span style={{ color: DIM }}>{name}</span>
}

// A round headshot with the last name under it, or in a five's small tiles the
// initials (the full name is on hover). A ring in the team colour frames each; his own
// is stronger. Teammates' tiles link to their pages.
function Tile({ player, team, accent, self, small }) {
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
      {player.slug && !self ? <Link to={`/player/${player.slug}`} style={{ display: 'block' }}>{box}</Link> : box}
      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '.02em', textTransform: 'uppercase', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: small ? 'clip' : 'ellipsis', fontWeight: self ? 700 : 400, color: self ? INK : DIM }}>
        {player.slug && !self ? <Link to={`/player/${player.slug}`} className="depth-link" style={{ color: 'inherit', borderBottom: '1px solid transparent' }}>{name}</Link> : name}
      </span>
    </span>
  )
}

// 3-MAN / 5-MAN switch, styled like the percentile card's season menu.
function SizePicker({ size, setSize }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Unit size" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'transparent', border: 'none', borderBottom: '1px dotted #8fb0e6', padding: 0, color: INK, fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', cursor: 'pointer' }}>
        {size}-MAN<span style={{ fontSize: 6.5, color: BLUE }}>▼</span>
      </button>
      {open && (
        <span style={{ position: 'absolute', left: -4, top: 'calc(100% + 4px)', zIndex: 10, background: '#1f1d1c', border: '1px solid #6b655f', boxShadow: '0 8px 24px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', minWidth: 64 }}>
          {[3, 5].map(n => (
            <button key={n} onClick={() => { setSize(n); setOpen(false) }} style={{ textAlign: 'left', background: n === size ? '#3d3a37' : 'transparent', border: 'none', borderBottom: '1px solid #3d3a37', color: n === size ? INK : '#b8b2ab', fontFamily: MONO, fontSize: 10, fontWeight: n === size ? 600 : 400, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {n}-MAN
            </button>
          ))}
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
const TIP_W = 160
const TIP_PAD = 10
const TIP_IN = TIP_W - 2 * TIP_PAD - 2
const SL = 196
const SS = 92

// The rank tooltip, a narrow popover just above the hovered net: the unit, its league rank
// among units of its size over the minutes floor (coloured blue to orange by where it
// falls), and a vertical swarm of every such unit's net with this one marked. It stays
// open while the pointer is over it, and moving up and down the swarm reads out the net
// and league rank at that height. The league pool is fetched on the first hover.
function RankTip({ unit, kind, size, floor, self, onHover }) {
  const [league, setLeague] = useState(null)
  const [probe, setProbe] = useState(null)
  // Opens above the number; when that would run off the top of the window, below it.
  const box = useRef(null)
  const [below, setBelow] = useState(false)
  useLayoutEffect(() => {
    if (box.current && box.current.getBoundingClientRect().top < 8) setBelow(true)
  }, [])
  useEffect(() => {
    let live = true
    loadLineupLeague().then(d => live && setLeague(d)).catch(() => {})
    return () => { live = false }
  }, [])
  const nets = league ? (size === 5 ? league.five : league.trio) : null
  const sw = useMemo(() => nets && swarm(nets, { width: SL, height: SS, r: 1.5 }), [nets])
  const yOf = v => SL - sw.x(v)
  const dx = (TIP_IN - SS) / 2
  const r = unit.rank
  const tone = r ? rankColor(rankPct(r.rank, r.of)) : FAINT
  const names = [self, ...unit.mates].map(m => (m.name ? lastName(m.name) : '?')).join(' · ')
  const median = nets ? nets[Math.floor(nets.length / 2)] : null
  const tick = { fontFamily: MONO, fontSize: 7.5, fill: FAINT }
  const section = { borderTop: RULE, paddingTop: 7 }
  return (
    <div ref={box} role="tooltip" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} style={{ position: 'absolute', right: -6, ...(below ? { top: 'calc(100% + 8px)' } : { bottom: 'calc(100% + 8px)' }), zIndex: 20, width: TIP_W, background: '#1f1d1c', border: '1px solid #6b655f', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: TIP_PAD, display: 'flex', flexDirection: 'column', gap: 7, fontFamily: 'Montserrat,sans-serif', fontWeight: 400, lineHeight: 'normal', textAlign: 'left', color: INK, cursor: 'default' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...label, fontSize: 8 }}>{kind} {size}-MAN</span>
        <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{names}</span>
      </div>
      <div style={{ ...section, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {r ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, lineHeight: 1, color: tone }}>{ord(r.rank).toUpperCase()}</span>
            <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '.06em', color: `color-mix(in srgb, ${tone} 55%, ${INK})`, background: `color-mix(in srgb, ${tone} 18%, transparent)`, border: `1px solid color-mix(in srgb, ${tone} 60%, transparent)`, padding: '2px 5px' }}>{rankLabel(r.rank, r.of)}</span>
          </div>
        ) : (
          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, lineHeight: 1, color: FAINT }}>UNRANKED</span>
        )}
        <span style={{ ...label, fontSize: 7.5 }}>{r ? `OF ${r.of.toLocaleString()} UNITS · ${floor}+ MIN` : `UNDER ${floor} MIN TOGETHER`}</span>
      </div>
      <div style={section}>
        {sw ? (
          <svg width={TIP_IN} height={SL + 8} viewBox={`0 -4 ${TIP_IN} ${SL + 8}`} style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
            onMouseMove={e => {
              const v = sw.value(SL - (e.clientY - e.currentTarget.getBoundingClientRect().top - 4))
              setProbe({ v, rank: nets.filter(n => n > v).length + 1 })
            }}
            onMouseLeave={() => setProbe(null)}>
            <rect x={0} y={-4} width={TIP_IN} height={SL + 8} fill="transparent" />
            {[sw.hi, 0, sw.lo].map(v => (
              <g key={v}>
                <line x1={0} x2={TIP_IN} y1={yOf(v)} y2={yOf(v)} stroke="#3d3a37" strokeDasharray={v ? undefined : '2 3'} />
                <text x={0} y={yOf(v) - 3} style={tick}>{v ? signed(v, 0) : '0'}</text>
              </g>
            ))}
            {sw.dots.map((d, i) => <circle key={i} cx={dx + d.y} cy={SL - d.x} r={1.5} fill={rankColor(sw.dots.length > 1 ? i / (sw.dots.length - 1) : 1)} opacity={0.75} />)}
            <line x1={0} x2={TIP_IN} y1={yOf(unit.net)} y2={yOf(unit.net)} stroke={INK} strokeWidth={1} />
            <circle cx={TIP_IN / 2} cy={yOf(unit.net)} r={3.5} fill={tone} stroke={INK} strokeWidth={1.25} />
            <text x={TIP_IN} y={yOf(unit.net) - 4} textAnchor="end" style={{ ...tick, fill: INK, fontWeight: 700, fontSize: 8.5 }}>{net(unit.net)}</text>
            {probe && <line x1={0} x2={TIP_IN} y1={yOf(probe.v)} y2={yOf(probe.v)} stroke={DIM} strokeDasharray="1 2" pointerEvents="none" />}
          </svg>
        ) : (
          <div style={{ height: SL + 8, display: 'flex', alignItems: 'center', justifyContent: 'center', ...label, color: FAINT }}>LOADING…</div>
        )}
      </div>
      <div style={{ ...section, display: 'flex', justifyContent: 'space-between', ...label, fontSize: 7.5 }}>
        <span>{mins(unit.minutes)} MIN</span>
        {probe
          ? <span>{signed(probe.v)} · <span style={{ color: rankColor(rankPct(probe.rank, nets.length)), fontWeight: 700 }}>{ord(probe.rank).toUpperCase()}</span></span>
          : median !== null && <span>MEDIAN {signed(median)}</span>}
      </div>
    </div>
  )
}

// One unit he plays in: him and his teammates in it as tiles, then its net and minutes
// (and its share of his minutes when it's his most-used). Without a unit over the
// floor, the same frame shows empty tiles. The row keeps one height for both sizes.
function Unit({ title, unit, size, self, team, accent, empty, style, onTip, tip }) {
  const small = size === 5
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, minWidth: 0, ...style }}>
      <span style={{ ...label, display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ height: TILE + 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0 }}>
          {unit
            ? [self, ...unit.mates].map((pl, i) => <Tile key={i} player={pl} team={team} accent={accent} self={i === 0} small={small} />)
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
// side by side his best and his most-used three-man unit as headshot tiles, switchable
// to five-man units (best: over the league's minutes floor, which the API sets); each
// net shows its league rank on hover. Then his career on/off.
// All net rating per 100 possessions, from the season's five-man lineups.
export default function LineupPanel({ profile: p, accent }) {
  const L = p.lineups
  const [size, setSize] = useState(3)
  const [best, used, floor] = !L ? [] : size === 5 ? [L.bestFive, L.mostUsed, L.floors.five] : [L.bestTrio, L.mostUsedTrio, L.floors.trio]
  const [tip, setTip] = useState(null)
  const closing = useRef(null)
  const hover = which => on => {
    clearTimeout(closing.current)
    if (on) setTip(which)
    else closing.current = setTimeout(() => setTip(null), 180)
  }
  useEffect(() => () => clearTimeout(closing.current), [])
  const unitProps = { size, self: L && L.self, team: L && L.team, accent }

  return (
    <div key={`lineups-${p.slug}`} className="swap-in" style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10, '--team': accent || INK }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...label }}>
        <span>{L ? `${L.season.replace('-', '–')} · ${L.team} · LINEUPS` : 'LINEUPS'}</span>
        <span>NET / 100</span>
      </div>

      {!L ? (
        <span style={{ ...label, color: FAINT, padding: '6px 0', borderTop: RULE, borderBottom: RULE }}>NO LINEUP DATA THIS SEASON</span>
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
                  <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Mate mate={m} /></span>
                  <span style={{ textAlign: 'right', color: DIM, fontSize: 9.5 }}>{mins(m.together.minutes)}</span>
                  <span style={{ textAlign: 'right', color: neutral(m.together.net) }}>{net(m.together.net)}</span>
                  <span style={{ textAlign: 'right', color: neutral(m.apart.net) }}>{net(m.apart.net)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: verdict(d) }}>{net(d)}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', borderBottom: RULE }}>
            <Unit {...unitProps} title={<>BEST <SizePicker size={size} setSize={setSize} /> · {floor}+ MINUTES</>} unit={best} empty={`NONE\n${floor}+ MIN`} onTip={hover('best')} tip={tip === 'best' && best && <RankTip unit={best} kind="BEST" size={size} floor={floor} self={L.self} onHover={hover('best')} />} style={{ padding: '8px 12px 9px 0', borderRight: RULE }} />
            <Unit {...unitProps} title={<>MOST USED <SizePicker size={size} setSize={setSize} /></>} unit={used} onTip={hover('used')} tip={tip === 'used' && used && <RankTip unit={used} kind="MOST USED" size={size} floor={floor} self={L.self} onHover={hover('used')} />} style={{ padding: '8px 0 9px 12px' }} />
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', ...label }}>
        <span>CAREER ON/OFF</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: p.onOff ? neutral(p.onOff.value) : FAINT }}>
          {p.onOff ? `${signed(p.onOff.value)} · ${ord(p.onOff.pctl).toUpperCase()} PCT` : '—'}
        </span>
      </div>
    </div>
  )
}
