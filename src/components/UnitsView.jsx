import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUnits, headshotUrl } from '../api.js'
import { MONO, signed } from '../lib/format.js'
import { shortSeason } from '../lib/seasons.js'
import { asset } from '../lib/static.js'
import { rankColor, rankPct } from '../lib/swarm.js'
import { initials } from '../lib/teams.js'
import { columns, combine, floorSteps, statsOf, tracks } from '../lib/unitsView.js'
import { useSeasonType } from '../useSeasonType.js'
import { CountUp } from './PlayerCard.jsx'

// The Team board's units view: a team's 2- to 5-man units over the board's seasons. On the
// left a table, a unit a row: its minutes, net (tinted blue above even and orange below,
// stronger the bigger), ORTG and DRTG (or, RAW | REL, rORTG and rDRTG against its seasons'
// league), then a column for each player, his face and slanted name at its head, a dot where he's in the
// unit. A header sorts by its stat. On the right the team's units on ORTG × DRTG, and under
// it the readout of the unit under the pointer, or the one clicked (pinned), else the
// team's: its players, ratings, league rank, four factors on each end (blue where better
// than the team's) and shot mix. A player's face lights the units he's in and dims the
// rest. Over many seasons a unit's counts are summed first (lib/unitsView.js). The rows
// come in with a short stagger (index.css .uv-row).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const BLUE = '#8fb0e6'
const ORANGE = '#fa962a'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
// The table's grid: the stats' columns, a player's column, a row's height, the head's.
const STAT_COLS = '18px 42px 42px 38px 38px'
const PCOL = 21
const ROW = 22
const HEAD = 92
const NAME_RUN = 44
const READS = [['raw', 'Raw'], ['rel', 'Rel']]
const surname = name => (name || '?').split(' ').slice(1).join(' ') || name || '?'
const tone = v => (v === null ? FAINT : v >= 0 ? BLUE : ORANGE)
// Net's tint, as the board's cells: blue above even, orange below, full by 25.
const netTint = v => (v === null ? 'transparent' : `rgba(${v >= 0 ? '89,126,193' : '250,150,42'},${(0.1 + 0.5 * Math.min(1, Math.abs(v) / 25)).toFixed(2)})`)

// Hardware keys: a row of square switches, the pressed one lit from below.
// `bare`: no name shown (still the group's label).
function Keys({ name, options, value, set, bare = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {!bare && <span style={{ ...label, fontSize: 8, color: FAINT }}>{name}</span>}
      <span role="group" aria-label={name} style={{ display: 'inline-flex', border: `1px solid ${EDGE}` }}>
        {options.map(([k, text], i) => (
          <button key={k} type="button" className="uv-key" aria-pressed={value === k} onClick={() => set(k)}
            style={{ minWidth: 24, height: 20, padding: '0 6px', border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: value === k ? '#3a3734' : 'transparent', boxShadow: value === k ? 'inset 0 -2px 0 var(--accent)' : 'none', color: value === k ? INK : DIM, fontFamily: MONO, fontSize: 9, fontWeight: value === k ? 700 : 500, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer' }}>{text}</button>
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

// The units, a row each; the stat headers sort (`sort`, `setSort`).
const SORT_HEADS = [['min', 'Min'], ['net', 'Net'], ['ortg', 'ORTG'], ['drtg', 'DRTG']]
function UnitTable({ cols, rows, rel, sort, setSort, lit, hotPlayer, setHot, setHotPlayer, pinned, setPinned }) {
  // The last column's room for the slanted names to run past the faces.
  const grid = `${STAT_COLS} repeat(${rows.length}, ${PCOL}px) ${NAME_RUN}px`
  const litUnit = cols.find(c => c.key === lit)
  const cell = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontFamily: MONO, fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }
  return (
    <div style={{ minWidth: 'max-content' }} onMouseLeave={() => { setHot(null); setHotPlayer(null) }}>
      <div className="uv-head" style={{ display: 'grid', gridTemplateColumns: grid, height: HEAD, alignItems: 'end', borderBottom: `1px solid ${EDGE}`, position: 'sticky', top: 0, background: '#262422', zIndex: 1 }}>
        <span style={{ ...label, fontSize: 8, color: FAINT, paddingBottom: 6 }}>#</span>
        {SORT_HEADS.map(([key, name]) => {
          const on = sort === key
          const text = rel && key === 'ortg' ? 'rORTG' : rel && key === 'drtg' ? 'rDRTG' : name
          return (
            <button key={key} type="button" className="uv-key" onClick={() => setSort(key)} aria-pressed={on} title={`Sort by ${text}`}
              style={{ ...label, fontSize: 8.5, height: 24, padding: '0 6px 0 0', border: 0, background: 'transparent', color: on ? INK : DIM, fontWeight: on ? 700 : 400, textAlign: 'right', cursor: 'pointer', boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none', whiteSpace: 'nowrap' }}>{text}</button>
          )
        })}
        {rows.map(p => {
          const on = hotPlayer === p.id || (litUnit ? litUnit.ids.includes(p.id) : !hotPlayer)
          return (
            <span key={p.id} onMouseEnter={() => { setHotPlayer(p.id); setHot(null) }} title={`${p.name} · ${Math.round(p.minutes).toLocaleString()} min`}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 5, height: '100%', justifyContent: 'flex-end', cursor: 'default', background: hotPlayer === p.id ? 'rgba(236,232,227,.06)' : 'transparent' }}>
              <span style={{ position: 'absolute', left: '50%', bottom: 30, transform: 'rotate(-45deg)', transformOrigin: '0 100%', fontFamily: 'Montserrat, sans-serif', fontSize: 9, fontWeight: 800, letterSpacing: '.03em', textTransform: 'uppercase', color: on ? INK : DIM, whiteSpace: 'nowrap', pointerEvents: 'none', transition: 'color .15s' }}>{surname(p.name)}</span>
              <Face p={p} size={18} lit={on} />
            </span>
          )
        })}
      </div>
      {cols.map((c, i) => {
        const on = c.key === lit
        const dim = hotPlayer && !c.ids.includes(hotPlayer)
        const o = rel ? c.s.rortg : c.s.ortg
        const d = rel ? c.s.rdrtg : c.s.drtg
        return (
          <div key={c.key} className="uv-row" onMouseEnter={() => { setHot(c.key); setHotPlayer(null) }} onClick={() => setPinned(x => (x === c.key ? null : c.key))}
            style={{ '--k': i, display: 'grid', gridTemplateColumns: grid, height: ROW, borderBottom: `1px solid ${RULE}`, background: on ? 'rgba(236,232,227,.06)' : 'transparent', outline: pinned === c.key ? `1px solid ${INK}` : 'none', outlineOffset: -1, opacity: dim ? 0.28 : 1, cursor: 'pointer', transition: 'opacity .15s, background .12s' }}>
            <span style={{ ...cell, justifyContent: 'flex-start', fontSize: 8.5, color: FAINT }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ ...cell, color: DIM }}>{Math.round(c.s.minutes).toLocaleString()}</span>
            <span style={{ ...cell, background: netTint(c.s.net), color: INK, fontWeight: 700 }}>{signed(c.s.net)}</span>
            <span style={{ ...cell, color: rel ? tone(o) : INK }}>{o === null ? '—' : rel ? signed(o) : o.toFixed(1)}</span>
            <span style={{ ...cell, color: rel ? tone(d === null ? null : -d) : INK }}>{d === null ? '—' : rel ? signed(d) : d.toFixed(1)}</span>
            {rows.map(p => (
              <span key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: hotPlayer === p.id ? 'rgba(236,232,227,.06)' : 'transparent' }}>
                {c.ids.includes(p.id) && <span style={{ width: 9, height: 9, borderRadius: '50%', background: INK, opacity: on ? 1 : 0.7 }} />}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// Each factor, and which way is better for the unit on each end.
const FACTORS = [
  ['efg', 'eFG%', 1, -1],
  ['tov', 'TOV%', -1, 1],
  ['oreb', 'OREB%', 1, -1],
  ['ftr', 'FT rate', 1, -1]
]
const MIX = [['rim', 'Rim', '#d6d1cb'], ['short', 'Short', '#9d978f'], ['long', 'Long', '#6f6a64'], ['corner', 'Cnr 3', '#8fb0e6'], ['above', 'Atb 3', '#597ec1']]
function MixStrip({ mix, name }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', alignItems: 'center', gap: 6 }}>
      <span style={{ ...label, fontSize: 8, color: FAINT }}>{name}</span>
      <span style={{ display: 'flex', height: 10, gap: 1 }}>
        {MIX.map(([k, n, c]) => <span key={k} title={`${n} ${mix[k] === null ? '—' : `${mix[k].toFixed(0)}%`}`} style={{ flex: `${mix[k] || 0} 0 0`, background: c, transition: 'flex-grow .3s cubic-bezier(.2,.8,.2,1)' }} />)}
      </span>
    </div>
  )
}

// A factor's value, blue where it beats the team's and orange where it doesn't (`better`:
// 1 higher, -1 lower); plain on the team's own readout.
function Factor({ v, team, better }) {
  const c = v === null || team === null ? INK : (v - team) * better >= 0 ? BLUE : ORANGE
  return <span style={{ fontFamily: MONO, fontSize: 11, textAlign: 'right', color: c, fontVariantNumeric: 'tabular-nums' }}>{v === null ? '—' : v.toFixed(1)}</span>
}

// The unit's readout, the team's own when nothing's lit.
function Readout({ unit, view, rel, k, season }) {
  const { playerPath } = useSeasonType()
  const s = unit ? unit.s : view.teamStats
  const t = view.teamStats
  const people = unit ? unit.ids.map(id => view.players.find(p => p.id === id)).sort((a, b) => b.minutes - a.minutes) : []
  const r = unit && unit.rank
  const heads = rel ? [['rORTG', s.rortg, s.rortg], ['rDRTG', s.rdrtg, -s.rdrtg], ['Net', s.net, s.net]] : [['ORTG', s.ortg, s.rortg], ['DRTG', s.drtg, -s.rdrtg], ['Net', s.net, s.net]]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '10px 12px 12px', minWidth: 0, borderTop: `1px solid ${RULE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 20 }}>
        {unit
          ? <span style={{ display: 'flex', gap: 3, minWidth: 0 }}>{people.map((p, j) => (
            <Link key={p.id} to={p.slug ? playerPath(p.slug) : '#'} state={{ season }} className="uv-pop" title={p.name} onClick={e => { if (!p.slug) e.preventDefault() }} style={{ '--k': j, display: 'flex' }}>
              <Face p={p} size={20} />
            </Link>
          ))}</span>
          : <span style={{ ...label, color: INK, fontWeight: 700 }}>Team</span>}
        <span style={{ ...label, fontSize: 8.5, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{Math.round(s.minutes).toLocaleString()} min</span>
        {unit && <span title={r ? `#${r.rank} of ${r.of} ${k}-man units in the league that season` : view.seasons.length > 1 ? 'Ranks are a season’s' : 'Under the league’s minutes floor'} style={{ ...label, fontSize: 8.5, whiteSpace: 'nowrap', color: r ? rankColor(rankPct(r.rank, r.of)) : FAINT }}>{r ? `#${r.rank}/${r.of}` : view.seasons.length > 1 ? 'span' : '—'}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', border: `1px solid ${EDGE}` }}>
        {heads.map(([name, v, good], i) => (
          <div key={name} style={{ padding: '4px 7px 5px', borderLeft: i ? `1px solid ${EDGE}` : 0, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
            <span style={{ ...label, fontSize: 7.5 }}>{name}</span>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1.15, color: good === null ? FAINT : tone(good), fontVariantNumeric: 'tabular-nums' }}>
              <CountUp stat={{ dec: 1, relative: rel || name === 'Net' }} value={v} delay={0} />
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 54px 54px', gap: '3px 8px', alignItems: 'baseline' }}>
        <span style={{ ...label, fontSize: 7.5, color: FAINT }}>{unit ? 'vs team' : ''}</span>
        <span style={{ ...label, fontSize: 7.5, color: FAINT, textAlign: 'right' }}>Off</span>
        <span style={{ ...label, fontSize: 7.5, color: FAINT, textAlign: 'right' }}>Def</span>
        {FACTORS.map(([f, name, off, def]) => [
          <span key={`${f}n`} style={{ ...label, fontSize: 8.5, color: DIM }}>{name}</span>,
          <Factor key={`${f}o`} v={s.off[f]} team={unit ? t.off[f] : null} better={off} />,
          <Factor key={`${f}d`} v={s.def[f]} team={unit ? t.def[f] : null} better={def} />
        ])}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <MixStrip name="Off" mix={s.off.mix} />
        <MixStrip name="Def" mix={s.def.mix} />
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', paddingLeft: 34 }}>
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
  const W = 200
  const H = 200
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
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
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

// `seasons`: the board's (oldest first); `teams`: [{ team, name }], for the team's name.
// A card in the units board's chart slot (UnitsBoard): the board's table picks the team
// and its dropdown the size; the map and readout run beside the units table.
export default function UnitsView({ team, seasons, teams, onClose, size: k }) {
  // The files for the team and seasons last fetched; the previous ones stay up, dimmed,
  // till the next arrive.
  const [got, setGot] = useState(null)
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
  const name = (teams.find(x => x.team === team) || {}).name || team
  const span = seasons.length > 1 ? `${shortSeason(seasons[0])}–${shortSeason(seasons[seasons.length - 1])}` : seasons[0].replace('-', '–')
  return (
    <div className="uv lb-enter" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: `1px solid ${RULE}`, background: '#262422', fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <img src={asset(`logos/color/sm/${team}.webp`)} alt="" width={20} height={20} style={{ flex: 'none' }} />
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap' }}>{name}</span>
        </span>
        <Keys name="Min ≥" options={floors.map((m, i) => [i, String(m)])} value={step} set={x => { setStep(x); setPinned(null) }} />
        <Keys name="Ratings" bare options={READS} value={read} set={setRead} />
        <button type="button" aria-label="Close units" onClick={onClose} style={{ flex: 'none', marginLeft: 'auto', width: 20, height: 20, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 12, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
      {docs === null && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="lb-skel" style={{ width: '60%', height: 220 }} /></div>}
      {docs && !view && <div style={{ ...label, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No units for {team} in {span}</div>}
      {view && (
        <div className="uv-main" style={{ opacity: loading ? 0.4 : 1, transition: 'opacity .25s ease', flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px' }}>
          <div className="uv-table-wrap" style={{ minWidth: 0, minHeight: 0, overflow: 'auto', padding: '0 10px 8px' }}>
            {cols.length
              ? <UnitTable key={`${got.key}|${k}|${step}`} cols={cols} rows={rows} rel={read === 'rel'} sort={sort} setSort={setSort} lit={lit} hotPlayer={hotPlayer} setHot={setHot} setHotPlayer={setHotPlayer} pinned={pinned} setPinned={setPinned} />
              : <div style={{ ...label, padding: 30 }}>No {k}-man units at {floors[step]}+ min</div>}
          </div>
          <div className="uv-side" style={{ borderLeft: `1px solid ${RULE}`, minHeight: 0, overflowY: 'auto' }}>
            <UnitMap cols={cols} view={view} rel={read === 'rel'} lit={lit} setHot={setHot} setPinned={setPinned} />
            <Readout unit={unit} view={view} rel={read === 'rel'} k={k} season={seasons[seasons.length - 1]} />
          </div>
        </div>
      )}
    </div>
  )
}
