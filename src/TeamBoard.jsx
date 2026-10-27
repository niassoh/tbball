import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { fetchTeamboard, fetchTeamboardSeasons } from './api.js'
import { MONO, fmt, heat, ord } from './lib/format.js'
import { ranked } from './lib/leaderboard.js'
import { seasonsBetween } from './lib/seasons.js'
import { asset } from './lib/static.js'
import { boardOver, placeOf, tiedOf } from './lib/teamboard.js'
import ModeSwitch from './components/ModeSwitch.jsx'
import SeasonPicker from './components/SeasonPicker.jsx'
import { Each, Eras } from './components/SpanControls.jsx'
import TeamScatter from './components/TeamScatter.jsx'
import BrandMark from './components/BrandMark.jsx'
import SiteNav from './components/SiteNav.jsx'
import TeamCard from './components/TeamCard.jsx'

// The Team board: the 30 teams' season from the team sheet (thinking-bball
// lib/teamboard.js), 2013-14 on, the latest to begin with; the Leaderboard's season picker
// for the rest: a season, a span (a row per team-season, or one per team combined), or
// every team's runs of 3, 5 or 7 seasons (lib/teamboard.js boardOver). One screen like the
// Leaderboard (index.css .lb): ORTG against DRTG on
// the left, each team its logo, and a table on the right of the picked group's stats (the
// sheet's own categories: Overview, Playtype, Offense, Defense, Home-Away, v Good/Bad, O
// after D, D after O), a head sorting by its stat, best first, again for worst, each cell
// shaded by its percentile among the 30 (blue above the middle, orange below, a style stat
// in grey), RAW its value or RANK its place among the 30, the league's average along the foot. The team under the pointer in either is lit
// in the other. A row or a logo opens the team's card in the chart's place (TeamCard).
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

const td = { height: 30, padding: '0 8px', borderBottom: `1px solid ${RULE}`, textAlign: 'right', whiteSpace: 'nowrap' }

// Wins and losses read together, in the W–L column.
const RECORD = ['Wins', 'Losses']
// A head's name where the sheet's is cryptic.
const NAMES = { 'LA Bayes Win-pace': 'Luck Adjusted\nBayes Win-pace' }
// RAW | RANK: a cell's value, or its place among the 30 ("1st", "4th", a shared one "T-6th").
const MODES = [['raw', 'Raw'], ['rank', 'Rank']]
// A row of the table; memoized, so a hover redraws only the rows it lights and unlights
// (hundreds over a span or runs).
const Row = memo(function Row({ t, doc, shown, sortLabel, rankView, on, rank, setHot, onPick }) {
  const at = l => doc.labels.indexOf(l)
  const wins = at('Wins')
  const losses = at('Losses')
  const stat = l => ({ ...doc.stats[l], relative: RELATIVE.test(l) })
  return (
    <tr key={t.id} className="lb-row" aria-selected={on} onMouseEnter={() => setHot(t.id)} onMouseLeave={() => setHot(null)} onClick={() => onPick(t.id)} style={{ cursor: 'pointer' }}>
      <td style={{ ...td, textAlign: 'center', padding: 0, color: DIM, fontSize: 11 }}>{rank}</td>
      <td style={{ ...td, textAlign: 'left', borderRight: `1px solid ${RULE}` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src={asset(`logos/color/sm/${t.team}.webp`)} alt="" width={20} height={20} style={{ flex: 'none' }} />
          {/* Over many seasons the row's years sit under its name in the code's place (the
              logo says the team), so the wider records still leave the table its width. */}
          {!doc.dated && <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, width: 28 }}>{t.team}</span>}
          <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: INK, lineHeight: doc.dated ? '13px' : undefined }}>{t.name}</span>
            {doc.dated && <span style={{ ...label, fontSize: 8.5, letterSpacing: '.08em', lineHeight: '10px' }}>{t.span}</span>}
          </span>
        </span>
      </td>
      <td style={{ ...td, color: '#d9d3cc' }}>{wins >= 0 && t.v[wins] !== null ? `${t.v[wins]}–${t.v[losses]}` : '—'}</td>
      {shown.map(l => {
        const v = t.v[at(l)]
        const p = t.p[at(l)]
        const shade = v === null || p === null ? undefined : doc.stats[l].neutral ? plain(p) : heat(p)
        return (
          <td key={l} style={{ ...td, background: shade, color: v === null ? FAINT : INK, fontWeight: sortLabel === l ? 600 : 400 }}>
            {v === null ? '—' : rankView ? `${tiedOf(doc, t, l) ? 'T-' : ''}${ord(placeOf(doc, t, l))}` : fmt(stat(l), v)}
          </td>
        )
      })}
    </tr>
  )
})

function Table({ doc, group, sort, onSort, rankView, hot, setHot, picked, onPick }) {
  const shown = useMemo(() => group.stats.filter(l => !RECORD.includes(l)), [group])
  const stat = l => ({ ...doc.stats[l], relative: RELATIVE.test(l) })
  const rows = useMemo(() => ranked(doc, doc.teams, sort.label, sort.reverse), [doc, sort])
  const rank = useMemo(() => new Map(ranked(doc, doc.teams, sort.label).map((t, i) => [t.id, i + 1])), [doc, sort.label])
  const head = { position: 'sticky', top: 0, zIndex: 2, height: 46, boxSizing: 'border-box', padding: '15px 8px 6px', borderBottom: `1px solid ${RULE}`, background: '#262422', textAlign: 'right', verticalAlign: 'bottom' }
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
          <Row key={t.id} t={t} doc={doc} shown={shown} sortLabel={sort.label} rankView={rankView} on={t.id === hot || t.id === picked} rank={rank.get(t.id)} setHot={setHot} onPick={onPick} />
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
  // A row opens its card, or closes it when it's the one open.
  const toggle = useCallback(k => setPicked(p => (p === k ? null : k)), [])
  const [seasons, setSeasons] = useState(null)
  // The span on show; over many seasons a row per team-season (`each`) or one per team;
  // runs' length (3, 5 or 7), or null for the span.
  const [span, setSpan] = useState(null)
  const [each, setEach] = useState(false)
  const [era, setEra] = useState(null)
  // Season documents fetched so far (false: none for it).
  const [docs, setDocs] = useState({})
  useEffect(() => {
    fetchTeamboardSeasons().then(d => {
      setSeasons(d.seasons)
      const last = d.seasons[d.seasons.length - 1]
      setSpan({ from: last, to: last })
    }, () => setDoc(false))
  }, [])
  const wanted = !seasons || !span ? [] : era ? seasons : seasonsBetween(span.from, span.to).filter(s => seasons.includes(s))
  const wantedKey = wanted.join()
  useEffect(() => {
    const missing = wanted.filter(s => !(s in docs))
    if (!missing.length) return
    let live = true
    Promise.all(missing.map(s => fetchTeamboard(s).then(d => [s, d || false], () => [s, false])))
      .then(got => live && setDocs(d => ({ ...d, ...Object.fromEntries(got) })))
    return () => { live = false }
  }, [wantedKey, docs]) // eslint-disable-line react-hooks/exhaustive-deps -- wanted is wantedKey's
  // The board once every season it needs is in; the last one stays on show till then.
  useEffect(() => {
    if (!wanted.length || wanted.some(s => !(s in docs))) return
    const got = wanted.map(s => docs[s]).filter(Boolean)
    setDoc(got.length ? boardOver(got, { each: each && got.length > 1, run: era }) : false)
  }, [wantedKey, docs, each, era]) // eslint-disable-line react-hooks/exhaustive-deps -- wanted is wantedKey's
  const g = doc ? doc.groups.find(x => x.id === group) || doc.groups[0] : null
  // A group the view lacks (Last month over many seasons) falls back to the first; so does
  // its sort.
  const by = g && g.stats.includes(sort.label) ? sort : g && { label: g.stats.find(l => !['Wins', 'Losses'].includes(l)), reverse: false }
  const row = doc && picked && doc.teams.find(t => t.id === picked)
  const choose = id => {
    const next = doc.groups.find(x => x.id === id)
    setGroup(id)
    if (!next.stats.includes(sort.label)) setSort({ label: next.stats.find(l => !['Wins', 'Losses'].includes(l)), reverse: false })
  }
  return (
    <main className="lb" style={{ maxWidth: 1600, margin: '0 auto', padding: '0 32px' }}>
      <header className="head-row" style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 'var(--head-h)', borderBottom: `1px solid ${RULE}` }}>
        <BrandMark />
        <SiteNav at="teams" />
      </header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', flexWrap: 'wrap' }}>
        {seasons && span
          ? (
            <SeasonPicker seasons={seasons} from={span.from} to={span.to} n={wanted.length} width="auto"
              pick={(from, to) => { setSpan({ from, to }); setEra(null); setEach(false) }}
              readout={era ? `${era}-yr runs` : null}
              aside={wanted.length > 1 && !era ? <Each each={each} set={setEach} tips={['A row for each team-season', 'One row for each team over the span']} /> : null}
              extra={<Eras era={era} set={setEra} who="team" />} />
          )
          : <span className="lb-skel" style={{ width: 184, height: 30 }} />}
        {doc ? <Groups groups={doc.groups} active={g.id} pick={choose} /> : <span className="lb-skel" style={{ width: 560, height: 30 }} />}
        <span style={{ marginLeft: 'auto' }}><ModeSwitch name="Cells read in" options={MODES} mode={mode} setMode={setMode} /></span>
      </div>
      {doc === false && <div style={{ ...label, padding: 40, border: `1px dashed ${EDGE}`, textAlign: 'center' }}>Unavailable</div>}
      {doc && (
        <div className="lb-body tb-body lb-enter">
          <div className={`lb-side${row ? ' lb-carded' : ''}`}>
            {row
              ? <TeamCard key={picked} doc={doc} team={row} season={row.season || doc.season} onClose={close} />
              : <TeamScatter doc={doc} hot={hot} setHot={setHot} onPick={setPicked} />}
          </div>
          <div className="lb-table-wrap" style={{ scrollSnapType: 'none' }}>
            <Table doc={doc} group={g} sort={by} onSort={l => setSort(s => ({ label: l, reverse: s.label === l ? !s.reverse : false }))} rankView={mode === 'rank'} hot={hot} setHot={setHot} picked={picked} onPick={toggle} />
          </div>
        </div>
      )}
    </main>
  )
}
