import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchTeamboard, fetchTeamboardSeasons } from './api.js'
import { MONO, fmt, heat, ord } from './lib/format.js'
import { ranked } from './lib/leaderboard.js'
import { seasonsBefore } from './lib/board.js'
import { seasonsBetween } from './lib/seasons.js'
import { asset } from './lib/static.js'
import { boardOver, placeOf, teamChange, tiedOf, trophiesOf } from './lib/teamboard.js'
import { UNIT_GROUPS, minutesCut } from './lib/unitsView.js'
import ModeSwitch from './components/ModeSwitch.jsx'
import SeasonPicker from './components/SeasonPicker.jsx'
import { Each, Eras } from './components/SpanControls.jsx'
import TeamScatter from './components/TeamScatter.jsx'
import BrandMark from './components/BrandMark.jsx'
import DeltaToggle from './components/DeltaToggle.jsx'
import SiteNav from './components/SiteNav.jsx'
import TeamCard from './components/TeamCard.jsx'
import Popover from './components/Popover.jsx'
import UnitsBoard from './components/UnitsBoard.jsx'
import { useLeagueUnits } from './useLeagueUnits.js'

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
// Δ VS PREV (the Leaderboard's switch) sets each season against the one before, or a
// combined span against as many seasons before it (lib/teamboard.js teamChange); none for
// runs or the first season. /teams?season=2018-19&team=PHI opens on that season with
// that team's card open (a player page's team name links here). UNITS turns the board to
// the teams' units (UnitsBoard: a table of the 30 by their units of one size beside the
// unit field) over the same seasons; a team there (or a card's ALL UNITS) opens its units
// (UnitsView) as a card over the field. &view=units in the address (with &team= for a team's),
// so a player page's lineups can link to it.
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
// The board's two views, the page's main switch: larger and brighter than the board's
// keys, the lit one underlined in the accent, each with a mark (a team's crest; a unit's
// grid of players).
const VIEWS = [['teams', 'Teams'], ['units', 'Units']]
const ViewMark = ({ v }) => (
  <svg aria-hidden="true" width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
    {v === 'teams'
      ? <path d="M1 1h9v5.5L5.5 10 1 6.5z" />
      : [0, 4, 8].flatMap(x => [0, 4, 8].map(y => <rect key={`${x}${y}`} x={x} y={y} width="3" height="3" />))}
  </svg>
)
function ViewSwitch({ view, set }) {
  return (
    <div role="group" aria-label="Board" style={{ display: 'flex', border: `1px solid ${EDGE}`, flex: 'none' }}>
      {VIEWS.map(([v, name]) => (
        <button key={v} type="button" aria-pressed={view === v} onClick={() => set(v)} className="tb-view"
          style={{ height: 28, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, background: view === v ? '#3a3734' : 'transparent', boxShadow: view === v ? 'inset 0 -2px 0 var(--accent)' : 'none', color: view === v ? INK : DIM, fontFamily: MONO, fontSize: 11, fontWeight: view === v ? 800 : 600, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
          <ViewMark v={v} />{name}
        </button>
      ))}
    </div>
  )
}
const UNIT_SIZES = [2, 3, 4, 5]
// UNITS' minutes qualifier, as the Leaderboard's MIN: all the league's units in the pool
// (lib/unitsView.js minutesCut), or the top half, quarter or tenth of them by minutes
// (a tenth, so a season's strictest asks well past the league floor). `cut`: what the pick asks, in minutes.
const TOPS = [[1, 'All'], [0.5, 'Top 50%'], [0.25, 'Top 25%'], [0.1, 'Top 10%']]
const UNIT_TOP = 0.25
function UnitMinutes({ top, set, cut }) {
  return (
    <Popover name={`Unit minutes: ${top === 1 ? 'all' : `top ${top * 100}%`}`} minWidth={240} width={94} trigger={<><span style={{ ...label, fontWeight: 400 }}>Min</span>{top === 1 ? 'All' : `${top * 100}%`}</>}>
      {close => (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: `1px solid ${EDGE}` }}>
            {TOPS.map(([t, name], i) => (
              <button key={t} type="button" className="lb-group" onClick={() => { set(t); close() }}
                style={{ height: 28, border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: t === top ? '#3a3734' : 'transparent', color: t === top ? INK : DIM, fontFamily: MONO, fontSize: 9.5, fontWeight: t === top ? 700 : 400, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 8px' }}>{name}</button>
            ))}
          </div>
          <span style={{ ...label, color: '#b8b2ab' }}>The top share of the league’s units by minutes together{cut ? `: ${Math.round(cut).toLocaleString()}+ min` : ''}</span>
        </>
      )}
    </Popover>
  )
}

// The unit size, a dropdown in RAW | RANK's place.
function SizeSelect({ k, set }) {
  return (
    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: 30, border: `1px solid ${EDGE}` }}>
      <select aria-label="Unit size" value={k} onChange={e => set(Number(e.target.value))} className="lb-select"
        style={{ appearance: 'none', height: '100%', padding: '0 28px 0 12px', border: 0, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
        {UNIT_SIZES.map(n => <option key={n} value={n} style={{ background: '#262422' }}>{n}-man units</option>)}
      </select>
      <span aria-hidden="true" style={{ position: 'absolute', right: 10, color: DIM, fontSize: 9, pointerEvents: 'none' }}>▾</span>
    </label>
  )
}
// RAW | RANK: a cell's value, or its place among the 30 ("1st", "4th", a shared one "T-6th").
const MODES = [['raw', 'Raw'], ['rank', 'Rank']]
// A row of the table; memoized, so a hover redraws only the rows it lights and unlights
// (hundreds over a span or runs).
const Row = memo(function Row({ t, doc, shown, sortLabel, rankView, on, rank, setHot, onPick }) {
  const at = l => doc.labels.indexOf(l)
  const wins = at('Wins')
  const losses = at('Losses')
  const stat = l => ({ ...doc.stats[l], relative: !!doc.stats[l].relative || RELATIVE.test(l) })
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
  const stat = l => ({ ...doc.stats[l], relative: !!doc.stats[l].relative || RELATIVE.test(l) })
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
  const [params, setParams] = useSearchParams()
  const [opening] = useState(() => params.get('season'))
  const [doc, setDoc] = useState(null)
  const [group, setGroup] = useState('overview')
  // Ranked by luck-adjusted win pace to begin with: the sheet's best read of how good a team is.
  const [sort, setSort] = useState({ label: 'LA Bayes Win-pace', reverse: false })
  const [mode, setMode] = useState('raw')
  const [hot, setHot] = useState(null)
  const [picked, setPicked] = useState(() => params.get('team'))
  const close = useCallback(() => setPicked(null), [])
  // UNITS mode, its unit size, and the team whose units are open in it, if any (a card
  // open under it stays open).
  const [unitsMode, setUnitsMode] = useState(() => params.get('view') === 'units')
  const [unitK, setUnitK] = useState(3)
  const [unitGroup, setUnitGroup] = useState('overview')
  const [unitTop, setUnitTop] = useState(UNIT_TOP)
  const [unitsOf, setUnitsOf] = useState(() => (params.get('view') === 'units' ? params.get('team') : null))
  const closeUnits = useCallback(() => setUnitsOf(null), [])
  const openUnits = useCallback(team => { setUnitsMode(true); setUnitsOf(team) }, [])
  useEffect(() => {
    setParams(p => {
      const next = new URLSearchParams(p)
      if (unitsMode) {
        next.set('view', 'units')
        if (unitsOf) next.set('team', unitsOf)
        else next.delete('team')
      } else if (next.get('view')) {
        next.delete('view')
        next.delete('team')
      }
      return next
    }, { replace: true })
  }, [unitsMode, unitsOf, setParams])
  // A row opens its card, or closes it when it's the one open.
  const toggle = useCallback(k => setPicked(p => (p === k ? null : k)), [])
  const [seasons, setSeasons] = useState(null)
  // The span on show; over many seasons a row per team-season (`each`) or one per team;
  // runs' length (3, 5 or 7), or null for the span.
  const [span, setSpan] = useState(null)
  const [each, setEach] = useState(false)
  const [era, setEra] = useState(null)
  const [delta, setDelta] = useState(false)
  // Season documents fetched so far (false: none for it).
  const [docs, setDocs] = useState({})
  useEffect(() => {
    fetchTeamboardSeasons().then(d => {
      setSeasons(d.seasons)
      const start = d.seasons.includes(opening) ? opening : d.seasons[d.seasons.length - 1]
      setSpan({ from: start, to: start })
    }, () => setDoc(false))
  }, [opening])
  const wanted = !seasons || !span ? [] : era ? seasons : seasonsBetween(span.from, span.to).filter(s => seasons.includes(s))
  // Δ's seasons before: the one before each season, or as many as a combined span has.
  const apart = each || wanted.length === 1
  const prior = !wanted.length || era ? [] : seasonsBefore(seasons, wanted[0], apart ? 1 : wanted.length)
  const changing = delta && prior.length > 0
  const needed = changing ? [...prior, ...wanted] : wanted
  const wantedKey = needed.join()
  useEffect(() => {
    const missing = needed.filter(s => !(s in docs))
    if (!missing.length) return
    let live = true
    Promise.all(missing.map(s => fetchTeamboard(s).then(d => [s, d || false], () => [s, false])))
      .then(got => live && setDocs(d => ({ ...d, ...Object.fromEntries(got) })))
    return () => { live = false }
  }, [wantedKey, docs]) // eslint-disable-line react-hooks/exhaustive-deps -- needed is wantedKey's
  // The board once every season it needs is in; the last one stays on show till then.
  useEffect(() => {
    if (!needed.length || needed.some(s => !(s in docs))) return
    const got = wanted.map(s => docs[s]).filter(Boolean)
    if (!changing) return setDoc(got.length ? boardOver(got, { each: each && got.length > 1, run: era }) : false)
    let board
    if (apart) {
      const before = [prior[0], ...wanted]
      const changes = wanted.map((s, i) => docs[s] && docs[before[i]] && teamChange(docs[s], docs[before[i]])).filter(Boolean)
      board = changes.length && boardOver(changes, { each: changes.length > 1 })
    } else {
      const was = prior.map(s => docs[s]).filter(Boolean)
      board = got.length && was.length && teamChange(boardOver(got), boardOver(was))
    }
    setDoc(board ? { ...board, change: true } : false)
  }, [wantedKey, docs, each, era, changing]) // eslint-disable-line react-hooks/exhaustive-deps -- needed is wantedKey's
  const g = doc ? doc.groups.find(x => x.id === group) || doc.groups[0] : null
  // A group the view lacks (Last month over many seasons) falls back to the first; so does
  // its sort.
  const by = g && g.stats.includes(sort.label) ? sort : g && { label: g.stats.find(l => !['Wins', 'Losses'].includes(l)), reverse: false }
  const row = doc && picked && doc.teams.find(t => t.id === picked)
  // The seasons the open card's row is set against: the one before its season, or the span before.
  const against = !row || !doc.change ? null : apart ? Array(2).fill(seasonsBefore(seasons, row.season || doc.season, 1)[0]) : [prior[0], prior[prior.length - 1]]
  // The open card's seasons, for its trophies: a run's own, a combined span's all, else its season.
  const covered = !row ? [] : era ? seasonsBetween(...row.id.split('|')[1].split('..')) : doc.many && !each ? wanted : [row.season || doc.season]
  const trophies = row ? trophiesOf(docs, covered, row.team) : []
  // The units' seasons: the open card's, else the picked span (units have no runs: a run
  // is a team's own seasons).
  const unitSeasons = row ? covered : wanted
  const boardTeams = doc ? [...new Map(doc.teams.map(t => [t.team, { team: t.team, name: t.name }])).values()].sort((a, b) => a.name.localeCompare(b.name)) : []
  // Every team's units over them, fetched only in UNITS, and the minutes MIN asks.
  const { views: unitViews, loading: unitsLoading } = useLeagueUnits(unitsMode ? unitSeasons : [], boardTeams.map(t => t.team))
  const unitCut = useMemo(() => minutesCut([...unitViews.values()], unitK, unitTop), [unitViews, unitK, unitTop])
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
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <ViewSwitch view={unitsMode ? 'units' : 'teams'} set={m => { setUnitsMode(m === 'units'); setUnitsOf(null) }} />
          <DeltaToggle on={changing && !unitsMode} set={setDelta} disabled={unitsMode || !prior.length} who="team" />
        </span>
      </header>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', flexWrap: 'wrap' }}>
        {seasons && span
          ? (
            <SeasonPicker seasons={seasons} from={span.from} to={span.to} n={wanted.length} width="auto"
              pick={(from, to) => { setSpan({ from, to }); setEra(null); setEach(false) }}
              readout={era && !unitsMode ? `${era}-yr runs` : null}
              aside={wanted.length > 1 && !era && !unitsMode ? <Each each={each} set={setEach} tips={['A row for each team-season', 'One row for each team over the span']} /> : null}
              extra={unitsMode ? null : <Eras era={era} set={setEra} who="team" />} />
          )
          : <span className="lb-skel" style={{ width: 184, height: 30 }} />}
        {doc && unitsMode
          ? <><Groups groups={UNIT_GROUPS} active={unitGroup} pick={setUnitGroup} /><UnitMinutes top={unitTop} set={setUnitTop} cut={unitCut} /></>
          : doc ? <Groups groups={doc.groups} active={g.id} pick={choose} /> : <span className="lb-skel" style={{ width: 560, height: 30 }} />}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {unitsMode ? <SizeSelect k={unitK} set={setUnitK} /> : <ModeSwitch name="Cells read in" options={MODES} mode={mode} setMode={setMode} />}
        </span>
      </div>
      {doc === false && <div style={{ ...label, padding: 40, border: `1px dashed ${EDGE}`, textAlign: 'center' }}>Unavailable</div>}
      {doc && unitsMode && unitSeasons.length > 0 && <UnitsBoard teams={boardTeams} seasons={unitSeasons} views={unitViews} loading={unitsLoading} k={unitK} min={unitCut} group={unitGroup} card={unitsOf} onPick={setUnitsOf} onClose={closeUnits} />}
      {doc && !unitsMode && (
        <div className="lb-body tb-body lb-enter">
          <div className={`lb-side${row ? ' lb-carded' : ''}`}>
            {row
              ? <TeamCard key={`${picked}|${!!doc.change}`} doc={doc} team={row} season={row.season || doc.season} against={against} trophies={trophies} onClose={close} onUnits={() => openUnits(row.team)} />
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
