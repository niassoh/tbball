import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUnits, headshotUrl } from '../api.js'
import { MONO, signed } from '../lib/format.js'
import { shortSeason } from '../lib/seasons.js'
import { asset } from '../lib/static.js'
import { rankColor, rankPct } from '../lib/swarm.js'
import { initials, teamColor } from '../lib/teams.js'
import { columns, combine, floorSteps, statsOf, tracks } from '../lib/unitsView.js'
import { useSeasonType } from '../useSeasonType.js'
import { CountUp } from './PlayerCard.jsx'

// The Team board's units view: a team's 2- to 5-man units over the board's seasons, drawn
// as a step sequencer. Each column a unit (a step), each row a player (a track), a lit cell
// where he's in it, so a lineup reads down its column and a player's load across his row.
// Over each column its minutes as a bar and its net as a lamp, blue above even and orange
// below, brighter the higher it ranks among the league's units of its size. The column
// under the pointer, or the one clicked (pinned), fills the readout: its players, ORTG,
// DRTG and net (or, RAW | REL, rORTG and rDRTG against its seasons' league), its four
// factors on each end against the team's, its shot mix, and its place on the map of the
// team's units (ORTG across, DRTG up, better up and right, net's lines at 45°). A player's
// name lights every unit he's in. Over many seasons a unit's counts are summed first
// (lib/unitsView.js). It comes in as a sequencer starts: a playhead runs the steps as they
// light; a new order slides the columns to their places (index.css .uv-*).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const TRACK = '#34312e'
const BLUE = '#8fb0e6'
const ORANGE = '#fa962a'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
// The sequencer's grid: a column's pitch, a row's height, the names' gutter, the heads'.
const COL = 22
const ROW = 26
const GUTTER = 148
const HEAD = 78
const STEP_MS = 28
const SORTS = [['min', 'Min'], ['net', 'Net'], ['ortg', 'ORTG'], ['drtg', 'DRTG']]
const SIZES = [[2, '2'], [3, '3'], [4, '4'], [5, '5']]
const READS = [['raw', 'Raw'], ['rel', 'Rel']]
const surname = name => (name || '?').split(' ').slice(1).join(' ') || name || '?'
const tone = v => (v === null ? FAINT : v >= 0 ? BLUE : ORANGE)

// Hardware keys: a row of square switches, the pressed one lit from below.
function Keys({ name, options, value, set }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ ...label, fontSize: 8.5, color: FAINT }}>{name}</span>
      <span role="group" aria-label={name} style={{ display: 'inline-flex', border: `1px solid ${EDGE}` }}>
        {options.map(([k, text], i) => (
          <button key={k} type="button" className="uv-key" aria-pressed={value === k} onClick={() => set(k)}
            style={{ minWidth: 30, height: 26, padding: '0 9px', border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: value === k ? '#3a3734' : 'transparent', boxShadow: value === k ? 'inset 0 -2px 0 var(--accent)' : 'none', color: value === k ? INK : DIM, fontFamily: MONO, fontSize: 10, fontWeight: value === k ? 700 : 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>{text}</button>
        ))}
      </span>
    </span>
  )
}

function Face({ p, size = 22, lit = true }) {
  return (
    <span className="uv-face" style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: `1px solid ${EDGE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: DIM, flex: 'none', filter: lit ? 'none' : 'grayscale(1) brightness(.7)', transition: 'filter .15s' }}>
      {p.slug && p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(p.name || '?')}
    </span>
  )
}

// The steps: each unit's column (head, then a cell per track), placed by its order so a
// new order slides them; the playhead runs them on arrival.
function Sequencer({ cols, rows, lit, hotPlayer, setHot, setHotPlayer, pinned, setPinned }) {
  const maxMin = Math.max(...cols.map(c => c.s.minutes), 1)
  const width = cols.length * COL
  const placeOf = new Map(cols.map((c, i) => [c.key, i]))
  return (
    <div className="uv-seq" style={{ position: 'relative', display: 'grid', gridTemplateColumns: `${GUTTER}px max-content`, minWidth: 'max-content' }} onMouseLeave={() => { setHot(null); setHotPlayer(null) }}>
      <div style={{ height: HEAD, display: 'flex', alignItems: 'flex-end', paddingBottom: 6, gap: 10 }}>
        <span style={{ ...label, fontSize: 8, color: FAINT, lineHeight: 1.6 }}>Net<br />Min</span>
      </div>
      <div style={{ position: 'relative', width, height: HEAD }}>
        {cols.map(c => {
          const r = c.rank ? rankPct(c.rank.rank, c.rank.of) : null
          const lamp = c.s.net >= 0 ? (r !== null && r < 0.5 ? '#6e8bbd' : BLUE) : r !== null && r >= 0.1 ? '#c98a4b' : ORANGE
          const on = c.key === lit
          return (
            <div key={c.key} className="uv-col" style={{ position: 'absolute', left: 0, top: 0, width: COL, height: HEAD, transform: `translateX(${placeOf.get(c.key) * COL}px)`, '--k': placeOf.get(c.key), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingBottom: 6, cursor: 'pointer' }}
              onMouseEnter={() => setHot(c.key)} onClick={() => setPinned(p => (p === c.key ? null : c.key))}>
              <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: on ? 700 : 500, color: on ? INK : tone(c.s.net), fontVariantNumeric: 'tabular-nums', letterSpacing: '-.04em' }}>{c.s.net >= 0 ? '+' : '−'}{Math.abs(Math.round(c.s.net))}</span>
              <span className="uv-lamp" style={{ width: 10, height: 10, background: lamp, boxShadow: on ? `0 0 0 1px ${INK}, 0 0 8px ${lamp}` : `0 0 5px ${lamp}66` }} />
              <span style={{ height: 34, display: 'flex', alignItems: 'flex-end' }}>
                <span style={{ width: 8, height: Math.max(2, Math.round((c.s.minutes / maxMin) * 34)), background: on ? INK : '#6f6a64' }} className="uv-bar" />
              </span>
            </div>
          )
        })}
      </div>
      {rows.map(p => {
        const lightRow = hotPlayer === p.id || (lit && cols.find(c => c.key === lit)?.ids.includes(p.id))
        return [
          <div key={`n${p.id}`} className="uv-track" onMouseEnter={() => { setHotPlayer(p.id); setHot(null) }}
            style={{ height: ROW, display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${RULE}`, paddingRight: 10, cursor: 'default' }}>
            <Face p={p} lit={!!lightRow} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'Montserrat, sans-serif', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: lightRow ? INK : '#c9c3bc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surname(p.name)}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT, fontVariantNumeric: 'tabular-nums' }}>{Math.round(p.minutes).toLocaleString()}</span>
          </div>,
          <div key={`r${p.id}`} style={{ position: 'relative', width, height: ROW, borderTop: `1px solid ${RULE}` }}>
            {cols.map(c => {
              const has = c.ids.includes(p.id)
              const on = c.key === lit
              const dim = (hotPlayer && !c.ids.includes(hotPlayer)) || (lit && !on && !hotPlayer)
              return (
                <span key={c.key} className="uv-cell" onMouseEnter={() => { setHot(c.key); setHotPlayer(null) }} onClick={() => setPinned(x => (x === c.key ? null : c.key))}
                  style={{ position: 'absolute', left: 0, top: 0, width: COL, height: ROW - 1, transform: `translateX(${placeOf.get(c.key) * COL}px)`, '--k': placeOf.get(c.key), display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'rgba(236,232,227,.07)' : 'transparent', cursor: 'pointer' }}>
                  {has
                    ? <span style={{ width: 14, height: 14, background: INK, boxShadow: on ? 'inset 0 -3px 0 var(--team)' : 'none', opacity: dim ? 0.22 : on ? 1 : 0.82, transition: 'opacity .15s, background .15s' }} />
                    : <span style={{ width: 3, height: 3, background: FAINT, opacity: dim ? 0.3 : 0.7 }} />}
                </span>
              )
            })}
          </div>
        ]
      })}
      <div />
      <div style={{ position: 'relative', width, height: 18, borderTop: `1px solid ${EDGE}` }}>
        {cols.map(c => {
          const i = placeOf.get(c.key)
          const on = c.key === lit
          return (
            <span key={c.key} className="uv-cell" style={{ position: 'absolute', left: 0, top: 0, width: COL, height: 17, transform: `translateX(${i * COL}px)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 7.5, color: on ? '#1c1b1a' : FAINT, background: on ? INK : 'transparent', fontVariantNumeric: 'tabular-nums' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
          )
        })}
        {pinned && placeOf.has(pinned) && <span aria-hidden="true" style={{ position: 'absolute', top: -(HEAD + rows.length * ROW + 1), left: placeOf.get(pinned) * COL, width: COL, height: HEAD + rows.length * ROW + 18, outline: `1px solid ${INK}`, outlineOffset: -1, pointerEvents: 'none', transition: 'left .4s cubic-bezier(.2,.8,.2,1)' }} />}
      </div>
      <span className="uv-playhead" aria-hidden="true" style={{ '--run': `${width}px`, '--ms': `${cols.length * STEP_MS}ms`, left: GUTTER }} />
    </div>
  )
}

// A stat on a stepped meter between `lo` and `hi`, the team's own as a tick, its value
// coloured by whether it's better than the team's (`better`: 1 higher, -1 lower).
const STEPS = 12
function Stepped({ v, team, lo, hi, better }) {
  const at = x => Math.max(0, Math.min(STEPS, Math.round(((x - lo) / (hi - lo)) * STEPS)))
  const lit = v === null ? 0 : Math.max(1, at(v))
  const c = v === null || team === null ? FAINT : (v - team) * better >= 0 ? BLUE : ORANGE
  return (
    <span style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1fr) 34px`, alignItems: 'center', gap: 8 }}>
      <span style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))`, gap: 2 }}>
        {Array.from({ length: STEPS }, (_, i) => <span key={i} style={{ height: 6, background: i < lit ? c : TRACK, opacity: i < lit ? 0.85 : 1, transition: 'background .2s' }} />)}
        {team !== null && <span title={`Team ${team.toFixed(1)}`} style={{ position: 'absolute', top: -3, bottom: -3, width: 1, left: `${(at(team) / STEPS) * 100}%`, background: INK, transition: 'left .3s cubic-bezier(.2,.8,.2,1)' }} />}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 11, textAlign: 'right', color: c, fontVariantNumeric: 'tabular-nums' }}>{v === null ? '—' : v.toFixed(1)}</span>
    </span>
  )
}
// Each factor's meter range, and which way is better for the unit on each end.
const FACTORS = [
  ['efg', 'eFG%', 40, 65, 1, -1],
  ['tov', 'TOV%', 6, 22, -1, 1],
  ['oreb', 'OREB%', 12, 42, 1, -1],
  ['ftr', 'FT rate', 10, 40, 1, -1]
]
const MIX = [['rim', 'Rim', '#d6d1cb'], ['short', 'Short', '#9d978f'], ['long', 'Long', '#6f6a64'], ['corner', 'Cnr 3', '#8fb0e6'], ['above', 'Atb 3', '#597ec1']]
function MixStrip({ mix, name }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '30px minmax(0, 1fr)', alignItems: 'center', gap: 8 }}>
      <span style={{ ...label, fontSize: 8, color: FAINT }}>{name}</span>
      <span style={{ display: 'flex', height: 12, gap: 1 }}>
        {MIX.map(([k, n, c]) => <span key={k} title={`${n} ${mix[k] === null ? '—' : `${mix[k].toFixed(0)}%`}`} style={{ flex: `${mix[k] || 0} 0 0`, background: c, transition: 'flex-grow .35s cubic-bezier(.2,.8,.2,1)' }} />)}
      </span>
    </div>
  )
}

// The unit's readout, the team's own when nothing's lit.
function Readout({ unit, view, rel, k, season }) {
  const { playerPath } = useSeasonType()
  const s = unit ? unit.s : view.teamStats
  const t = view.teamStats
  const people = unit ? unit.ids.map(id => view.players.find(p => p.id === id)).sort((a, b) => b.minutes - a.minutes) : []
  const r = unit && unit.rank
  const heads = rel ? [['rORTG', s.rortg, s.rortg], ['rDRTG', s.rdrtg, -s.rdrtg], ['Net', s.net, s.net]] : [['ORTG', s.ortg, s.rortg], ['DRTG', s.drtg, -s.rdrtg], ['Net', s.net, s.net]]
  const sub = rel ? [s.ortg, s.drtg, null] : [s.rortg, s.rdrtg, null]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px', borderBottom: `1px solid ${RULE}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...label, color: INK, fontWeight: 700 }}>{unit ? `Step ${String(unit.i + 1).padStart(2, '0')} · ${k}-man` : 'Team'}</span>
        <span style={{ ...label, marginLeft: 'auto', color: DIM }}>{Math.round(s.minutes).toLocaleString()} min</span>
        {unit && <span title={r ? `#${r.rank} of ${r.of} ${k}-man units in the league that season` : view.seasons.length > 1 ? 'Ranks are a season’s' : 'Under the league’s minutes floor'} style={{ ...label, color: r ? rankColor(rankPct(r.rank, r.of)) : FAINT }}>{r ? `#${r.rank} / ${r.of}` : view.seasons.length > 1 ? 'span' : 'unranked'}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, minHeight: 50 }}>
        {unit
          ? people.map((p, j) => (
            <Link key={p.id} to={p.slug ? playerPath(p.slug) : '#'} state={{ season }} className="uv-pop" title={p.name} onClick={e => { if (!p.slug) e.preventDefault() }}
              style={{ '--k': j, flex: '1 1 0', minWidth: 0, maxWidth: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              <Face p={p} size={34} />
              <span style={{ ...label, fontSize: 8.5, letterSpacing: '.02em', color: INK, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surname(p.name)}</span>
            </Link>
          ))
          : <span style={{ ...label, color: FAINT, alignSelf: 'center' }}>Point at a step, or click to hold it</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', border: `1px solid ${EDGE}` }}>
        {heads.map(([name, v, good], i) => (
          <div key={name} style={{ padding: '8px 10px 7px', borderLeft: i ? `1px solid ${EDGE}` : 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ ...label, fontSize: 8.5 }}>{name}</span>
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, lineHeight: 1, color: good === null ? FAINT : tone(good), fontVariantNumeric: 'tabular-nums' }}>
              <CountUp stat={{ dec: 1, relative: rel || name === 'Net' }} value={v} delay={0} />
            </span>
            <span style={{ ...label, fontSize: 8.5, color: FAINT, minHeight: 11 }}>{sub[i] === null || sub[i] === undefined ? '' : rel ? `raw ${sub[i].toFixed(1)}` : `vs lg ${signed(sub[i])}`}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '54px minmax(0, 1fr) minmax(0, 1fr)', gap: '7px 14px', alignItems: 'center' }}>
        <span />
        <span style={{ ...label, fontSize: 8, color: FAINT }}>Offense</span>
        <span style={{ ...label, fontSize: 8, color: FAINT }}>Defense</span>
        {FACTORS.map(([f, name, lo, hi, off, def]) => [
          <span key={`${f}n`} style={{ ...label, fontSize: 8.5, color: INK }}>{name}</span>,
          <Stepped key={`${f}o`} v={s.off[f]} team={unit ? t.off[f] : null} lo={lo} hi={hi} better={off} />,
          <Stepped key={`${f}d`} v={s.def[f]} team={unit ? t.def[f] : null} lo={lo} hi={hi} better={def} />
        ])}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <MixStrip name="Off" mix={s.off.mix} />
        <MixStrip name="Def" mix={s.def.mix} />
        <span style={{ display: 'flex', gap: 10, paddingLeft: 38 }}>
          {MIX.map(([key, n, c]) => <span key={key} style={{ ...label, fontSize: 7.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, background: c }} />{n}</span>)}
        </span>
      </div>
    </div>
  )
}

// The team's units on ORTG across and DRTG up (lower is better, so up), one scale on both
// so net's lines run at 45°, the team's own as a cross; REL: rORTG and rDRTG, the league
// at the cross's place. Dots by minutes.
function UnitMap({ cols, view, rel, lit, setHot, setPinned }) {
  const W = 330
  const H = 210
  const xOf = s => (rel ? s.rortg : s.ortg)
  const yOf = s => (rel ? s.rdrtg : s.drtg)
  const t = view.teamStats
  const cx = rel ? 0 : xOf(t)
  const cy = rel ? 0 : yOf(t)
  const reach = Math.max(6, ...cols.flatMap(c => [Math.abs(xOf(c.s) - cx), Math.abs(yOf(c.s) - cy)])) * 1.08
  const k = Math.min(W, H) / 2 / reach
  const px = v => W / 2 + (v - cx) * k
  const py = v => H / 2 + (v - cy) * k
  const maxMin = Math.max(...cols.map(c => c.s.minutes), 1)
  // Net's lines every 10 through the cross's place (ORTG − DRTG = the cross's net + n).
  const lines = [-20, -10, 10, 20].map(n => {
    const d = n / 2
    return { n, x1: px(cx - reach * 2 + d), y1: py(cy - reach * 2 - d), x2: px(cx + reach * 2 + d), y2: py(cy + reach * 2 - d) }
  })
  return (
    <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...label, fontSize: 8.5 }}>{rel ? 'rORTG × rDRTG' : 'ORTG × DRTG'}</span>
        <span style={{ ...label, fontSize: 8.5, color: FAINT }}>+ {rel ? 'league' : 'team'}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'hidden', border: `1px solid ${RULE}` }}>
        <defs><clipPath id="uv-map"><rect width={W} height={H} /></clipPath></defs>
        <g clipPath="url(#uv-map)">
          <rect x={W / 2} y={0} width={W / 2} height={H / 2} fill="rgba(89,126,193,.07)" />
          <rect x={0} y={H / 2} width={W / 2} height={H / 2} fill="rgba(250,150,42,.05)" />
          {lines.map(l => <line key={l.n} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={RULE} strokeDasharray="2 3" />)}
          <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke={EDGE} />
          <line y1={0} y2={H} x1={W / 2} x2={W / 2} stroke={EDGE} />
          {cols.map(c => {
            const on = c.key === lit
            return (
              <circle key={c.key} className="uv-dot" cx={px(xOf(c.s))} cy={py(yOf(c.s))} r={2.5 + 6 * Math.sqrt(c.s.minutes / maxMin)}
                fill={tone(c.s.net)} fillOpacity={on ? 1 : lit ? 0.25 : 0.6} stroke={on ? INK : 'none'} strokeWidth={1.5}
                onMouseEnter={() => setHot(c.key)} onMouseLeave={() => setHot(null)} onClick={() => setPinned(p => (p === c.key ? null : c.key))} style={{ cursor: 'pointer' }} />
            )
          })}
        </g>
        <text x={W - 6} y={12} textAnchor="end" style={{ ...label, fontSize: 7.5, fill: FAINT }}>GOOD O · GOOD D</text>
        <text x={6} y={H - 6} style={{ ...label, fontSize: 7.5, fill: FAINT }}>BAD O · BAD D</text>
      </svg>
    </div>
  )
}

// `seasons`: the board's (oldest first); `teams`: [{ team, name }] for the channel strip.
export default function UnitsView({ team, seasons, teams, setTeam, onClose, size = 5 }) {
  // The files for the team and seasons last fetched; the previous ones stay up, dimmed,
  // till the next arrive.
  const [got, setGot] = useState(null)
  const [k, setK] = useState(size)
  const [sort, setSort] = useState('min')
  const [read, setRead] = useState('raw')
  const [step, setStep] = useState(0)
  const [hot, setHot] = useState(null)
  const [hotPlayer, setHotPlayer] = useState(null)
  const [pinned, setPinned] = useState(null)
  const seasonsKey = seasons.join()
  useEffect(() => {
    let live = true
    Promise.all(seasons.map(s => fetchUnits(s, team).catch(() => null))).then(list => live && setGot({ key: `${team}|${seasonsKey}`, docs: list.filter(Boolean) }))
    return () => { live = false }
  }, [team, seasonsKey]) // eslint-disable-line react-hooks/exhaustive-deps -- seasons is seasonsKey's
  useEffect(() => {
    const escape = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])
  const docs = got && got.docs
  const loading = !got || got.key !== `${team}|${seasonsKey}`
  const view = useMemo(() => {
    if (!docs || !docs.length) return null
    const v = combine(docs)
    return { ...v, teamStats: statsOf(v.total, v.fields) }
  }, [docs])
  const floors = view ? floorSteps(view, k) : []
  const cols = useMemo(() => (view ? columns(view, k, { floor: floors[step], sort }).map((c, i) => ({ ...c, i })) : []), [view, k, sort, step]) // eslint-disable-line react-hooks/exhaustive-deps -- floors follow view and k
  const rows = useMemo(() => (view ? tracks(view, cols) : []), [view, cols])
  const lit = hot || pinned
  const unit = cols.find(c => c.key === lit) || null
  const color = teamColor(team) || INK
  const name = (teams.find(x => x.team === team) || {}).name || team
  const span = seasons.length > 1 ? `${shortSeason(seasons[0])}–${shortSeason(seasons[seasons.length - 1])}` : seasons[0].replace('-', '–')
  return (
    <div className="uv lb-enter" style={{ '--team': color, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: `1px solid ${RULE}`, background: '#262422', fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderBottom: `1px solid ${RULE}` }}>
        <img src={asset(`logos/color/sm/${team}.webp`)} alt="" width={30} height={30} style={{ flex: 'none' }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ ...label, fontSize: 8.5, color: FAINT, whiteSpace: 'nowrap' }}>Units · {span}</span>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 17, fontWeight: 800, textTransform: 'uppercase', color: INK, lineHeight: 1, whiteSpace: 'nowrap' }}>{name}</span>
        </span>
        <span role="group" aria-label="Team" className="uv-channels" style={{ marginLeft: 'auto', display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none', minWidth: 0 }}>
          {teams.map(x => (
            <button key={x.team} type="button" aria-pressed={x.team === team} title={x.name} onClick={() => { setTeam(x.team); setPinned(null) }}
              style={{ flex: 'none', width: 24, height: 24, padding: 2, border: `1px solid ${x.team === team ? INK : 'transparent'}`, background: x.team === team ? '#3a3734' : 'transparent', cursor: 'pointer', opacity: x.team === team ? 1 : 0.5 }} className="uv-channel">
              <img src={asset(`logos/color/sm/${x.team}.webp`)} alt={x.team} width={18} height={18} style={{ display: 'block' }} />
            </button>
          ))}
        </span>
        <button type="button" aria-label="Close units" onClick={onClose} style={{ flex: 'none', width: 24, height: 24, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '9px 14px', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap' }}>
        <Keys name="Size" options={SIZES} value={k} set={x => { setK(x); setStep(0); setPinned(null) }} />
        <Keys name="Order" options={SORTS} value={sort} set={setSort} />
        <Keys name="Min ≥" options={floors.map((m, i) => [i, String(m)])} value={step} set={x => { setStep(x); setPinned(null) }} />
        <span style={{ marginLeft: 'auto' }}><Keys name="Ratings" options={READS} value={read} set={setRead} /></span>
      </div>
      {docs === null && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="lb-skel" style={{ width: '60%', height: 220 }} /></div>}
      {docs && !view && <div style={{ ...label, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No units for {team} in {span}</div>}
      {view && (
        <div className="uv-main" style={{ opacity: loading ? 0.4 : 1, transition: 'opacity .25s ease', flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px' }}>
          <div className="uv-seq-wrap" style={{ minWidth: 0, minHeight: 0, overflow: 'auto', padding: '6px 14px 14px' }}>
            {cols.length
              ? <Sequencer key={`${got.key}|${k}|${step}`} cols={cols} rows={rows} lit={lit} hotPlayer={hotPlayer} setHot={setHot} setHotPlayer={setHotPlayer} pinned={pinned} setPinned={setPinned} />
              : <div style={{ ...label, padding: 30 }}>No {k}-man units at {floors[step]}+ min</div>}
          </div>
          <div className="uv-side" style={{ minHeight: 0, overflow: 'auto', borderLeft: `1px solid ${RULE}` }}>
            <Readout unit={unit} view={view} rel={read === 'rel'} k={k} season={seasons[seasons.length - 1]} />
            <UnitMap cols={cols} view={view} rel={read === 'rel'} lit={lit} setHot={setHot} setPinned={setPinned} />
          </div>
        </div>
      )}
    </div>
  )
}
