import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLeaderboard, fetchLeaderboardSeasons } from './api.js'
import { MONO } from './lib/format.js'
import { ranked, valueOf } from './lib/leaderboard.js'
import { useSeasonType } from './useSeasonType.js'
import LeaderScatter from './components/LeaderScatter.jsx'
import LeaderTable from './components/LeaderTable.jsx'
import PlayerCard from './components/PlayerCard.jsx'
import Popover from './components/Popover.jsx'
import SeasonPicker from './components/SeasonPicker.jsx'
import SeasonToggle from './components/SeasonToggle.jsx'

// The Leaderboard: one season's players (regular season or playoffs, thinking-bball
// lib/profile.js leaderboard), a stat group's stats as a table and any two stats as a
// scatter beside it; a row or a dot opens the player's card in the scatter's place. One
// screen on a laptop (index.css .lb): the table scrolls in its box. Filters (a team, a
// name) narrow the table and fade the scatter's other dots; the row under the pointer,
// as it moves or as the table scrolls beneath it, lights its player's dot.
const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
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

function Groups({ groups, active, pick }) {
  return (
    <div role="group" aria-label="Stat group" style={{ display: 'flex', border: `1px solid ${EDGE}`, overflowX: 'auto', minWidth: 0, scrollbarWidth: 'none' }}>
      {groups.map((g, i) => {
        const on = g.id === active
        return (
          <button key={g.id} type="button" className="lb-group" aria-pressed={on} onClick={() => pick(g.id)}
            style={{ flex: 'none', height: 28, padding: '0 11px', display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: on ? '#3a3734' : 'transparent', boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none', color: on ? INK : DIM, fontFamily: MONO, fontSize: 9.5, fontWeight: on ? 700 : 400, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {g.name}
          </button>
        )
      })}
    </div>
  )
}

function Teams({ teams, team, set }) {
  return (
    <Popover name={`Team: ${team || 'all'}`} minWidth={280} trigger={<><span style={{ ...label, fontWeight: 400 }}>Team</span>{team || 'All'}</>}>
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
  const [season, setSeason] = useState(null)
  const [doc, setDoc] = useState(null)
  const [group, setGroup] = useState('impact')
  const [sort, setSort] = useState({ label: 'BPM', reverse: false })
  const [axes, setAxes] = useState({ x: AXES.impact[0], y: AXES.impact[1] })
  const [team, setTeam] = useState(null)
  const [find, setFind] = useState('')
  const [picked, setPicked] = useState(null)
  const [hot, setHot] = useState(null)
  const close = useCallback(() => setPicked(null), [])
  const wrap = useRef(null)
  // The row under the pointer: found from where the pointer is, so a scroll (which moves
  // rows under a still pointer and fires no pointer events) finds the new one too.
  const pointer = useRef(null)
  const under = () => {
    const at = pointer.current
    const row = at && document.elementFromPoint(at.x, at.y)?.closest('tr[data-slug]')
    setHot(row ? row.dataset.slug : null)
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
      setSeason(s => (list.includes(s) ? s : list[list.length - 1] || null))
    })
    return () => { live = false }
  }, [playoffs])
  useEffect(() => {
    if (!season) return
    let live = true
    fetchLeaderboard(season, playoffs).then(d => live && setDoc(d || false), () => live && setDoc(false))
    return () => { live = false }
  }, [season, playoffs])

  // A group the season type lacks (Footprint in the playoffs) falls back to the first;
  // a sort or axis the document lacks, to the group's own.
  const g = doc ? doc.groups.find(x => x.id === group) || doc.groups[0] : null
  const has = l => doc && doc.labels.includes(l)
  const sortLabel = has(sort.label) ? sort.label : g && g.stats[0]
  const pair = g && (AXES[g.id] || g.stats).filter(has)
  const x = has(axes.x) ? axes.x : pair && pair[0]
  const y = has(axes.y) ? axes.y : pair && pair[1]
  const choose = id => {
    const next = doc.groups.find(gr => gr.id === id)
    setGroup(id)
    setSort({ label: next.stats[0], reverse: false })
    const [ax, ay] = (AXES[id] || next.stats).filter(has)
    setAxes({ x: ax, y: ay })
  }
  const onSort = useCallback(l => setSort(s => ({ label: l, reverse: s.label === l ? !s.reverse : false })), [])
  // A new season, group or sort starts the table at its top-left corner.
  const gid = g ? g.id : null
  useEffect(() => { if (wrap.current) wrap.current.scrollTo({ top: 0, left: 0 }) }, [season, playoffs, gid, sortLabel, sort.reverse])

  const q = fold(find.trim())
  // Kept between renders so lighting a dot doesn't redraw the table (LeaderTable is memo).
  const { rank, rows, shown } = useMemo(() => {
    if (!doc) return { rank: new Map(), rows: [], shown: new Set() }
    const best = ranked(doc, doc.players, sortLabel)
    const keep = p => (!team || p.team === team || (p.teams || []).includes(team)) && (!q || fold(p.name).includes(q))
    const list = (sort.reverse ? ranked(doc, doc.players, sortLabel, true) : best).filter(keep)
    return {
      rank: new Map(best.map((p, i) => [p.slug, valueOf(doc, p, sortLabel) === null ? null : i + 1])),
      rows: list,
      shown: new Set(list.map(p => p.slug))
    }
  }, [doc, sortLabel, sort.reverse, team, q])
  const teams = doc ? [...new Set(doc.players.flatMap(p => p.teams || [p.team]))].filter(t => !/TM$/.test(t)).sort() : []
  const player = doc && picked ? doc.players.find(p => p.slug === picked) : null
  const seasonLabel = season ? season.replace('-', '–') : ''

  return (
    <main className="lb" style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${RULE}` }}>
        <Link to="/" style={{ ...label, fontSize: 10, color: '#a8a29c' }}>← All players</Link>
        <span style={{ ...label, fontSize: 10, color: INK, fontWeight: 700, border: `1px solid ${EDGE}`, padding: '5px 9px' }}>Leaderboard</span>
        <span style={{ marginLeft: 'auto' }}><SeasonToggle /></span>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', flexWrap: 'wrap' }}>
        {seasons && season && <SeasonPicker single seasons={seasons} from={season} to={season} n={1} pick={s => setSeason(s)} />}
        {doc && <Teams teams={teams} team={team} set={setTeam} />}
        {doc && <Groups groups={doc.groups} active={g.id} pick={choose} />}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', border: `1px solid ${EDGE}` }}>
            <span aria-hidden="true" style={{ ...label, color: FAINT }}>Find</span>
            <input value={find} onChange={e => setFind(e.target.value)} aria-label="Find a player" spellCheck={false}
              style={{ width: 120, background: 'transparent', border: 0, outline: 'none', color: INK, fontFamily: MONO, fontSize: 11, caretColor: 'var(--accent)' }} />
          </label>
          {doc && <span style={label}><span style={{ color: INK, fontWeight: 700 }}>{rows.length}</span> players</span>}
        </span>
      </div>

      {doc === false && <div style={{ ...label, padding: 40, border: `1px dashed ${EDGE}`, textAlign: 'center' }}>Unavailable</div>}
      {doc && (
        <div className="lb-body">
          <div ref={wrap} className="lb-table-wrap" onPointerMove={track} onPointerLeave={leave} onScroll={under}>
            <LeaderTable doc={doc} group={g} rows={rows} rank={rank} sortLabel={sortLabel} reverse={sort.reverse} onSort={onSort}
              picked={picked} onPick={setPicked} />
            {!rows.length && <div style={{ ...label, padding: 28, textAlign: 'center' }}>No players match</div>}
          </div>
          <div className={`lb-side${player ? ' lb-carded' : ''}`}>
            {player
              ? <PlayerCard key={`${player.slug}|${doc.season}|${doc.type}`} doc={doc} player={player} rank={rank.get(player.slug)} sortLabel={sortLabel} onClose={close} />
              : <LeaderScatter doc={doc} shown={shown} hot={hot} x={x} y={y} setAxis={(k, v) => setAxes(a => ({ ...a, [k]: v }))} onPick={setPicked} seasonLabel={seasonLabel} />}
          </div>
        </div>
      )}
    </main>
  )
}
