import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLeaderboard, fetchLeaderboardRecent, fetchLeaderboardSeasons } from './api.js'
import { agesText, liveAges } from './lib/age.js'
import { bestEras, combined, combinedDelta, eachSeason, eras, qualified, singleYear, withPlayer } from './lib/board.js'
import { MONO } from './lib/format.js'
import { ranked, valueOf } from './lib/leaderboard.js'
import { seasonsBetween, spanYears } from './lib/seasons.js'
import { useSeasonType } from './useSeasonType.js'
import { useDragScroll } from './useDragScroll.js'
import LeaderScatter from './components/LeaderScatter.jsx'
import LeaderTable, { FilterMark } from './components/LeaderTable.jsx'
import ModeSwitch from './components/ModeSwitch.jsx'
import PlayerCard from './components/PlayerCard.jsx'
import Popover from './components/Popover.jsx'
import SeasonPicker from './components/SeasonPicker.jsx'
import SeasonToggle from './components/SeasonToggle.jsx'

// The Leaderboard: one season's players (regular season or playoffs, thinking-bball
// lib/profile.js leaderboard), a stat group's stats as a table and any two stats as a
// scatter beside it; a row or a dot opens the player's card in the scatter's place. One
// screen on a laptop (index.css .lb): the table scrolls in its box. Filters (a team, a
// name) narrow the table and fade the scatter's other dots. In the playoffs a small Δ
// toggle turns it to each player's playoffs minus regular season, and in the regular season
// a small calendar beside it switches to the latest season's last 30 days (its
// stats that can't be scoped to dates, and Footprint, greyed); RUNS (eras in the code)
// turns the regular season's board into every player's runs of 3, 5 or 7 seasons over all
// the years, each averaged; spans read by the years their seasons end ("2023–25"); RAW | PCTL sets what the table's cells read in; the row under the pointer,
// as it moves or as the table scrolls beneath it, lights its player's dot. A board longer
// than any season's (eras, many seasons) comes in pages, the scatter drawing the page. A
// stat's head filters the board to its top 75, 50 or 25% by percentile; filters add up
// across stats and groups, each marked on its head and its group's tab.
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
// Each group's scatter to begin with: two of its stats that say different things.
const AXES = {
  impact: ['BPM', 'Net On/Off'],
  creation: ['Load', 'cTOV%'],
  offense: ['Pts / 75', 'rTS%'],
  rim: ['Rim FGA', 'Rim FG%'],
  shooting: ['C&S 3s/36', 'C&S 3%'],
  defense: ['Def FGA <6ft /36', 'Def FGA Diff%'],
  team: ['Team Off', 'Team Def'],
  footprint: ['Rim scoring', 'Rim protection']
}
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
// A board longer than any one season's (eras, many seasons) comes in pages of PAGE rows.
const LONG = 600
const PAGE = 200
// What a greyed group or column says on hover in the last 30 days.
const NA = 'Unavailable for the last 30 days'

// The stat groups, a tab each; a group with a stat filtered (`filtered`: labels) carries
// the filter's mark beside its name.
function Groups({ groups, active, pick, filtered }) {
  return (
    <div role="group" aria-label="Stat group" style={{ display: 'flex', border: `1px solid ${EDGE}`, overflowX: 'auto', minWidth: 0, scrollbarWidth: 'none' }}>
      {groups.map((g, i) => {
        const on = g.id === active
        const sieved = g.stats.some(l => filtered.has(l))
        return (
          <button key={g.id} type="button" className="lb-group" aria-pressed={on} aria-disabled={g.na || undefined} onClick={() => !g.na && pick(g.id)} title={g.na ? (typeof g.na === 'string' ? g.na : NA) : undefined}
            style={{ flex: 'none', height: 28, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: on ? '#3a3734' : 'transparent', boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none', color: g.na ? FAINT : on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: g.na ? 'not-allowed' : 'pointer' }}>
            {g.name}
            {sieved && <span title="A stat here is filtered" style={{ color: 'var(--accent)', marginLeft: -1 }}><FilterMark size={8} /></span>}
          </button>
        )
      })}
    </div>
  )
}

// A long board's pages, slim, in the table's Player header (so it adds no line to the
// page): the rows on show of how many, and a step back or on.
function Pager({ n, pages, total, turn }) {
  const step = (to, name, sign) => (
    <button type="button" aria-label={name} disabled={to < 0 || to >= pages} onClick={() => turn(to)}
      style={{ width: 16, height: 16, padding: 0, border: 0, background: 'transparent', color: to < 0 || to >= pages ? FAINT : INK, fontFamily: MONO, fontSize: 12, lineHeight: 1, cursor: to < 0 || to >= pages ? 'default' : 'pointer' }}>{sign < 0 ? '‹' : '›'}</button>
  )
  return (
    <span role="group" aria-label="Pages" style={{ display: 'inline-flex', alignItems: 'center', height: 16, whiteSpace: 'nowrap' }}>
      {step(n - 1, 'Previous page', -1)}
      <span style={{ ...label, fontSize: 8.5, letterSpacing: '.06em', color: INK }}>
        {(n * PAGE + 1).toLocaleString()}–{Math.min(total, (n + 1) * PAGE).toLocaleString()}<span style={{ color: DIM }}> / {total.toLocaleString()}</span>
      </span>
      {step(n + 1, 'Next page', 1)}
    </span>
  )
}

// A span's rows: each player-season, or one per player combined over the span (the
// profile's span averages): SINGLE | COMBINED, small, beside the span's readout in the
// season picker's panel.
function Each({ each, set }) {
  return (
    <div role="group" aria-label="Rows" style={{ display: 'flex', flex: 'none', border: `1px solid ${EDGE}` }}>
      {[[true, 'Single', 'A row for each of his seasons'], [false, 'Combined', 'One row for his seasons together']].map(([on, name, tip]) => (
        <button key={name} type="button" aria-pressed={each === on} onClick={() => set(on)} title={tip}
          style={{ height: 22, padding: '0 8px', border: 0, borderLeft: on ? 0 : `1px solid ${EDGE}`, background: each === on ? '#3a3734' : 'transparent', color: each === on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 9, fontWeight: each === on ? 700 : 400, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{name}</button>
      ))}
    </div>
  )
}

// Eras, in the season picker's panel, set apart from the seasons under an OR (a run is
// a view of its own, not a span): every player's runs of 3, 5 or 7 of his seasons over all
// the years (lib/board.js eras), the span lightly beside his name; in the playoffs, of his
// playoff runs. A lit length again, or a season picked on the strip, goes back to seasons.
// Turning runs on sets the minutes qualifier to the top half.
const ERAS = [3, 5, 7]
// The ages the picker offers by age: every season's players at those ages (their age on
// February 1 of it), a row each or combined over the span; once the seasons are in, an age
// no player had (18: the 1996-97 board lacks Kobe) is dim and can't be picked. Turning it on
// reads one age, 25. A span picked, by year or by age, starts combined.
const AGES = Array.from({ length: 26 }, (_, i) => 18 + i)
const FIRST_AGE = 25
function Eras({ era, set, playoffs }) {
  const rule = <span style={{ flex: 1, height: 1, background: EDGE }} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{rule}<span style={{ ...label, fontSize: 10, color: '#b8b2ab' }}>or</span>{rule}</div>
      <span style={{ ...label, fontSize: 10, color: era ? 'var(--accent)' : INK }}>Runs <span style={{ color: '#d9d3cc' }}>· every player's 3, 5 or 7 {playoffs ? 'playoff runs' : 'seasons'} in a row, across all years</span></span>
      <div role="group" aria-label="Runs" style={{ display: 'flex', border: `1px solid ${era ? 'var(--accent)' : EDGE}` }}>
        {ERAS.map(n => (
          <button key={n} type="button" aria-pressed={era === n} onClick={() => set(era === n ? null : n)} title={era === n ? 'Back to seasons' : `Every ${n}-season run of every player, averaged`}
            style={{ flex: 1, height: 26, padding: '0 10px', border: 0, borderLeft: n === ERAS[0] ? 0 : `1px solid ${EDGE}`, background: era === n ? '#3a3734' : 'transparent', color: era === n ? INK : '#e4dfd9', fontFamily: MONO, fontSize: 11, fontWeight: era === n ? 700 : 500, letterSpacing: '.1em', cursor: 'pointer' }}>{n} YR</button>
        ))}
      </div>
    </div>
  )
}

// The minutes qualifier: everyone, or the top three-quarters, half or quarter of the rows
// by minutes (playoff minutes in the playoffs).
const TOPS = [[1, 'All'], [0.75, 'Top 75%'], [0.5, 'Top 50%'], [0.25, 'Top 25%']]
function Minutes({ top, set, playoffs }) {
  return (
    <Popover name={`Minutes: ${top === 1 ? 'all' : `top ${top * 100}%`}`} minWidth={220} width={MIN_W} trigger={<><span style={{ ...label, fontWeight: 400 }}>Min</span>{top === 1 ? 'All' : `${top * 100}%`}</>}>
      {close => (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: `1px solid ${EDGE}` }}>
            {TOPS.map(([t, name], i) => (
              <button key={t} type="button" className="lb-group" onClick={() => { set(t); close() }}
                style={{ height: 28, border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: t === top ? '#3a3734' : 'transparent', color: t === top ? INK : DIM, fontFamily: MONO, fontSize: 9.5, fontWeight: t === top ? 700 : 400, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 8px' }}>{name}</button>
            ))}
          </div>
          <span style={{ ...label, color: '#b8b2ab' }}>The top share by {playoffs ? 'playoff ' : ''}minutes, among the rows on show</span>
        </>
      )}
    </Popover>
  )
}

// The latest season's last 30 days: a small calendar reading 30, a sub-switch of the
// season toggle like the playoffs' Δ, lit while on; off (greyed, in its place) in the
// playoffs, as the window is the latest regular season's.
function RecentButton({ on, set, disabled }) {
  return (
    <button type="button" aria-pressed={on} aria-label="Last 30 days" disabled={disabled} onClick={() => set(!on)} title={disabled ? 'The last 30 days are the regular season’s' : on ? 'Back to the full season' : 'The last 30 days'}
      style={{ flex: 'none', width: 30, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: `1px solid ${on ? 'var(--accent)' : EDGE}`, background: 'transparent', color: on ? 'var(--accent)' : DIM, opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2.5" y="4" width="15" height="13.5" />
        <path d="M2.5 7.5H17.5M6.5 2V5.5M13.5 2V5.5" />
        <text x="10" y="15.3" textAnchor="middle" stroke="none" fill="currentColor" fontFamily={MONO} fontSize="7" fontWeight="700">30</text>
      </svg>
    </button>
  )
}

// The top boxes' widths, each its longest reading's ("30 days Mar 14–Apr 12", "Min 75%":
// the box says the share, its panel says top), so a choice never moves the controls.
const SEASONS_W = 200
const MIN_W = 94
const TEAM_W = 104

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const day = d => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8))}`

// Playoffs minus regular season: a small switch beside the season toggle, so the toggle
// stays the choice that matters; off (greyed, in its place) in the regular season.
function DeltaToggle({ on, set, disabled }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={() => set(!on)} title={disabled ? 'In the playoffs: each player’s playoffs minus his regular season' : "Each player's playoffs minus his regular season"}
      style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 9px', border: `1px solid ${on ? 'var(--accent)' : EDGE}`, background: 'transparent', color: on ? 'var(--accent)' : DIM, fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 400, letterSpacing: '.08em', opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, border: '1px solid currentColor', background: on ? 'currentColor' : 'transparent' }} />
      Δ VS REG
    </button>
  )
}

function Teams({ teams, team, set }) {
  return (
    <Popover name={`Team: ${team || 'all'}`} align="right" minWidth={280} width={TEAM_W} trigger={<><span style={{ ...label, fontWeight: 400 }}>Team</span>{team || 'All'}</>}>
      {close => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', border: `1px solid ${EDGE}` }}>
          {[null, ...teams].map((t, i) => (
            <button key={t || 'all'} type="button" className="lb-group" onClick={() => { set(t); close() }}
              style={{ gridColumn: t ? 'auto' : 'span 6', height: 28, border: 0, borderTop: i > 6 || (!t ? false : i > 0 && i <= 6) ? `1px solid ${EDGE}` : 0, borderLeft: t && (i - 1) % 6 ? `1px solid ${EDGE}` : 0, background: t === team ? '#3a3734' : 'transparent', color: t === team ? INK : DIM, fontFamily: MONO, fontSize: 10, fontWeight: t === team ? 700 : 400, letterSpacing: '.06em', cursor: 'pointer' }}>
              {t || 'ALL TEAMS'}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}

// A shimmering placeholder of a control or a value, while the first board loads.
const Skel = ({ w, h, round }) => <span className="lb-skel" style={{ width: w, height: h, borderRadius: round ? '50%' : 0, flex: 'none' }} />

// The line along the board's top while another board loads: filling as many seasons come
// in (`share`), or running along it for one.
const Progress = ({ share }) => (
  <div className={`lb-progress${share === null ? ' lb-indet' : ''}`} role="progressbar" aria-label="Loading" aria-valuenow={share === null ? undefined : Math.round(share * 100)}>
    <span style={share === null ? undefined : { transform: `scaleX(${Math.max(0.04, share)})` }} />
  </div>
)

// The board's shape before its first data: the table's rows and the chart's frame where
// they'll be, so the board comes up in place rather than after a blank page.
const SKEL_NAMES = [92, 70, 108, 84, 64, 100, 78]
function BoardSkeleton() {
  return (
    <div className="lb-body" aria-busy="true" aria-label="Loading the leaderboard">
      <div className="lb-table-wrap" style={{ overflow: 'hidden' }}>
        <div style={{ height: 46, borderBottom: `1px solid ${RULE}` }} />
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} style={{ height: 26, display: 'grid', gridTemplateColumns: '32px 170px 190px repeat(5, minmax(0, 1fr))', alignItems: 'center', borderBottom: `1px solid ${RULE}` }}>
            <span style={{ justifySelf: 'center' }}><Skel w={12} h={7} /></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px 0 4px' }}><Skel w={20} h={20} round /><Skel w={SKEL_NAMES[i % SKEL_NAMES.length]} h={9} /></span>
            <span style={{ display: 'flex', gap: 12, padding: '0 7px' }}>{[26, 18, 16, 16, 30].map((w, j) => <Skel key={j} w={w} h={7} />)}</span>
            {[0, 1, 2, 3, 4].map(j => <span key={j} style={{ justifySelf: 'end', paddingRight: 7 }}><Skel w={34} h={8} /></span>)}
          </div>
        ))}
      </div>
      <div className="lb-side">
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${RULE}` }}><Skel w={96} h={28} /><Skel w={96} h={28} /></div>
        <div style={{ flex: 1, minHeight: 240, margin: '16px 14px 30px 30px', border: `1px solid ${RULE}` }} />
        <div style={{ height: 62, borderTop: `1px solid ${RULE}` }} />
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const { playoffs } = useSeasonType()
  const [seasons, setSeasons] = useState(null)
  // The span on show; with more than one season, a row per player-season (`each`) or one
  // per player over the span; the minutes qualifier the reader picked (null: the view's
  // default, `top` below), cleared by a new span or a switch of mode or of runs.
  const [span, setSpan] = useState(null)
  const [each, setEach] = useState(false)
  const [chosenTop, setTop] = useState(null)
  // Season documents fetched so far, by kind and season (false: none for it).
  const [cache, setCache] = useState({})
  const [group, setGroup] = useState('impact')
  const [sort, setSort] = useState({ label: 'BPM', reverse: false })
  const [axes, setAxes] = useState({ x: AXES.impact[0], y: AXES.impact[1] })
  const [team, setTeam] = useState(null)
  const [find, setFind] = useState('')
  const [picked, setPicked] = useState(null)
  const [delta, setDelta] = useState(false)
  const [recent, setRecent] = useState(false)
  // Eras' length (3, 5 or 7 seasons), or null for seasons; the ages picked by age, or null.
  const [era, setEra] = useState(null)
  const [ages, setAges] = useState(null)
  const [mode, setMode] = useState('raw')
  const [hot, setHot] = useState(null)
  const close = useCallback(() => setPicked(null), [])
  // Whether a card was already open, so the next one's intro plays only when the card opens.
  const wasOpen = useRef(false)
  const wrap = useRef(null)
  // The row under the pointer: found from where the pointer is, so a scroll (which moves
  // rows under a still pointer and fires no pointer events) finds the new one too.
  const pointer = useRef(null)
  const under = () => {
    const at = pointer.current
    const row = at && document.elementFromPoint(at.x, at.y)?.closest('tr[data-id]')
    setHot(row ? row.dataset.id : null)
  }
  const track = e => {
    pointer.current = { x: e.clientX, y: e.clientY }
    under()
  }
  const leave = () => {
    pointer.current = null
    setHot(null)
  }

  useEffect(() => {
    let live = true
    setTop(null)
    fetchLeaderboardSeasons(playoffs).then(d => {
      if (!live) return
      const list = d ? d.seasons : []
      setSeasons(list)
      const last = list[list.length - 1] || null
      setSpan(s => (s && list.includes(s.from) && list.includes(s.to) ? s : last && { from: last, to: last }))
    })
    return () => { live = false }
  }, [playoffs])

  // The documents the board is built from: each season's of the mode on show, or, for a
  // combined span of playoffs minus regular season, both kinds for every season. Keys are
  // kind|season; the effects follow them as strings.
  // The last 30 days are one document whatever the span; eras take every season (in the
  // playoffs, every playoff season, without the Δ: a run averages one kind of season).
  const windowed = recent && !playoffs
  const eraOn = !windowed ? era : null
  const ageOn = !windowed ? ages : null
  // The ages the seasons loaded so far have players at.
  const agesThere = useMemo(() => {
    const kind = playoffs ? 'playoffs|' : 'regular|'
    const there = new Set()
    for (const [k, d] of Object.entries(cache)) if (d && k.startsWith(kind)) for (const p of d.players) if (p.age !== null && p.age !== undefined) there.add(Math.floor(p.age))
    return AGES.filter(a => there.has(a))
  }, [cache, playoffs])
  const inSpan = useMemo(() => (!seasons ? [] : eraOn || ageOn ? seasons : span ? seasonsBetween(span.from, span.to).filter(x => seasons.includes(x)) : []), [span, seasons, eraOn, ageOn])
  const many = !windowed && inSpan.length > 1
  // The minutes qualifier (the top share by minutes): the reader's pick, else the view's
  // default: the top half for anything over several seasons (a span, an age, runs), the
  // top three-quarters for one playoff season, everyone for one regular season.
  const top = chosenTop ?? (eraOn || ageOn || many ? 0.5 : playoffs ? 0.75 : 1)
  const kinds = windowed ? ['recent'] : !playoffs ? ['regular'] : !delta || eraOn || ageOn ? ['playoffs'] : many && !each ? ['playoffs', 'regular'] : ['delta']
  const wantedKey = windowed ? 'recent|window' : kinds.flatMap(kind => inSpan.map(x => `${kind}|${x}`)).join()
  const missingKey = wantedKey ? wantedKey.split(',').filter(k => !(k in cache)).join() : ''
  useEffect(() => {
    if (!missingKey) return
    let live = true
    for (const key of missingKey.split(',')) {
      const [kind, x] = key.split('|')
      const load = kind === 'recent' ? fetchLeaderboardRecent() : fetchLeaderboard(x, kind !== 'regular', kind === 'delta')
      // Each season with its Player group (age and height), but for playoffs minus regular
      // season, where neither is a change.
      const ready = d => (kind === 'delta' ? liveAges(d) : withPlayer(liveAges(d)))
      load.then(d => live && setCache(c => ({ ...c, [key]: d ? ready(d) : false })), () => live && setCache(c => ({ ...c, [key]: false })))
    }
    return () => { live = false }
  }, [missingKey])
  const fresh = useMemo(() => {
    const wanted = wantedKey ? wantedKey.split(',') : []
    if (!wanted.length || wanted.some(k => !(k in cache))) return null
    const docsOf = kind => wanted.filter(k => k.startsWith(`${kind}|`)).map(k => cache[k]).filter(Boolean)
    if (wanted.some(k => k.startsWith('regular|')) && wanted.some(k => k.startsWith('playoffs|'))) {
      const po = docsOf('playoffs')
      const rs = docsOf('regular')
      if (!po.length || !rs.length) return false
      const board = combinedDelta(po, rs.map(singleYear))
      return { ...board, players: qualified(board.players, top) }
    }
    // Over many seasons the shooting stats are each season's own: their rolling windows
    // would overlap.
    const loaded = docsOf(wanted[0].split('|')[0])
    if (!loaded.length) return false
    const docs = loaded.length > 1 ? loaded.map(singleYear) : loaded
    // By age, each season keeps its players at those ages.
    const aged = !ageOn ? docs : docs.map(d => ({ ...d, players: d.players.filter(p => p.age !== null && p.age !== undefined && Math.floor(p.age) >= ageOn.from && Math.floor(p.age) <= ageOn.to) }))
    const board = eraOn ? eras(aged, eraOn) : each || aged.length === 1 ? eachSeason(aged) : combined(aged)
    // By age, a combined row's seasons differ from player to player: each carries its own
    // span (`era`), beside his name as a run's is.
    const players = ageOn && board.combined ? board.players.map(p => ({ ...p, era: [p.seasons[0], p.seasons[p.seasons.length - 1]] })) : board.players
    return { ...board, players: qualified(players, top) }
  }, [cache, wantedKey, each, top, eraOn, ageOn])
  // While another board loads (a span, eras, the last 30 days, the playoffs) the last one
  // stays up, dimmed under a progress line, and the new one comes up in its place; before
  // the first, the board's shape shows (BoardSkeleton).
  const [held, setHeld] = useState(null)
  if (fresh && fresh !== held) setHeld(fresh)
  const doc = fresh === null ? held : fresh
  // The table pans under a mouse drag, once the board is in.
  useDragScroll(wrap, !!doc)
  const loading = fresh === null && !!doc
  const wanted = wantedKey ? wantedKey.split(',') : []
  const progress = wanted.length > 1 ? wanted.filter(k => k in cache).length / wanted.length : null

  // A group the season type lacks (Footprint in the playoffs), or one greyed in the last 30
  // days, falls back to the first;
  // a sort or axis the document lacks, to the group's own. A default axis with no values (a
  // stat its season's data doesn't have yet) gives way to the group's next one that has.
  // The table's tabs: every group but those only for the chart's axes (Player).
  // A board without Footprint (the playoffs') keeps its tab in place, greyed.
  const tabs = !doc ? [] : [...doc.groups.filter(x => !x.axesOnly), ...(doc.groups.some(x => x.id === 'footprint') ? [] : [{ id: 'footprint', name: 'Footprint', stats: [], na: 'Regular season only' }])]
  const g = doc ? tabs.find(x => x.id === group && !x.na) || tabs[0] : null
  const has = l => doc && doc.labels.includes(l)
  const filled = l => has(l) && doc.players.some(p => p.v[doc.labels.indexOf(l)] !== null)
  const axesOf = gr => [...new Set([...(AXES[gr.id] || []), ...gr.stats])].filter(filled).slice(0, 2)
  const sortLabel = has(sort.label) ? sort.label : g && g.stats[0]
  const pair = g && axesOf(g)
  // An axis on a stat with no values here (the last 30 days lack some) gives way too.
  const x = filled(axes.x) ? axes.x : pair && pair[0]
  const y = filled(axes.y) ? axes.y : pair && pair[1]
  const choose = id => {
    const next = doc.groups.find(gr => gr.id === id)
    setGroup(id)
    setSort({ label: next.stats[0], reverse: false })
    const [ax, ay] = axesOf(next)
    setAxes({ x: ax, y: ay })
  }
  const onSort = useCallback(l => setSort(s => ({ label: l, reverse: s.label === l ? !s.reverse : false })), [])
  // Percentile filters by stat (label -> the top share kept), across groups and boards.
  const [filters, setFilters] = useState({})
  const setFilter = useCallback((l, share) => setFilters(f => {
    const next = { ...f }
    if (share) next[l] = share
    else delete next[l]
    return next
  }), [])
  const filtered = useMemo(() => new Set(Object.keys(filters)), [filters])
  // A new season, group or sort starts the table at its top; only a new group (other
  // columns) starts it at its left as well, so a sort keeps the stats in view.
  const gid = g ? g.id : null
  useEffect(() => { if (wrap.current) wrap.current.scrollTo({ top: 0 }) }, [span, playoffs, delta, windowed, each, eraOn, ageOn, top, gid, sortLabel, sort.reverse])
  useEffect(() => { if (wrap.current) wrap.current.scrollTo({ left: 0 }) }, [gid])

  const q = fold(find.trim())
  // Kept between renders so lighting a dot doesn't redraw the table (LeaderTable is memo).
  // Ranked once per board and sort, so typing a name (on thousands of eras) only filters.
  const sorted = useMemo(() => {
    if (!doc) return null
    const best = ranked(doc, doc.players, sortLabel)
    return {
      list: sort.reverse ? ranked(doc, doc.players, sortLabel, true) : best,
      rank: new Map(best.map((p, i) => [p.id, valueOf(doc, p, sortLabel) === null ? null : i + 1]))
    }
  }, [doc, sortLabel, sort.reverse])
  // A stat's filter keeps the rows at or above its share's percentile (the top 25%: the
  // 75th and up); a stat this board lacks (the last 30 days lack some) filters nothing.
  const sieve = useMemo(() => (!doc ? [] : Object.entries(filters).map(([l, share]) => [doc.labels.indexOf(l), 100 - share * 100]).filter(([k]) => k >= 0)), [doc, filters])
  const { rank, rows, shown } = useMemo(() => {
    if (!sorted) return { rank: new Map(), rows: [], shown: new Set() }
    const keep = p => (!team || p.team === team || (p.teams || []).includes(team)) && (!q || fold(p.name).includes(q)) && sieve.every(([k, least]) => p.p[k] !== null && p.p[k] !== undefined && p.p[k] >= least)
    const list = sorted.list.filter(keep)
    return { rank: sorted.rank, rows: list, shown: new Set(list.map(p => p.id)) }
  }, [sorted, team, q, sieve])
  // A long board (eras, many seasons) comes a page at a time, and the chart draws that page:
  // thousands of rows and dots at once make the table and chart crawl. A new list (another
  // sort, filter or span) starts at its first page.
  const [paging, setPaging] = useState({ rows: null, n: 0 })
  const pages = rows.length > LONG ? Math.ceil(rows.length / PAGE) : 1
  const pageN = paging.rows === rows ? Math.min(paging.n, pages - 1) : 0
  const drawn = useMemo(() => (pages > 1 ? rows.slice(pageN * PAGE, (pageN + 1) * PAGE) : rows), [rows, pages, pageN])
  useEffect(() => { if (wrap.current) wrap.current.scrollTo({ top: 0 }) }, [pageN])
  // Made once per page, so the table (memo) isn't redrawn as a dot lights.
  const pager = useMemo(() => (pages > 1 ? <Pager n={pageN} pages={pages} total={rows.length} turn={n => setPaging({ rows, n })} /> : null), [pageN, pages, rows])
  // The chart: everyone on the board (in eras, each player's best era for its two stats,
  // and the page's own eras), the table's rows lit and the rest faint behind them; on a
  // board in pages only the page's rows are lit (live), as thousands of live dots crawl.
  const chartDoc = useMemo(() => {
    if (!doc) return doc
    const base = doc.eras && x && y ? bestEras(doc, x, y) : doc
    if (pages === 1) return base
    const ids = new Set(base.players.map(p => p.id))
    return { ...base, players: [...base.players, ...drawn.filter(p => !ids.has(p.id))] }
  }, [doc, pages, drawn, x, y])
  const lit = useMemo(() => (pages > 1 ? new Set(drawn.map(p => p.id)) : shown), [pages, drawn, shown])
  const teams = doc ? [...new Set(doc.players.flatMap(p => p.teams || [p.team]))].filter(t => !/TM$/.test(t)).sort() : []
  const player = doc && picked ? doc.players.find(p => p.id === picked) : null
  useEffect(() => { wasOpen.current = !!player })
  // A board with no one on it at all (no player of those ages): no table, nothing to chart.
  const none = doc && !doc.players.length ? (ageOn ? `No players at ${agesText(ageOn.from, ageOn.to).toLowerCase()}` : 'No players') : null
  const spanText = windowed ? 'Last 30 days' : eraOn ? `${eraOn}-season runs` : ageOn ? agesText(ageOn.from, ageOn.to) : !span ? '' : span.from === span.to ? span.from.replace('-', '–') : spanYears(span.from, span.to)

  return (
    <main className="lb" style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${RULE}` }}>
        <Link to="/" style={{ ...label, fontSize: 10, color: '#b3ada6' }}>← All players</Link>
        <span style={{ ...label, fontSize: 10, color: INK, fontWeight: 700, border: `1px solid ${EDGE}`, padding: '5px 9px' }}>Leaderboard</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RecentButton on={recent && !playoffs} set={setRecent} disabled={playoffs} />
          <SeasonToggle regularLit={!recent} onRegular={() => setRecent(false)} />
          <DeltaToggle on={delta && playoffs && !eraOn && !ageOn} set={setDelta} disabled={!playoffs || !!eraOn || !!ageOn} />
        </span>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', flexWrap: 'wrap' }}>
        {/* One box for the seasons whatever's on: the last 30 days read their dates in it, the
            picker off; it's a placeholder of its size until the seasons are known. */}
        {seasons && span
          ? (
            <SeasonPicker seasons={seasons} from={span.from} to={span.to} n={inSpan.length} width={SEASONS_W}
              title={windowed ? '30 days' : 'Seasons'} disabled={windowed}
              pick={(from, to) => { setSpan({ from, to }); setEra(null); setEach(false); setTop(null) }}
              ages={{
                on: !!ages,
                set: on => { setAges(on ? a => a || { from: FIRST_AGE, to: FIRST_AGE } : null); setTop(null); if (on) { setEra(null); setEach(false) } },
                list: agesThere.length ? agesThere : AGES,
                all: AGES,
                from: ages ? ages.from : FIRST_AGE,
                to: ages ? ages.to : FIRST_AGE,
                pick: (from, to) => { setAges({ from, to }); setEach(false); setTop(null) }
              }}
              readout={windowed ? (doc && doc.window ? `${day(doc.window.start)}–${day(doc.window.end)}` : '…') : eraOn ? `${eraOn}-yr runs` : null}
              aside={many && !eraOn ? <Each each={each} set={setEach} /> : null}
              extra={<Eras era={eraOn} set={n => { setEra(n); setTop(null); if (n) setAges(null) }} playoffs={playoffs} />} />
          )
          : <Skel w={SEASONS_W} h={30} />}
        {doc ? <Minutes top={top} set={setTop} playoffs={playoffs} /> : <Skel w={MIN_W} h={30} />}
        {doc ? <Groups groups={tabs} active={g.id} pick={choose} filtered={filtered} /> : doc === null && <Skel w={586} h={30} />}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', maxWidth: '100%' }}>
          <ModeSwitch mode={mode} setMode={setMode} height={28} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', border: `1px solid ${EDGE}` }}>
            <span aria-hidden="true" style={{ ...label, color: FAINT }}>Find</span>
            <input value={find} onChange={e => setFind(e.target.value)} aria-label="Find a player" spellCheck={false}
              style={{ width: 96, background: 'transparent', border: 0, outline: 'none', color: INK, fontFamily: MONO, fontSize: 11, caretColor: 'var(--accent)' }} />
          </label>
          {doc ? <Teams teams={teams} team={team} set={setTeam} /> : <Skel w={TEAM_W} h={30} />}
        </span>
      </div>

      {doc === false && <div style={{ ...label, padding: 40, border: `1px dashed ${EDGE}`, textAlign: 'center' }}>Unavailable</div>}
      {doc === null && <BoardSkeleton />}
      {doc && (
        <div className={`lb-body lb-enter${loading ? ' lb-loading' : ''}`} aria-busy={loading || undefined}>
          {/* Many seasons (a long span, or eras' every one) fill it as they come in. */}
          {loading && <Progress share={progress} />}
          <div ref={wrap} className="lb-table-wrap" onPointerMove={track} onPointerLeave={leave} onScroll={under}>
            <LeaderTable doc={doc} group={g} rows={drawn} pager={pager} rank={rank} sortLabel={sortLabel} reverse={sort.reverse} onSort={onSort} pct={mode === 'pctl'} filters={filters} setFilter={setFilter}
              picked={picked} onPick={setPicked} scroller={wrap} />
            {!rows.length && <div style={{ ...label, padding: 28, textAlign: 'center' }}>{none || 'No players match'}</div>}
          </div>
          <div className={`lb-side${player ? ' lb-carded' : ''}`}>
            {player
              ? <PlayerCard key={`${player.id}|${spanText}|${doc.type}|${doc.combined ? 'c' : 'e'}`} intro={!wasOpen.current} doc={doc} player={player} rank={rank.get(player.id)} sortLabel={sortLabel} onClose={close} spanText={player.era ? (player.era[0] === player.era[1] ? player.era[0].replace('-', '–') : spanYears(player.era[0], player.era[1])) : spanText} />
              : x && y
                ? <LeaderScatter doc={chartDoc} shown={lit} hot={hot} x={x} y={y} setAxis={(k, v) => setAxes(a => ({ ...a, [k]: v }))} onPick={setPicked} seasonLabel={spanText} />
                : <div style={{ ...label, padding: 28, textAlign: 'center' }}>{none || 'Nothing to chart'}</div>}
          </div>
        </div>
      )}
    </main>
  )
}
