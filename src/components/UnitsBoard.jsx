import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { fetchUnits, headshotUrl } from '../api.js'
import { MONO, heat, signed } from '../lib/format.js'
import { asset } from '../lib/static.js'
import { initials } from '../lib/teams.js'
import { combine, statsOf, teamRow } from '../lib/unitsView.js'

// The Team board's UNITS mode: the 30 teams ranked by their units of one size (2 to 5) over
// the board's seasons (lib/unitsView.js teamRow), in the board's own shape. On the right a
// table: each team's most-used unit (its faces), its minutes and share of the team's, its
// net, ORTG and DRTG; the team's net in every other minute (REST); its best unit over the
// league's minutes floor and that unit's league rank; how many units clear the floor, and
// the share of their minutes in units that won them (+MIN). Every number shaded by its
// place among the 30, as the board's are. On the left the unit field: a row per team in
// the table's order, each of its units a dot along net (its area its minutes), the team's
// own net a white tick, its most-used unit ringed, so where a team's minutes sit, and how
// far apart its good and bad units are, read at a glance. It comes in as a sequencer
// starts: a playhead crosses the field, lighting each dot as it passes. A team under the
// pointer in either is lit in the other; a click opens its units (UnitsView).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const BLUE = '#8fb0e6'
const ORANGE = '#fa962a'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const tone = v => (v === null || v === undefined ? FAINT : v >= 0 ? BLUE : ORANGE)

// Each season's 30 unit files, fetched once a session.
const FILES = new Map()
const unitsFile = (season, team) => {
  const key = `${season}|${team}`
  if (!FILES.has(key)) FILES.set(key, fetchUnits(season, team).catch(() => null))
  return FILES.get(key)
}
// Every team's units over `seasons`, combined (lib/unitsView.js combine), with how many of
// its files are in (`got` of `of`) so the table fills in as they arrive.
function useLeague(seasons, teams) {
  const [state, setState] = useState({ key: null, views: new Map(), got: 0 })
  const key = `${seasons.join()}|${teams.join()}`
  useEffect(() => {
    let live = true
    let got = 0
    const views = new Map()
    Promise.all(teams.map(team => Promise.all(seasons.map(s => unitsFile(s, team))).then(docs => {
      const have = docs.filter(Boolean)
      if (have.length) {
        const v = combine(have)
        views.set(team, { ...v, teamStats: statsOf(v.total, v.fields) })
      }
      got++
      // In batches, so 30 arrivals don't each redraw the board.
      if (live && (got % 10 === 0 || got === teams.length)) setState({ key, views: new Map(views), got })
    })))
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- seasons and teams are key's
  return { views: state.key === key ? state.views : new Map(), loading: state.key !== key || state.got < teams.length }
}

// The table's columns: a label, the value from a team's row, how it prints, and which way
// is better (1 higher, -1 lower, 0 unshaded).
const COLS = [
  { id: 'min', name: 'Min', v: r => r.top && r.top.s.minutes, text: v => Math.round(v).toLocaleString(), better: 0, title: 'The most-used unit’s minutes' },
  { id: 'share', name: 'Share', v: r => r.share, text: v => `${v.toFixed(0)}%`, better: 0, title: 'Its share of the team’s minutes: how settled the rotation is' },
  { id: 'net', name: 'Net', v: r => r.top && r.top.s.net, text: v => signed(v), better: 1, title: 'Its net rating (ORTG − DRTG)' },
  { id: 'ortg', name: 'ORTG', v: r => r.top && r.top.s.ortg, text: v => v.toFixed(1), better: 1 },
  { id: 'drtg', name: 'DRTG', v: r => r.top && r.top.s.drtg, text: v => v.toFixed(1), better: -1 },
  { id: 'rest', name: 'Rest net', v: r => r.rest && r.rest.net, text: v => signed(v), better: 1, title: 'The team’s net in every other minute' },
  { id: 'best', name: 'Best net', v: r => r.best && r.best.s.net, text: v => signed(v), better: 1, title: 'Its best unit over the league’s minutes floor' },
  { id: 'rank', name: 'Best #', v: r => r.best && r.best.rank && r.best.rank.rank, text: (v, r) => `${v}/${r.best.rank.of}`, better: -1, title: 'That unit’s rank among the league’s' },
  { id: 'over', name: 'Units', v: r => r.over, text: v => String(v), better: 0, title: 'Units over the league’s minutes floor' },
  { id: 'positive', name: '+Min', v: r => r.positive, text: v => `${v.toFixed(0)}%`, better: 1, title: 'Share of those units’ minutes in units with a positive net' }
]
// A value's place among the 30 as a percentile (100 the best), for its shade.
const percentiles = (rows, col) => {
  const vals = rows.map(r => col.v(r)).filter(v => v !== null && v !== undefined)
  return v => {
    if (v === null || v === undefined || !col.better || vals.length < 2) return null
    const below = vals.filter(x => (x - v) * col.better < 0).length
    return (100 * below) / (vals.length - 1)
  }
}

function Faces({ ids, view }) {
  return (
    <span style={{ display: 'inline-flex' }}>
      {ids.map((id, j) => {
        const p = view.players.find(x => x.id === id) || { name: '?' }
        return (
          <span key={id} title={p.name} style={{ width: 20, height: 20, marginLeft: j ? -4 : 0, borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: '1px solid #262422', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: DIM, flex: 'none' }}>
            {p.slug && p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={20} height={20} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(p.name || '?')}
          </span>
        )
      })}
    </span>
  )
}

const td = { height: 30, padding: '0 8px', borderBottom: `1px solid ${RULE}`, textAlign: 'right', whiteSpace: 'nowrap' }
const Row = memo(function Row({ r, rank, pct, on, setHot, onPick }) {
  return (
    <tr className="lb-row" aria-selected={on} onMouseEnter={() => setHot(r.code)} onMouseLeave={() => setHot(null)} onClick={() => onPick(r.code)}>
      <td style={{ ...td, textAlign: 'center', padding: 0, color: DIM, fontSize: 11 }}>{rank}</td>
      <td style={{ ...td, textAlign: 'left', borderRight: `1px solid ${RULE}` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src={asset(`logos/color/sm/${r.code}.webp`)} alt="" width={20} height={20} style={{ flex: 'none' }} />
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: INK }}>{r.name}</span>
        </span>
      </td>
      <td style={{ ...td, textAlign: 'left' }}>{r.top ? <Faces ids={r.top.ids} view={r.view} /> : <span style={{ color: FAINT }}>—</span>}</td>
      {COLS.map(c => {
        const v = c.v(r)
        const p = pct[c.id](v)
        return <td key={c.id} style={{ ...td, background: p === null ? undefined : heat(p), color: v === null || v === undefined ? FAINT : INK }}>{v === null || v === undefined ? '—' : c.text(v, r)}</td>
      })}
    </tr>
  )
})

// The unit field: a row per team (`rows`, in the table's order), its units along net.
const NET = 30
const GUTTER = 34
function Field({ rows, k, hot, setHot, onPick }) {
  const box = useRef(null)
  const [size, setSize] = useState({ w: 560, h: 600 })
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const [tip, setTip] = useState(null)
  const { w, h } = size
  const top = 26
  const rowH = rows.length ? Math.max(12, (h - top - 8) / rows.length) : 20
  const x = v => GUTTER + 8 + ((Math.max(-NET, Math.min(NET, v)) + NET) / (2 * NET)) * (w - GUTTER - 20)
  const maxMin = Math.max(1, ...rows.flatMap(r => (r.view ? r.view.units[k] : []).map(u => u.seconds / 60)))
  const radius = m => 1.2 + 6 * Math.sqrt(m / maxMin)
  const run = 1100
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => { setHot(null); setTip(null) }}>
      <svg width={w} height={h} style={{ display: 'block' }}>
        {[-20, -10, 0, 10, 20].map(t => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 6} y2={h - 6} stroke={t ? RULE : EDGE} strokeDasharray={t ? '2 4' : undefined} />
            <text x={x(t)} y={top - 11} textAnchor="middle" style={{ ...label, fontSize: 8, fill: t ? FAINT : DIM, letterSpacing: '.04em' }}>{t > 0 ? `+${t}` : t === 0 ? 'NET 0' : t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = top + i * rowH + rowH / 2
          const lit = hot === r.code
          const dim = hot && !lit
          // Units with half the league's minutes floor, so the field isn't the small ones' noise.
          const units = r.view ? r.view.units[k].map(u => ({ u, s: statsOf(u, r.view.fields) })).filter(d => d.s.net !== null && d.s.minutes >= r.view.floors[k] / 2).sort((a, b) => b.s.minutes - a.s.minutes) : []
          return (
            <g key={r.code} className="uf-row" opacity={dim ? 0.28 : 1} style={{ transition: 'opacity .15s' }} onMouseEnter={() => setHot(r.code)} onClick={() => onPick(r.code)} cursor="pointer">
              <rect x={0} y={y - rowH / 2} width={w} height={rowH} fill={lit ? 'rgba(236,232,227,.05)' : 'transparent'} />
              <image href={asset(`logos/color/sm/${r.code}.webp`)} x={4} y={y - 8} width={16} height={16} />
              <line x1={GUTTER} x2={w - 6} y1={y} y2={y} stroke={RULE} />
              {units.map(({ u, s }, j) => {
                const cx = x(s.net)
                // The biggest on the line, the rest a little above or below in turn.
                const dy = j === 0 ? 0 : ((j % 2 ? -1 : 1) * Math.ceil(j / 2) * rowH) / 9 % (rowH / 2.6)
                return (
                  <circle key={u.key} className="uf-dot" cx={cx} cy={y + dy} r={radius(s.minutes)} fill={tone(s.net)} fillOpacity={j === 0 ? 0.95 : 0.5}
                    stroke={j === 0 ? INK : 'none'} strokeWidth={1.2} style={{ animationDelay: `${Math.round(((cx - GUTTER) / (w - GUTTER)) * run)}ms` }}
                    onMouseEnter={() => setTip({ x: cx, y: y + dy, r, u, s })} onMouseLeave={() => setTip(null)} />
                )
              })}
              {r.team.net !== null && <rect x={x(r.team.net) - 1} y={y - rowH / 2 + 3} width={2} height={rowH - 6} fill={INK} className="uf-dot" style={{ animationDelay: `${run}ms` }} />}
            </g>
          )
        })}
        <rect className="uf-playhead" x={GUTTER} y={top - 6} width={2} height={h - top} style={{ '--run': `${w - GUTTER}px`, '--ms': `${run}ms` }} />
      </svg>
      {tip && (
        <div style={{ position: 'absolute', left: Math.min(tip.x + 10, w - 230), top: tip.y + 10, width: 220, padding: '8px 10px', background: 'rgba(28,27,26,.94)', border: `1px solid ${EDGE}`, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ ...label, color: INK }}>{tip.r.code} · {k}-man</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: INK, lineHeight: 1.35 }}>{tip.u.ids.map(id => ((tip.r.view.players.find(p => p.id === id) || {}).name || '?').split(' ').slice(1).join(' ')).join(' · ')}</span>
          <span style={{ ...label, display: 'flex', gap: 10 }}>
            <span>{Math.round(tip.s.minutes)} min</span>
            <span style={{ color: tone(tip.s.net) }}>{signed(tip.s.net)}</span>
            <span>{tip.s.ortg.toFixed(1)} / {tip.s.drtg.toFixed(1)}</span>
          </span>
        </div>
      )}
    </div>
  )
}

// `teams`: [{ team, name }]; `seasons`: the board's; `k`: the unit size.
export default function UnitsBoard({ teams, seasons, k, onPick }) {
  const codes = useMemo(() => teams.map(t => t.team), [teams])
  const { views, loading } = useLeague(seasons, codes)
  const [sort, setSort] = useState({ id: 'min', reverse: false })
  const [hot, setHot] = useState(null)
  const rows = useMemo(() => teams.filter(t => views.has(t.team)).map(t => {
    const view = views.get(t.team)
    return { code: t.team, name: t.name, view, ...teamRow(view, k) }
  }), [teams, views, k])
  const col = COLS.find(c => c.id === sort.id)
  const sorted = useMemo(() => {
    const dir = (col.better || 1) * (sort.reverse ? -1 : 1)
    const v = r => col.v(r)
    return [...rows].sort((a, b) => (v(a) === null || v(a) === undefined) - (v(b) === null || v(b) === undefined) || (v(b) - v(a)) * dir)
  }, [rows, col, sort.reverse])
  const pct = useMemo(() => Object.fromEntries(COLS.map(c => [c.id, percentiles(rows, c)])), [rows])
  const head = { position: 'sticky', top: 0, zIndex: 2, height: 46, boxSizing: 'border-box', padding: '15px 8px 6px', borderBottom: `1px solid ${RULE}`, background: '#262422', textAlign: 'right', verticalAlign: 'bottom' }
  return (
    <div className={`lb-body tb-body${loading ? ' lb-loading' : ''}`}>
      {loading && <div className="lb-progress"><span style={{ transform: `scaleX(${rows.length / Math.max(1, teams.length)})` }} /></div>}
      <div className="lb-side" style={{ padding: '10px 12px 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 2 }}>
          <span style={{ ...label, color: INK }}>Unit field · {k}-man</span>
          <span style={{ ...label, fontSize: 8.5, color: FAINT }}>dot: unit · size: min · ring: most used · tick: team</span>
        </div>
        {rows.length > 0 && <Field key={`${seasons.join()}|${k}`} rows={sorted} k={k} hot={hot} setHot={setHot} onPick={onPick} />}
      </div>
      <div className="lb-table-wrap" style={{ scrollSnapType: 'none' }}>
        <table className="lb-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              <th style={{ ...head, width: 30, textAlign: 'center', padding: '15px 0 6px' }}><span style={label}>#</span></th>
              <th style={{ ...head, textAlign: 'left', borderRight: `1px solid ${RULE}` }}><span style={label}>Team</span></th>
              <th style={{ ...head, textAlign: 'left' }}><span style={label}>Most used</span></th>
              {COLS.map(c => {
                const on = sort.id === c.id
                return (
                  <th key={c.id} style={{ ...head, minWidth: 58, boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none' }} aria-sort={on ? (sort.reverse ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="lb-head-cell" title={[c.title, 'Sort by this; again to flip'].filter(Boolean).join(' · ')} onClick={() => setSort(s => ({ id: c.id, reverse: s.id === c.id ? !s.reverse : false }))}
                      style={{ ...label, display: 'inline-flex', alignItems: 'flex-end', gap: 3, padding: 0, border: 0, background: 'transparent', color: on ? INK : DIM, cursor: 'pointer' }}>
                      {c.name}<span aria-hidden="true" style={{ width: 7, color: INK }}>{on ? (sort.reverse ? '↑' : '↓') : ''}</span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => <Row key={r.code} r={r} rank={i + 1} pct={pct} on={hot === r.code} setHot={setHot} onPick={onPick} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
