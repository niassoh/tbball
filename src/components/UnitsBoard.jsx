import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO, heat, signed } from '../lib/format.js'
import { asset } from '../lib/static.js'
import UnitsView from './UnitsView.jsx'
import { initials } from '../lib/teams.js'
import { UNIT_GROUPS, bestBy, fieldUnits, teamRow, unitRow } from '../lib/unitsView.js'

// The Team board's UNITS mode: the 30 teams ranked by their units of one size (2 to 5) over
// the board's seasons (lib/unitsView.js teamRow), in the board's own shape. On the right a
// table: each team's most-used unit (its faces), its minutes and share of the team's, its
// net, ORTG and DRTG; the team's net in every other minute (REST); its best unit over the
// league's minutes floor; how many units clear the floor, and
// the share of their minutes in units that won them (+MIN). Every number shaded by its
// place among the 30, as the board's are. On the left the unit field: a row per team in
// the table's order, each of its units a dot along net (its area its minutes), the team's
// own net a white tick, its BEST BY unit solid and glowing, the dots faint so that where a team's
// minutes crowd reads darker, and how far apart its good and bad units are reads at a
// glance. The dots fade in, row by row, on arrival. A team under the
// pointer in either is lit in the other; a click opens its units (UnitsView). A row's ▸
// opens the units on its line of the field beneath it, in the table's columns and order;
// a unit under the pointer in either is lit in the other, and a dot clicked opens its
// team's units with it lit. BEST BY a stat: each team's row is one unit, its best in that
// stat of those on the field (by minutes, its most-used), and the columns sort the teams
// by that unit (the field rings it; under the row it's marked ▸).
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


// A value's place among the 30 as a percentile (100 the best), for its shade.
const percentiles = (rows, col, value) => {
  const vals = rows.map(r => value(r, col)).filter(v => v !== null && v !== undefined)
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
const Row = memo(function Row({ r, unit, cols, value, sortId, rank, pct, on, open, toggle, setHot, onPick }) {
  return (
    <tr className="lb-row" aria-selected={on} onMouseEnter={() => setHot(r.code)} onMouseLeave={() => setHot(null)} onClick={() => onPick(r.code)}>
      <td style={{ ...td, textAlign: 'center', padding: 0, color: DIM, fontSize: 11 }}>{rank}</td>
      <td style={{ ...td, textAlign: 'left', borderRight: `1px solid ${RULE}` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src={asset(`logos/color/sm/${r.code}.webp`)} alt="" width={20} height={20} style={{ flex: 'none' }} />
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: INK }}>{r.name}</span>
          <button type="button" className="lb-expand" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} ${r.name} units`} title={`${open ? 'Hide' : 'Show'} its ${r.units.length} units on the field`}
            onClick={e => { e.stopPropagation(); toggle(r.code) }}
            style={{ marginLeft: 'auto', height: 20, padding: '0 6px', border: `1px solid ${open ? EDGE : 'transparent'}`, background: 'transparent', color: open ? INK : DIM, fontFamily: MONO, fontSize: 9.5, letterSpacing: '.06em', cursor: 'pointer' }}>
            {open ? '▾' : '▸'} {r.units.length}
          </button>
        </span>
      </td>
      <td style={{ ...td, textAlign: 'left' }}>{unit ? <Faces ids={unit.ids} view={r.view} /> : <span style={{ color: FAINT }}>—</span>}</td>
      {cols.map(c => {
        const v = value(r, c)
        const p = pct[c.id](v)
        return <td key={c.id} style={{ ...td, background: p === null ? undefined : heat(p), color: v === null || v === undefined ? FAINT : INK, fontWeight: sortId === c.id ? 600 : 400 }}>{v === null || v === undefined ? '—' : c.text(v, r)}</td>
      })}
    </tr>
  )
})

// A team's units under its row (the dots on its line of the field), in the table's
// columns and order: unshaded (the shades place the 30 teams), each unit by its faces and
// surnames.
// The stats a team's unit can be picked by, in the stat groups: minutes (its most-used)
// and every unit column with a better way, each name once; not REST (the team without
// the unit, not the unit).
const PICKS = (() => {
  const seen = new Set()
  return UNIT_GROUPS.map(g => ({ ...g, cols: g.cols.filter(c => !c.team && c.id !== 'rest' && (c.better || c.id === 'min') && !seen.has(c.name) && seen.add(c.name)) }))
})()
const UNIT_STATS = PICKS.flatMap(g => g.cols)
const pickName = c => (c.id === 'min' ? 'Most used' : c.name)
const surname = name => (name || '?').split(' ').slice(1).join(' ') || name || '?'
function UnitRows({ r, chosen, cols, col, dir, sortId, lit, setLit }) {
  const none = u => col.v(u) === null || col.v(u) === undefined
  const units = r.units.map(u => ({ u, row: unitRow(r.view, u, r.team) })).sort((a, b) => none(a.row) - none(b.row) || (col.v(b.row) - col.v(a.row)) * dir)
  return units.map(({ u, row }) => {
    const key = `${r.code}|${u.key}`
    const on = lit === key
    return (
      <tr key={key} id={`uf-${key}`} className="lb-row uf-sub" aria-selected={on} onMouseEnter={() => setLit(key)} onMouseLeave={() => setLit(null)}>
        <td style={{ ...td, height: 26, padding: 0 }} />
        <td style={{ ...td, height: 26, textAlign: 'left', borderRight: `1px solid ${RULE}`, paddingLeft: 24, maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 10.5, color: on || u.key === chosen ? INK : '#c9c3bc', fontWeight: u.key === chosen ? 700 : 400 }}>
          <span aria-hidden="true" style={{ display: 'inline-block', width: 14, color: INK }}>{u.key === chosen ? '▸' : ''}</span>
          {u.ids.map(id => surname((r.view.players.find(p => p.id === id) || {}).name)).join(' · ')}
        </td>
        <td style={{ ...td, height: 26, textAlign: 'left' }}><Faces ids={u.ids} view={r.view} /></td>
        {cols.map(c => {
          const v = c.v(row)
          return <td key={c.id} style={{ ...td, height: 26, fontSize: 11, color: v === null || v === undefined ? FAINT : c.id.endsWith('net') || c.id === 'net' ? tone(v) : DIM, fontWeight: sortId === c.id ? 600 : 400 }}>{v === null || v === undefined ? '' : c.text(v, row)}</td>
        })}
      </tr>
    )
  })
}

// The unit field: a row per team (`rows`, in the table's order), each of its units a dot
// on its line at its net, sized by minutes, faint so that where they crowd reads darker;
// the team's own net a white tick and its BEST BY unit (`ringOf`) solid, with a soft glow
// of its colour. The
// row under the pointer comes up to full strength.
const NET = 30
const GUTTER = 34
function Field({ rows, ringOf, k, hot, setHot, onPick, lit, setLit, onUnit }) {
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
  const maxMin = Math.max(1, ...rows.flatMap(r => r.units.map(u => u.s.minutes)))
  const radius = m => 1.6 + Math.min(rowH * 0.36, 7) * Math.sqrt(m / maxMin)
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => { setHot(null); setTip(null) }}>
      <svg width={w} height={h} style={{ display: 'block' }}>
        <defs>
          {[['up', BLUE], ['down', ORANGE]].map(([id, c]) => (
            <radialGradient key={id} id={`uf-glow-${id}`}>
              <stop offset="0%" stopColor={c} stopOpacity={0.55} />
              <stop offset="45%" stopColor={c} stopOpacity={0.16} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        {[-20, -10, 0, 10, 20].map(t => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 6} y2={h - 6} stroke={t ? RULE : EDGE} strokeDasharray={t ? '1 5' : undefined} />
            <text x={x(t)} y={top - 11} textAnchor="middle" style={{ ...label, fontSize: 8, fill: t ? FAINT : DIM, letterSpacing: '.04em' }}>{t > 0 ? `+${t}` : t === 0 ? 'NET 0' : t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = top + i * rowH + rowH / 2
          const hotRow = hot === r.code
          const dim = hot && !hotRow
          const best = ringOf(r)
          return (
            <g key={r.code} opacity={dim ? 0.3 : 1} style={{ transition: 'opacity .15s' }} onMouseEnter={() => setHot(r.code)} onClick={() => onPick(r.code)} cursor="pointer">
              <rect x={0} y={y - rowH / 2} width={w} height={rowH} fill={hotRow ? 'rgba(236,232,227,.05)' : 'transparent'} />
              <image href={asset(`logos/color/sm/${r.code}.webp`)} x={4} y={y - 8} width={16} height={16} />
              <g className="uf-dots" style={{ '--k': i }}>
                {r.units.map(u => {
                  const on = lit === `${r.code}|${u.key}`
                  return (
                    <circle key={u.key} cx={x(u.s.net)} cy={y} r={radius(u.s.minutes)} fill={tone(u.s.net)} fillOpacity={on ? 1 : hotRow ? 0.55 : 0.28} stroke={on ? INK : 'none'} strokeWidth={1.6}
                      onMouseEnter={() => { setTip({ x: x(u.s.net), y, r, u, s: u.s }); setLit(`${r.code}|${u.key}`) }} onMouseLeave={() => { setTip(null); setLit(null) }}
                      onClick={e => { e.stopPropagation(); onUnit(r.code, u.key) }} />
                  )
                })}
              </g>
              {r.team.net !== null && <rect x={x(r.team.net) - 1} y={y - rowH / 2 + 4} width={2} height={rowH - 8} fill={INK} opacity={0.85} style={{ pointerEvents: 'none' }} />}
              {best && (() => {
                const rr = Math.max(3.4, radius(best.s.minutes))
                const up = best.s.net >= 0
                return (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle cx={x(best.s.net)} cy={y} r={rr * 2.8} fill={`url(#uf-glow-${up ? 'up' : 'down'})`} />
                    <circle cx={x(best.s.net)} cy={y} r={rr} fill={tone(best.s.net)} />
                  </g>
                )
              })()}
            </g>
          )
        })}
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
// `views`, `loading`: every team's units over `seasons` (useLeagueUnits); `min`: the
// minutes a unit needs to be on the board (MIN, lib/unitsView.js minutesCut); `card`: the team whose units (UnitsView) cover the field, if any;
// `onClose` closes it.
export default function UnitsBoard({ teams, seasons, views, loading, k, min, group: groupId, card, onPick, onClose }) {
  const [sort, setSort] = useState({ id: 'net', reverse: false })
  const [bestStat, setBestStat] = useState('net')
  const [hot, setHot] = useState(null)
  // Teams whose units are open under their rows; the unit under the pointer (`team|unit`),
  // and the one a dot's click held.
  const [open, setOpen] = useState(() => new Set())
  const [litUnit, setLitUnit] = useState(null)
  const [held, setHeld] = useState(null)
  const toggle = useCallback(code => setOpen(o => {
    const next = new Set(o)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    return next
  }), [])
  const holdUnit = useCallback((code, key) => {
    setOpen(o => new Set(o).add(code))
    setHeld(`${code}|${key}`)
  }, [])
  // A held unit's row comes into view.
  useEffect(() => {
    if (held) document.getElementById(`uf-${held}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [held])
  const rows = useMemo(() => teams.filter(t => views.has(t.team)).map(t => {
    const view = views.get(t.team)
    const units = fieldUnits(view, k, min)
    const row = teamRow(view, k, min)
    // BEST picks among the units listed under its row and on its line of the field.
    const cands = units.map(u => ({ u, row: unitRow(view, u, row.team) }))
    return { code: t.team, name: t.name, view, units, cands, ...row }
  }), [teams, views, k, min])
  const group = UNIT_GROUPS.find(g => g.id === groupId) || UNIT_GROUPS[0]
  const cols = group.cols
  // Each team's row is one unit, its best by `bestStat` (by minutes, its most-used),
  // whatever the sort.
  const statCol = UNIT_STATS.find(c => c.id === bestStat)
  const bests = new Map(rows.map(r => [r.code, bestBy(r.cands, statCol)]))
  const value = (r, c) => {
    if (c.team) return c.v(r)
    const x = bests.get(r.code)
    return x ? c.v(x.row) : null
  }
  // A group without the sorted stat sorts by its first.
  const col = cols.find(c => c.id === sort.id) || cols[0]
  const by = col.id === sort.id ? sort : { id: col.id, reverse: false }
  const dir = (col.better || 1) * (by.reverse ? -1 : 1)
  const none = r => value(r, col) === null || value(r, col) === undefined
  const sorted = [...rows].sort((a, b) => none(a) - none(b) || (value(b, col) - value(a, col)) * dir)
  const pct = Object.fromEntries(group.cols.map(c => [c.id, percentiles(rows, c, value)]))
  const unitOf = r => (bests.get(r.code) || {}).u || null
  const head = { position: 'sticky', top: 0, zIndex: 2, height: 46, boxSizing: 'border-box', padding: '15px 8px 6px', borderBottom: `1px solid ${RULE}`, background: '#262422', textAlign: 'right', verticalAlign: 'bottom' }
  return (
    <div className={`lb-body tb-body${loading ? ' lb-loading' : ''}`}>
      {loading && <div className="lb-progress"><span style={{ transform: `scaleX(${rows.length / Math.max(1, teams.length)})` }} /></div>}
      {card && (
        <div className="lb-side lb-carded">
          <UnitsView key={k} size={k} team={card} seasons={seasons} teams={teams} onClose={onClose} />
        </div>
      )}
      <div className="lb-side" style={{ padding: '10px 12px 6px', display: card ? 'none' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 2 }}>
          <span style={{ ...label, color: INK }}>Unit field · {k}-man</span>
          <span style={{ ...label, fontSize: 8.5, color: FAINT }}>dot: unit · size: min · glow: best by {statCol.name} · tick: team</span>
        </div>
        {rows.length > 0 && <Field key={`${seasons.join()}|${k}`} rows={sorted} ringOf={unitOf} k={k} hot={hot} setHot={setHot} onPick={onPick} lit={litUnit || held} setLit={setLitUnit} onUnit={holdUnit} />}
      </div>
      <div className="lb-table-wrap" style={{ scrollSnapType: 'none' }}>
        <table className="lb-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              <th style={{ ...head, width: 30, textAlign: 'center', padding: '15px 0 6px' }}><span style={label}>#</span></th>
              <th style={{ ...head, textAlign: 'left', borderRight: `1px solid ${RULE}` }}><span style={label}>Team</span></th>
              <th style={{ ...head, textAlign: 'left', whiteSpace: 'nowrap', padding: '6px 8px 6px' }}>
                <label title="Each team’s row is one unit: its best by this stat, of those listed under it (by Min, its most-used)" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ ...label, fontSize: 8 }}>Best by</span>
                  <span style={{ position: 'relative', display: 'flex' }}>
                    <select aria-label="Best by" value={bestStat} onChange={e => setBestStat(e.target.value)} className="lb-select"
                      style={{ ...label, fontSize: 8.5, letterSpacing: '.02em', appearance: 'none', width: `calc(${pickName(statCol).length} * (1ch + .02em) + 18px)`, height: 18, color: INK, fontWeight: 700, background: 'transparent', border: `1px solid ${EDGE}`, padding: '0 12px 0 4px', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                      {PICKS.map(g => (
                        <optgroup key={g.id} label={g.name}>
                          {g.cols.map(c => <option key={c.id} value={c.id} style={{ background: '#262422' }}>{pickName(c)}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <span aria-hidden="true" style={{ position: 'absolute', right: 4, top: 3, color: DIM, fontSize: 8, pointerEvents: 'none' }}>▾</span>
                  </span>
                </label>
              </th>
              {cols.map(c => {
                const on = by.id === c.id
                return (
                  <th key={c.id} style={{ ...head, minWidth: 58, boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none' }} aria-sort={on ? (by.reverse ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="lb-head-cell" title={[c.title, 'Sort by this; again to flip'].filter(Boolean).join(' · ')} onClick={() => setSort({ id: c.id, reverse: by.id === c.id ? !by.reverse : false })}
                      style={{ ...label, display: 'inline-flex', alignItems: 'flex-end', gap: 3, padding: 0, border: 0, background: 'transparent', color: on ? INK : DIM, cursor: 'pointer' }}>
                      {c.name}<span aria-hidden="true" style={{ width: 7, color: INK }}>{on ? (by.reverse ? '↑' : '↓') : ''}</span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => [
              <Row key={r.code} r={r} unit={unitOf(r)} cols={cols} value={value} sortId={by.id} rank={i + 1} pct={pct} on={hot === r.code || card === r.code} open={open.has(r.code)} toggle={toggle} setHot={setHot} onPick={onPick} />,
              open.has(r.code) && <UnitRows key={`${r.code}-units`} r={r} chosen={(unitOf(r) || {}).key} cols={cols} col={col} dir={dir} sortId={by.id} lit={litUnit || held} setLit={setLitUnit} />
            ])}
          </tbody>
        </table>
      </div>
    </div>
  )
}
