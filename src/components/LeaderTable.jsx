import { memo } from 'react'
import { headshotUrl } from '../api.js'
import { MONO, fmt, heat } from '../lib/format.js'
import { initials } from '../lib/teams.js'
import WindowTag from './WindowTag.jsx'

// The Leaderboard's table, compact: rank (in the sorted stat, among the whole season),
// the player, his team, position, age, games and minutes that season, then the picked
// group's stats; the player and his details take no more room than they need, the stats
// share the rest. A header sorts by its stat, best first, and again for worst first. A
// header keeps one size whatever the group or sort: two lines at most, its rolling
// window's tag in the corner, the sorted one marked by colour and a rule (not weight),
// with room kept for its arrow. A cell is shaded by its percentile as the profile's stat tables are (lib/format.js heat:
// blue above the middle, orange below; a style stat, neither, in grey), and a Footprint
// swing that clears the noise carries a small square. The rank and player stay put when
// the stats scroll sideways. Rows carry their player (data-slug), so the page can light
// the one under the pointer in the scatter.
const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
const RULE = '#3d3a37'
const label = { fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
// The rank column's width, held by a box in each of its cells (a table squeezed for room
// would narrow the column, and the sticky player column, set this far from the left,
// would then cover the next).
const RANK_W = 32
// A style stat's shade: how far from the middle, in grey.
const plain = p => `rgba(201,195,188,${((Math.abs(p - 50) / 50) * 0.32).toFixed(2)})`
// "N. Jokić": the first name as an initial, so the column stays narrow.
const short = name => (name.includes(' ') ? `${name[0]}. ${name.split(' ').slice(1).join(' ')}` : name)
const BIO = [['TM', p => p.team], ['POS', p => p.pos || '—'], ['AGE', p => (p.age === null ? '—' : Math.floor(p.age))], ['GP', p => p.gp ?? '—'], ['MIN', p => (p.mp === null ? '—' : p.mp.toLocaleString())]]

// His headshot in a circle, as the profile's top bar has it.
function Face({ p }) {
  return (
    <span style={{ width: 20, height: 20, flex: 'none', borderRadius: '50%', background: PORTRAIT_BG, border: '1px solid #544f4b', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 7, color: DIM }}>
      {p.headshot
        ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={20} height={20} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} />
        : initials(p.name)}
    </span>
  )
}

function LeaderTable({ doc, group, rows, rank, sortLabel, reverse, onSort, picked, onPick }) {
  const cell = { height: 26, padding: '0 7px', borderBottom: `1px solid ${RULE}`, whiteSpace: 'nowrap' }
  const head = { position: 'sticky', top: 0, zIndex: 2, height: 46, boxSizing: 'border-box', padding: '15px 7px 6px', borderBottom: `1px solid ${RULE}`, textAlign: 'right', verticalAlign: 'bottom' }
  const stick = left => ({ position: 'sticky', left, zIndex: 1 })
  return (
    <table className="lb-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr>
          <th style={{ ...head, ...stick(0), zIndex: 3, paddingLeft: 0, paddingRight: 0, textAlign: 'center' }}><span style={{ ...label, display: 'inline-block', width: RANK_W }}>#</span></th>
          <th style={{ ...head, ...stick(RANK_W), zIndex: 3, width: '1%', textAlign: 'left', borderRight: `1px solid ${RULE}` }}><span style={label}>Player</span></th>
          {BIO.map(([name], i) => <th key={name} style={{ ...head, width: '1%', textAlign: i < 2 ? 'left' : 'right' }}><span style={label}>{name}</span></th>)}
          {group.stats.map((l, i) => {
            const on = sortLabel === l
            return (
              <th key={l} style={{ ...head, minWidth: 58, borderLeft: i ? 0 : `1px solid ${RULE}`, boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none' }} aria-sort={on ? (reverse ? 'ascending' : 'descending') : 'none'}>
                {doc.stats[l].years && <span style={{ position: 'absolute', top: 2, right: 5 }}><WindowTag stat={doc.stats[l]} /></span>}
                <button type="button" className="lb-head-cell" onClick={() => onSort(l)} title={on ? 'Sorted best first; click for worst first' : 'Sort by this stat, best first'}
                  style={{ ...label, display: 'flex', width: '100%', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 3, padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'right', lineHeight: 1.25, color: on ? INK : DIM }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={l}>{l}</span>
                  <span aria-hidden="true" style={{ width: 7, flex: 'none', textAlign: 'left', color: on ? INK : 'transparent' }}>{reverse ? '↑' : '↓'}</span>
                </button>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map(p => {
          const lit = new Set(p.lit || [])
          return (
            <tr key={p.slug} data-slug={p.slug} className="lb-row" aria-selected={picked === p.slug} onClick={() => onPick(p.slug)}>
              <td style={{ ...cell, ...stick(0), padding: 0, textAlign: 'center', color: DIM, fontSize: 10.5 }}><span style={{ display: 'inline-block', width: RANK_W }}>{rank.get(p.slug) ?? '—'}</span></td>
              <td style={{ ...cell, ...stick(RANK_W), padding: '0 8px 0 4px', borderRight: `1px solid ${RULE}` }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Face p={p} />
                  <span title={p.name} style={{ maxWidth: 130, fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis' }}>{short(p.name)}</span>
                </span>
              </td>
              {BIO.map(([name, of], i) => <td key={name} style={{ ...cell, textAlign: i < 2 ? 'left' : 'right', color: i < 2 ? '#b8b2ab' : DIM, fontSize: i < 2 ? 10.5 : 11.5 }}>{of(p)}</td>)}
              {group.stats.map((l, i) => {
                const k = doc.labels.indexOf(l)
                const stat = doc.stats[l]
                const v = p.v[k]
                const pc = p.p[k]
                const shade = v === null || pc === null ? undefined : stat.neutral ? plain(pc) : heat(pc)
                return (
                  <td key={l} style={{ ...cell, textAlign: 'right', borderLeft: i ? 0 : `1px solid ${RULE}`, background: shade, color: v === null ? FAINT : INK, fontWeight: sortLabel === l ? 600 : 400 }}>
                    {lit.has(k) && <span aria-label="clears the noise" style={{ display: 'inline-block', width: 4, height: 4, marginRight: 5, verticalAlign: 2, background: INK }} />}
                    {fmt(stat, v)}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default memo(LeaderTable)
