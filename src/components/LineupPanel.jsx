import { useEffect, useMemo, useRef, useState } from 'react'
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
const TILE = 42
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
    <span title={player.name || ''} style={{ display: 'flex', flexDirection: 'column', gap: 4, width: size, minWidth: 0, flex: 'none' }}>
      {player.slug && !self ? <Link to={`/player/${player.slug}`} style={{ display: 'block' }}>{box}</Link> : box}
      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '.02em', textTransform: 'uppercase', textAlign: small ? 'center' : 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: small ? 'clip' : 'ellipsis', fontWeight: self ? 700 : 400, color: self ? INK : DIM }}>
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

// A unit's net. Hovering (or focusing) it opens the rank tooltip over the lineup row.
function Net({ unit, onTip }) {
  return (
    <span tabIndex={0} onMouseEnter={() => onTip(true)} onMouseLeave={() => onTip(false)} onFocus={() => onTip(true)} onBlur={() => onTip(false)}
      style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1, color: verdict(unit.net), cursor: 'default', borderBottom: `1px dotted ${FAINT}`, paddingBottom: 1, outline: 'none' }}>
      {net(unit.net)}
    </span>
  )
}

const SW = 400
const SH = 64

// The rank tooltip: the unit, its league rank among units of its size over the minutes
// floor (coloured blue to orange by where it falls), and a swarm of every such unit's
// net with this one marked. It stays open while the pointer is over it, and hovering
// the swarm reads out the net and league rank under the pointer. The league pool is
// fetched on the first hover.
function RankTip({ unit, kind, size, floor, self, onHover }) {
  const [league, setLeague] = useState(null)
  const [probe, setProbe] = useState(null)
  useEffect(() => {
    let live = true
    loadLineupLeague().then(d => live && setLeague(d)).catch(() => {})
    return () => { live = false }
  }, [])
  const nets = league ? (size === 5 ? league.five : league.trio) : null
  const sw = useMemo(() => nets && swarm(nets, { width: SW, height: SH }), [nets])
  const r = unit.rank
  const tone = r ? rankColor(rankPct(r.rank, r.of)) : FAINT
  const names = [self, ...unit.mates].map(m => (m.name ? lastName(m.name) : '?')).join(' · ')
  const median = nets ? nets[Math.floor(nets.length / 2)] : null
  return (
    <div role="tooltip" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 6px)', zIndex: 20, background: '#1f1d1c', border: '1px solid #6b655f', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, ...label }}>
        <span>{kind} {size}-MAN</span>
        <span>{floor}+ MIN · NET / 100</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{names}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, borderTop: RULE, paddingTop: 8 }}>
        {r ? (
          <>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, lineHeight: 1, color: tone }}>{ord(r.rank).toUpperCase()}</span>
            <span style={{ ...label, fontSize: 10 }}>OF {r.of.toLocaleString()} {size}-MAN UNITS</span>
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#1f1d1c', background: tone, padding: '2px 6px' }}>{rankLabel(r.rank, r.of)}</span>
          </>
        ) : (
          <>
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, lineHeight: 1, color: FAINT }}>UNRANKED</span>
            <span style={{ ...label, fontSize: 10 }}>UNDER {floor} MIN TOGETHER</span>
          </>
        )}
      </div>
      {sw ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <svg viewBox={`0 -6 ${SW} ${SH + 12}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', cursor: 'crosshair' }}
            onMouseMove={e => {
              const box = e.currentTarget.getBoundingClientRect()
              const v = sw.value(((e.clientX - box.left) / box.width) * SW)
              setProbe({ v, rank: nets.filter(n => n > v).length + 1 })
            }}
            onMouseLeave={() => setProbe(null)}>
            <rect x={0} y={-6} width={SW} height={SH + 12} fill="transparent" />
            <line x1={sw.x(0)} x2={sw.x(0)} y1={-4} y2={SH + 4} stroke={FAINT} strokeDasharray="2 3" />
            {sw.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={1.6} fill={rankColor(sw.dots.length > 1 ? i / (sw.dots.length - 1) : 1)} opacity={0.6} />)}
            <line x1={sw.x(unit.net)} x2={sw.x(unit.net)} y1={-6} y2={SH + 6} stroke={INK} strokeWidth={1.5} />
            <circle cx={sw.x(unit.net)} cy={SH / 2} r={4.5} fill={tone} stroke={INK} strokeWidth={1.5} />
            {probe && <line x1={sw.x(probe.v)} x2={sw.x(probe.v)} y1={-6} y2={SH + 6} stroke={DIM} strokeDasharray="1 2" pointerEvents="none" />}
          </svg>
          <div style={{ position: 'relative', height: 10, ...label, fontSize: 8 }}>
            <span style={{ position: 'absolute', left: 0 }}>{signed(sw.lo, 0)}</span>
            <span style={{ position: 'absolute', left: `${(sw.x(0) / SW) * 100}%`, transform: 'translateX(-50%)' }}>0</span>
            <span style={{ position: 'absolute', right: 0 }}>{signed(sw.hi, 0)}</span>
          </div>
        </div>
      ) : (
        <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', ...label, color: FAINT }}>LOADING LEAGUE…</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, ...label, fontSize: 8.5 }}>
        <span><span style={{ color: verdict(unit.net), fontWeight: 700 }}>{net(unit.net)}</span> NET · {mins(unit.minutes)} MIN</span>
        {probe
          ? <span>AT <span style={{ color: INK, fontWeight: 700 }}>{signed(probe.v)}</span> · <span style={{ color: rankColor(rankPct(probe.rank, nets.length)), fontWeight: 700 }}>{ord(probe.rank).toUpperCase()}</span> OF {nets.length.toLocaleString()}</span>
          : median !== null && <span>LEAGUE MEDIAN {signed(median)}</span>}
      </div>
    </div>
  )
}

// One unit he plays in: him and his teammates in it as tiles, then its net and minutes
// (and its share of his minutes when it's his most-used). Without a unit over the
// floor, the same frame shows empty tiles. The row keeps one height for both sizes.
function Unit({ title, unit, size, self, team, accent, empty, style, onTip }) {
  const small = size === 5
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0, ...style }}>
      <span style={{ ...label, display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ height: TILE + 13, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: small ? 2 : 4, flex: 1, minWidth: 0 }}>
          {unit
            ? [self, ...unit.mates].map((pl, i) => <Tile key={i} player={pl} team={team} accent={accent} self={i === 0} small={small} />)
            : Array.from({ length: size }, (_, i) => <span key={i} style={{ width: small ? SMALL : TILE, height: small ? SMALL : TILE, flex: 'none', borderRadius: '50%', border: '1px dashed #4a4643' }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flex: 'none' }}>
          {unit ? <Net unit={unit} onTip={onTip} /> : <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1, color: FAINT }}>—</span>}
          <span style={{ ...label, fontSize: 8, whiteSpace: 'nowrap' }}>{unit ? `${mins(unit.minutes)} MIN` : empty}</span>
          {unit && unit.share !== undefined && <span style={{ ...label, fontSize: 8, whiteSpace: 'nowrap' }}>{unit.share}% OF MIN</span>}
        </div>
      </div>
    </div>
  )
}

const mateGrid = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px 44px 44px 40px', columnGap: 6, alignItems: 'baseline' }

// The bio card's lineup module. First his most-shared teammates, with the team's net
// with both on (WITH) and with him on and the teammate off (APART); Δ = WITH − APART,
// so the teammates he wins with read blue. Then side by side his best and his most-used
// three-man unit (best: 250+ min) as headshot tiles, switchable to five-man units (best:
// 100+ min); each net shows its league rank on hover. Then his career on/off.
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
  const tipUnit = tip === 'best' ? best : tip === 'used' ? used : null

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
              <span>TEAMMATES</span>
              <span style={{ textAlign: 'right' }}>SHARED</span>
              <span style={{ textAlign: 'right' }}>WITH</span>
              <span style={{ textAlign: 'right' }}>APART</span>
              <span style={{ textAlign: 'right' }}>Δ</span>
            </div>
            {L.mates.map((m, i) => {
              const d = m.together.net !== null && m.apart.net !== null ? m.together.net - m.apart.net : null
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

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', borderBottom: RULE }}>
            <Unit {...unitProps} title={<>BEST <SizePicker size={size} setSize={setSize} /> · {floor}+</>} unit={best} empty={`NONE ${floor}+ MIN`} onTip={hover('best')} style={{ padding: '8px 12px 9px 0', borderRight: RULE }} />
            <Unit {...unitProps} title={<>MOST USED <SizePicker size={size} setSize={setSize} /></>} unit={used} onTip={hover('used')} style={{ padding: '8px 0 9px 12px' }} />
            {tipUnit && <RankTip unit={tipUnit} kind={tip === 'best' ? 'BEST' : 'MOST USED'} size={size} floor={floor} self={L.self} onHover={hover(tip)} />}
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
