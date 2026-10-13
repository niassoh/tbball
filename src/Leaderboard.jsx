import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLeaderboard, fetchLeaderboardRecent, fetchLeaderboardSeasons } from './api.js'
import { combined, combinedDelta, eachSeason, qualified, singleYear } from './lib/board.js'
import { MONO } from './lib/format.js'
import { ranked, valueOf } from './lib/leaderboard.js'
import { seasonsBetween } from './lib/seasons.js'
import { useSeasonType } from './useSeasonType.js'
import LeaderScatter from './components/LeaderScatter.jsx'
import LeaderTable from './components/LeaderTable.jsx'
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
// stats that can't be scoped to dates, and Footprint, greyed); RAW | PCTL sets what the
// table's cells read in; the row under the pointer,
// as it moves or as the table scrolls beneath it, lights its player's dot.
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
// What a greyed group or column says on hover in the last 30 days.
const NA = 'Unavailable for the last 30 days'

function Groups({ groups, active, pick }) {
  return (
    <div role="group" aria-label="Stat group" style={{ display: 'flex', border: `1px solid ${EDGE}`, overflowX: 'auto', minWidth: 0, scrollbarWidth: 'none' }}>
      {groups.map((g, i) => {
        const on = g.id === active
        return (
          <button key={g.id} type="button" className="lb-group" aria-pressed={on} aria-disabled={g.na || undefined} onClick={() => !g.na && pick(g.id)} title={g.na ? NA : undefined}
            style={{ flex: 'none', height: 28, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: on ? '#3a3734' : 'transparent', boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none', color: g.na ? FAINT : on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: g.na ? 'not-allowed' : 'pointer' }}>
            {g.name}
          </button>
        )
      })}
    </div>
  )
}

// A span's rows: each player-season, or one per player combined over the span (the
// profile's span averages). In the season picker's panel.
function Each({ each, set }) {
  return (
    <div role="group" aria-label="Rows" style={{ display: 'flex', border: `1px solid ${EDGE}` }}>
      {[[true, 'Each season'], [false, 'Combined']].map(([on, name]) => (
        <button key={name} type="button" aria-pressed={each === on} onClick={() => set(on)}
          style={{ flex: 1, height: 26, padding: '0 10px', border: 0, borderLeft: on ? 0 : `1px solid ${EDGE}`, background: each === on ? '#3a3734' : 'transparent', color: each === on ? INK : DIM, fontFamily: MONO, fontSize: 9, fontWeight: each === on ? 700 : 400, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{name}</button>
      ))}
    </div>
  )
}

// The minutes qualifier: everyone, or the top three-quarters, half or quarter of the rows
// by minutes (playoff minutes in the playoffs).
const TOPS = [[1, 'All'], [0.75, 'Top 75%'], [0.5, 'Top 50%'], [0.25, 'Top 25%']]
function Minutes({ top, set, playoffs }) {
  return (
    <Popover name={`Minutes: ${top === 1 ? 'all' : `top ${top * 100}%`}`} minWidth={220} trigger={<><span style={{ ...label, fontWeight: 400 }}>Min</span>{TOPS.find(([t]) => t === top)[1]}</>}>
      {close => (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: `1px solid ${EDGE}` }}>
            {TOPS.map(([t, name], i) => (
              <button key={t} type="button" className="lb-group" onClick={() => { set(t); close() }}
                style={{ height: 28, border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: t === top ? '#3a3734' : 'transparent', color: t === top ? INK : DIM, fontFamily: MONO, fontSize: 9.5, fontWeight: t === top ? 700 : 400, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', padding: '0 8px' }}>{name}</button>
            ))}
          </div>
          <span style={{ ...label, color: FAINT }}>By {playoffs ? 'playoff ' : ''}minutes, among the rows on show</span>
        </>
      )}
    </Popover>
  )
}

// The latest season's last 30 days: a small calendar reading 30, a sub-switch of the
// season toggle like the playoffs' Δ, there only in the regular season (the window is the
// latest regular season's), lit while on.
function RecentButton({ on, set }) {
  return (
    <button type="button" aria-pressed={on} aria-label="Last 30 days" onClick={() => set(!on)} title={on ? 'Back to the full season' : 'The last 30 days'}
      style={{ flex: 'none', width: 30, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: `1px solid ${on ? 'var(--accent)' : EDGE}`, background: 'transparent', color: on ? 'var(--accent)' : DIM, cursor: 'pointer' }}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2.5" y="4" width="15" height="13.5" />
        <path d="M2.5 7.5H17.5M6.5 2V5.5M13.5 2V5.5" />
        <text x="10" y="15.3" textAnchor="middle" stroke="none" fill="currentColor" fontFamily={MONO} fontSize="7" fontWeight="700">30</text>
      </svg>
    </button>
  )
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const day = d => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8))}`

// Playoffs minus regular season: a small switch beside the season toggle, there only in
// the playoffs, so the toggle stays the choice that matters.
function DeltaToggle({ on, set }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => set(!on)} title="Each player's playoffs minus his regular season"
      style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 9px', border: `1px solid ${on ? 'var(--accent)' : EDGE}`, background: 'transparent', color: on ? 'var(--accent)' : DIM, fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 400, letterSpacing: '.08em', cursor: 'pointer' }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, border: '1px solid currentColor', background: on ? 'currentColor' : 'transparent' }} />
      Δ VS REG
    </button>
  )
}

function Teams({ teams, team, set }) {
  return (
    <Popover name={`Team: ${team || 'all'}`} align="right" minWidth={280} trigger={<><span style={{ ...label, fontWeight: 400 }}>Team</span>{team || 'All'}</>}>
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

export default function Leaderboard() {
  const { playoffs } = useSeasonType()
  const [seasons, setSeasons] = useState(null)
  // The span on show; with more than one season, a row per player-season (`each`) or one
  // per player over the span; the minutes qualifier (`top`: the top share by minutes).
  const [span, setSpan] = useState(null)
  const [each, setEach] = useState(false)
  const [top, setTop] = useState(1)
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
  const [mode, setMode] = useState('raw')
  const [hot, setHot] = useState(null)
  const close = useCallback(() => setPicked(null), [])
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
  const inSpan = useMemo(() => (span && seasons ? seasonsBetween(span.from, span.to).filter(x => seasons.includes(x)) : []), [span, seasons])
  // The last 30 days are one document whatever the span.
  const windowed = recent && !playoffs
  const many = !windowed && inSpan.length > 1
  const kinds = windowed ? ['recent'] : !playoffs ? ['regular'] : !delta ? ['playoffs'] : many && !each ? ['playoffs', 'regular'] : ['delta']
  const wantedKey = windowed ? 'recent|window' : kinds.flatMap(kind => inSpan.map(x => `${kind}|${x}`)).join()
  const missingKey = wantedKey ? wantedKey.split(',').filter(k => !(k in cache)).join() : ''
  useEffect(() => {
    if (!missingKey) return
    let live = true
    for (const key of missingKey.split(',')) {
      const [kind, x] = key.split('|')
      const load = kind === 'recent' ? fetchLeaderboardRecent() : fetchLeaderboard(x, kind !== 'regular', kind === 'delta')
      load.then(d => live && setCache(c => ({ ...c, [key]: d || false })), () => live && setCache(c => ({ ...c, [key]: false })))
    }
    return () => { live = false }
  }, [missingKey])
  const doc = useMemo(() => {
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
    const board = each || docs.length === 1 ? eachSeason(docs) : combined(docs)
    return { ...board, players: qualified(board.players, top) }
  }, [cache, wantedKey, each, top])

  // A group the season type lacks (Footprint in the playoffs), or one greyed in the last 30
  // days, falls back to the first;
  // a sort or axis the document lacks, to the group's own. A default axis with no values (a
  // stat its season's data doesn't have yet) gives way to the group's next one that has.
  const g = doc ? doc.groups.find(x => x.id === group && !x.na) || doc.groups[0] : null
  const has = l => doc && doc.labels.includes(l)
  const filled = l => has(l) && doc.players.some(p => p.v[doc.labels.indexOf(l)] !== null)
  const axesOf = gr => [...new Set([...(AXES[gr.id] || []), ...gr.stats])].filter(filled).slice(0, 2)
  const sortLabel = has(sort.label) ? sort.label : g && g.stats[0]
  const pair = g && axesOf(g)
  const x = has(axes.x) ? axes.x : pair && pair[0]
  const y = has(axes.y) ? axes.y : pair && pair[1]
  const choose = id => {
    const next = doc.groups.find(gr => gr.id === id)
    setGroup(id)
    setSort({ label: next.stats[0], reverse: false })
    const [ax, ay] = axesOf(next)
    setAxes({ x: ax, y: ay })
  }
  const onSort = useCallback(l => setSort(s => ({ label: l, reverse: s.label === l ? !s.reverse : false })), [])
  // A new season, group or sort starts the table at its top; only a new group (other
  // columns) starts it at its left as well, so a sort keeps the stats in view.
  const gid = g ? g.id : null
  useEffect(() => { if (wrap.current) wrap.current.scrollTo({ top: 0 }) }, [span, playoffs, delta, windowed, each, top, gid, sortLabel, sort.reverse])
  useEffect(() => { if (wrap.current) wrap.current.scrollTo({ left: 0 }) }, [gid])

  const q = fold(find.trim())
  // Kept between renders so lighting a dot doesn't redraw the table (LeaderTable is memo).
  const { rank, rows, shown } = useMemo(() => {
    if (!doc) return { rank: new Map(), rows: [], shown: new Set() }
    const best = ranked(doc, doc.players, sortLabel)
    const keep = p => (!team || p.team === team || (p.teams || []).includes(team)) && (!q || fold(p.name).includes(q))
    const list = (sort.reverse ? ranked(doc, doc.players, sortLabel, true) : best).filter(keep)
    return {
      rank: new Map(best.map((p, i) => [p.id, valueOf(doc, p, sortLabel) === null ? null : i + 1])),
      rows: list,
      shown: new Set(list.map(p => p.id))
    }
  }, [doc, sortLabel, sort.reverse, team, q])
  const teams = doc ? [...new Set(doc.players.flatMap(p => p.teams || [p.team]))].filter(t => !/TM$/.test(t)).sort() : []
  const player = doc && picked ? doc.players.find(p => p.id === picked) : null
  const spanText = windowed ? 'Last 30 days' : !span ? '' : span.from === span.to ? span.from.replace('-', '–') : `${span.from.slice(0, 4)}–${span.to.slice(5)}`

  return (
    <main className="lb" style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${RULE}` }}>
        <Link to="/" style={{ ...label, fontSize: 10, color: '#b3ada6' }}>← All players</Link>
        <span style={{ ...label, fontSize: 10, color: INK, fontWeight: 700, border: `1px solid ${EDGE}`, padding: '5px 9px' }}>Leaderboard</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {!playoffs && <RecentButton on={recent} set={setRecent} />}
          <SeasonToggle />
          {playoffs && <DeltaToggle on={delta} set={setDelta} />}
        </span>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', flexWrap: 'wrap' }}>
        {windowed && doc && doc.window && (
          <span style={{ ...label, height: 30, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 10px', border: `1px solid ${EDGE}`, color: INK }}>
            <span style={{ color: DIM }}>Last 30 days</span>{day(doc.window.start)} – {day(doc.window.end)}, {doc.window.end.slice(0, 4)}
          </span>
        )}
        {!windowed && seasons && span && (
          <SeasonPicker seasons={seasons} from={span.from} to={span.to} n={inSpan.length} pick={(from, to) => setSpan({ from, to })}
            extra={many && <Each each={each} set={setEach} />} />
        )}
        {doc && <Minutes top={top} set={setTop} playoffs={playoffs} />}
        {doc && <Groups groups={doc.groups} active={g.id} pick={choose} />}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', maxWidth: '100%' }}>
          <ModeSwitch mode={mode} setMode={setMode} height={28} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', border: `1px solid ${EDGE}` }}>
            <span aria-hidden="true" style={{ ...label, color: FAINT }}>Find</span>
            <input value={find} onChange={e => setFind(e.target.value)} aria-label="Find a player" spellCheck={false}
              style={{ width: 96, background: 'transparent', border: 0, outline: 'none', color: INK, fontFamily: MONO, fontSize: 11, caretColor: 'var(--accent)' }} />
          </label>
          {doc && <Teams teams={teams} team={team} set={setTeam} />}
        </span>
      </div>

      {doc === false && <div style={{ ...label, padding: 40, border: `1px dashed ${EDGE}`, textAlign: 'center' }}>Unavailable</div>}
      {doc && (
        <div className="lb-body">
          <div ref={wrap} className="lb-table-wrap" onPointerMove={track} onPointerLeave={leave} onScroll={under}>
            <LeaderTable doc={doc} group={g} rows={rows} rank={rank} sortLabel={sortLabel} reverse={sort.reverse} onSort={onSort} pct={mode === 'pctl'}
              picked={picked} onPick={setPicked} scroller={wrap} />
            {!rows.length && <div style={{ ...label, padding: 28, textAlign: 'center' }}>No players match</div>}
          </div>
          <div className={`lb-side${player ? ' lb-carded' : ''}`}>
            {player
              ? <PlayerCard key={`${player.id}|${spanText}|${doc.type}|${doc.combined ? 'c' : 'e'}`} doc={doc} player={player} rank={rank.get(player.id)} sortLabel={sortLabel} onClose={close} spanText={spanText} />
              : <LeaderScatter doc={doc} shown={shown} hot={hot} x={x} y={y} setAxis={(k, v) => setAxes(a => ({ ...a, [k]: v }))} onPick={setPicked} seasonLabel={spanText} />}
          </div>
        </div>
      )}
    </main>
  )
}
