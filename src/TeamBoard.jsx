import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTeamboard } from './api.js'
import { MONO, fmt, heat, ord } from './lib/format.js'
import { ranked } from './lib/leaderboard.js'
import { asset } from './lib/static.js'
import { placeOf, tiedOf } from './lib/teamboard.js'
import ModeSwitch from './components/ModeSwitch.jsx'
import TeamScatter from './components/TeamScatter.jsx'
import BrandMark from './components/BrandMark.jsx'
import TeamCard from './components/TeamCard.jsx'

// The Team board: the 30 teams' 2026-27 from the team sheet (thinking-bball
// lib/teamboard.js), one screen like the Leaderboard (index.css .lb): ORTG against DRTG on
// the left, each team its logo, and a table on the right of the picked group's stats (the
// sheet's own categories: Overview, Playtype, Offense, Defense, Home-Away, v Good/Bad, O
// after D, D after O), a head sorting by its stat, best first, again for worst, each cell
// shaded by its percentile among the 30 (blue above the middle, orange below, a style stat
// in grey), RAW its value or RANK its place among the 30, the league's average along the foot. The team under the pointer in either is lit
// in the other. A row or a logo opens the team's card in the chart's place (TeamCard).
const SEASON = '2026-27'
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
// A style stat's shade: how far from the middle, in grey (LeaderTable's).
const plain = p => `rgba(201,195,188,${((Math.abs(p - 50) / 50) * 0.32).toFixed(2)})`
// A relative stat (net, rORTG and the like) reads with its sign.
const RELATIVE = /^Net|^r|^Adj r| Net$/

function Groups({ groups, active, pick }) {
  return (
    <div role="group" aria-label="Stat group" style={{ display: 'flex', border: `1px solid ${EDGE}`, overflowX: 'auto', minWidth: 0, scrollbarWidth: 'none' }}>
      {groups.map((g, i) => {
        const on = g.id === active
        return (
          <button key={g.id} type="button" className="lb-group" aria-pressed={on} onClick={() => pick(g.id)}
            style={{ flex: 'none', height: 28, padding: '0 11px', border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: on ? '#3a3734' : 'transparent', boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none', color: on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {g.name}
          </button>
        )
      })}
    </div>
  )
}

// Wins and losses read together, in the W–L column.
const RECORD = ['Wins', 'Losses']
// A head's name where the sheet's is cryptic.
const NAMES = { 'LA Bayes Win-pace': 'Luck Adjusted\nBayes Win-pace' }
// RAW | RANK: a cell's value, or its place among the 30 ("1st", "4th", a shared one "T-6th").
const MODES = [['raw', 'Raw'], ['rank', 'Rank']]
function Table({ doc, group, sort, onSort, rankView, hot, setHot, picked, onPick }) {
  const shown = group.stats.filter(l => !RECORD.includes(l))
  const stat = l => ({ ...doc.stats[l], relative: RELATIVE.test(l) })
  const rows = useMemo(() => ranked(doc, doc.teams, sort.label, sort.reverse), [doc, sort])
  const rank = useMemo(() => new Map(ranked(doc, doc.teams, sort.label).map((t, i) => [t.team, i + 1])), [doc, sort.label])
  const at = l => doc.labels.indexOf(l)
  const wins = at('Wins')
  const losses = at('Losses')
  const head = { position: 'sticky', top: 0, zIndex: 2, height: 46, boxSizing: 'border-box', padding: '15px 8px 6px', borderBottom: `1px solid ${RULE}`, background: '#262422', textAlign: 'right', verticalAlign: 'bottom' }
  const td = { height: 30, padding: '0 8px', borderBottom: `1px solid ${RULE}`, textAlign: 'right', whiteSpace: 'nowrap' }
  return (
    <table className="lb-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr>
          <th style={{ ...head, width: 30, textAlign: 'center', padding: '15px 0 6px' }}><span style={label}>#</span></th>
          <th style={{ ...head, textAlign: 'left', borderRight: `1px solid ${RULE}` }}><span style={label}>Team</span></th>
          <th style={{ ...head, width: '1%' }}><span style={label}>W–L</span></th>
          {shown.map(l => {
            const on = sort.label === l
            return (
              <th key={l} style={{ ...head, minWidth: NAMES[l] ? 128 : 72, boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none' }} aria-sort={on ? (sort.reverse ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="lb-head-cell" onClick={() => onSort(l)} title={[doc.stats[l].desc, on ? 'Sorted best first; click for worst first' : 'Sort by this stat, best first'].filter(Boolean).join(' · ')}
                  style={{ ...label, display: 'inline-flex', alignItems: 'flex-end', gap: 3, maxWidth: NAMES[l] ? 130 : 96, padding: 0, border: 0, background: 'transparent', color: on ? INK : DIM, textAlign: 'right', lineHeight: 1.25, whiteSpace: NAMES[l] ? 'pre' : 'normal', cursor: 'pointer' }}>
                  {NAMES[l] || l}<span aria-hidden="true" style={{ width: 7, flex: 'none', color: INK }}>{on ? (sort.reverse ? '↑' : '↓') : ''}</span>
                </button>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map(t => (
          <tr key={t.team} className="lb-row" aria-selected={t.team === hot || t.team === picked} onMouseEnter={() => setHot(t.team)} onMouseLeave={() => setHot(null)} onClick={() => onPick(t.team)} style={{ cursor: 'pointer' }}>
            <td style={{ ...td, textAlign: 'center', padding: 0, color: DIM, fontSize: 11 }}>{rank.get(t.team)}</td>
            <td style={{ ...td, textAlign: 'left', borderRight: `1px solid ${RULE}` }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <img src={asset(`logos/color/sm/${t.team}.webp`)} alt="" width={20} height={20} style={{ flex: 'none' }} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, width: 28 }}>{t.team}</span>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: INK }}>{t.name}</span>
              </span>
            </td>
            <td style={{ ...td, color: '#d9d3cc' }}>{wins >= 0 && t.v[wins] !== null ? `${t.v[wins]}–${t.v[losses]}` : '—'}</td>
            {shown.map(l => {
              const v = t.v[at(l)]
              const p = t.p[at(l)]
              const shade = v === null || p === null ? undefined : doc.stats[l].neutral ? plain(p) : heat(p)
              return (
                <td key={l} style={{ ...td, background: shade, color: v === null ? FAINT : INK, fontWeight: sort.label === l ? 600 : 400 }}>
                  {v === null ? '—' : rankView ? `${tiedOf(doc, t, l) ? 'T-' : ''}${ord(placeOf(doc, t, l))}` : fmt(stat(l), v)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td style={{ ...td, position: 'sticky', bottom: 0, background: '#2c2a28', borderTop: `1px solid ${EDGE}`, borderBottom: 0 }} />
          <td style={{ ...td, position: 'sticky', bottom: 0, background: '#2c2a28', borderTop: `1px solid ${EDGE}`, borderBottom: 0, textAlign: 'left', borderRight: `1px solid ${RULE}` }}><span style={{ ...label, color: INK }}>League average</span></td>
          <td style={{ ...td, position: 'sticky', bottom: 0, background: '#2c2a28', borderTop: `1px solid ${EDGE}`, borderBottom: 0 }} />
          {shown.map(l => (
            <td key={l} style={{ ...td, position: 'sticky', bottom: 0, background: '#2c2a28', borderTop: `1px solid ${EDGE}`, borderBottom: 0, color: DIM }}>{doc.league[l] === null || doc.league[l] === undefined || rankView ? '—' : fmt(stat(l), doc.league[l])}</td>
          ))}
        </tr>
      </tfoot>
    </table>
  )
}

export default function TeamBoard() {
  const [doc, setDoc] = useState(null)
  const [group, setGroup] = useState('overview')
  // Ranked by luck-adjusted win pace to begin with: the sheet's best read of how good a team is.
  const [sort, setSort] = useState({ label: 'LA Bayes Win-pace', reverse: false })
  const [mode, setMode] = useState('raw')
  const [hot, setHot] = useState(null)
  const [picked, setPicked] = useState(null)
  const close = useCallback(() => setPicked(null), [])
  useEffect(() => {
    let live = true
    fetchTeamboard(SEASON).then(d => live && setDoc(d || false), () => live && setDoc(false))
    return () => { live = false }
  }, [])
  const g = doc ? doc.groups.find(x => x.id === group) || doc.groups[0] : null
  const choose = id => {
    const next = doc.groups.find(x => x.id === id)
    setGroup(id)
    if (!next.stats.includes(sort.label)) setSort({ label: next.stats.find(l => !['Wins', 'Losses'].includes(l)), reverse: false })
  }
  return (
    <main className="lb" style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${RULE}` }}>
        <BrandMark />
        <Link to="/" style={{ ...label, fontSize: 10, color: '#b3ada6' }}>← All players</Link>
        <span style={{ ...label, fontSize: 10, color: INK, fontWeight: 700, border: `1px solid ${EDGE}`, padding: '5px 9px' }}>Teams</span>
        <Link to="/leaderboard" style={{ ...label, fontSize: 10, color: '#b3ada6' }}>Leaderboard →</Link>
        <span style={{ ...label, fontSize: 10, marginLeft: 'auto', color: INK }}>{SEASON.replace('-', '–')} <span style={{ color: DIM }}>· Regular season</span></span>
      </header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', flexWrap: 'wrap' }}>
        {doc ? <Groups groups={doc.groups} active={g.id} pick={choose} /> : <span className="lb-skel" style={{ width: 560, height: 30 }} />}
        <span style={{ marginLeft: 'auto' }}><ModeSwitch name="Cells read in" options={MODES} mode={mode} setMode={setMode} /></span>
      </div>
      {doc === false && <div style={{ ...label, padding: 40, border: `1px dashed ${EDGE}`, textAlign: 'center' }}>Unavailable</div>}
      {doc && (
        <div className="lb-body tb-body lb-enter">
          <div className={`lb-side${picked ? ' lb-carded' : ''}`}>
            {picked
              ? <TeamCard key={picked} doc={doc} team={doc.teams.find(t => t.team === picked)} season={SEASON} onClose={close} />
              : <TeamScatter doc={doc} hot={hot} setHot={setHot} onPick={setPicked} />}
          </div>
          <div className="lb-table-wrap" style={{ scrollSnapType: 'none' }}>
            <Table doc={doc} group={g} sort={sort} onSort={l => setSort(s => ({ label: l, reverse: s.label === l ? !s.reverse : false }))} rankView={mode === 'rank'} hot={hot} setHot={setHot} picked={picked} onPick={setPicked} />
          </div>
        </div>
      )}
    </main>
  )
}
