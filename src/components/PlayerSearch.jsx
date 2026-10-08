import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPlayers, headshotUrl, loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { matchParts, searchPlayers, searchTeams } from '../lib/search.js'
import { TEAM_COLORS } from '../lib/teams.js'
import { bestFit, depthSlot } from '../lib/depth.js'
import TeamInitials from './TeamInitials.jsx'

const MAX = 8
const MAX_TEAMS = 3
const INK = '#ece8e3'
const PAPER = '#1f1d1c'
// Same charcoal the portraits sit on elsewhere (search page thumbnails).
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const lastName = name => name.split(' ').slice(1).join(' ') || name
const teamTone = team => {
  const c = TEAM_COLORS[team]
  return c === '#000000' ? '#c4ced4' : c || '#6b655f'
}
const small = { fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em' }

// A round headshot ringed in the player's team colour, like the lineup tiles.
function Thumb({ player }) {
  const [failed, setFailed] = useState(false)
  return (
    <span style={{ width: 26, height: 26, flex: 'none', overflow: 'hidden', borderRadius: '50%', border: `1.5px solid color-mix(in srgb, ${teamTone(player.team)} 55%, #544f4b)`, background: PORTRAIT_BG, display: 'flex' }}>
      {player.headshot && !failed
        ? <img src={headshotUrl(player.slug, 100, player.headshotVersion, player.headshot)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }} />
        : <TeamInitials name={player.name} team={player.team} fontSize={9} />}
    </span>
  )
}

// The typed text picked out of a name: bright and heavy, the rest quieter.
function Name({ text, query, on }) {
  const [before, match, after] = matchParts(text, query)
  return (
    <span style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: on ? '#4a4643' : '#a8a29c', fontWeight: 500 }}>
      {before}<span style={{ color: on ? PAPER : INK, fontWeight: 800 }}>{match}</span>{after}
    </span>
  )
}

// The team code with a square of its colour.
function Code({ team, on }) {
  return (
    <span style={{ ...small, display: 'inline-flex', alignItems: 'center', gap: 5, color: on ? PAPER : '#8a847e', flex: 'none' }}>
      <span style={{ width: 7, height: 7, background: teamTone(team), outline: `1px solid ${on ? '#a8a29c' : '#544f4b'}` }} />{team}
    </span>
  )
}

// Compact search for the profile's top bar: players, and teams, which open the player in
// the viewed player's depth slot there, like the team switcher (from Jokic, the
// starting C, "lakers" opens the Lakers' starting C). "/" focuses it from anywhere.
export default function PlayerSearch({ profile }) {
  const [players, setPlayers] = useState(null)
  const [teams, setTeams] = useState(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = e => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The index and team list are fetched on first focus, not on every profile load.
  const load = () => {
    if (!players) fetchPlayers().then(list => setPlayers(list || []))
    if (!teams) loadTeams().then(setTeams).catch(() => {})
  }
  const slot = (profile && depthSlot(profile.depth, profile.slug)) || { pos: (profile && profile.bio.position) || 'PG', index: 0 }
  const teamRows = teams ? searchTeams(teams, query, MAX_TEAMS).map(t => {
    const current = profile && t.team === profile.team
    return { key: `team-${t.team}`, team: t, current, fit: current ? null : bestFit(slot, t.depth) }
  }).filter(r => r.current || r.fit) : []
  const playerRows = players ? searchPlayers(players, query, MAX - teamRows.length).map(p => ({ key: p.slug, player: p })) : []
  const results = [...teamRows, ...playerRows]
  const showing = open && results.length > 0
  const go = r => {
    setQuery('')
    setOpen(false)
    input.current?.blur()
    const slug = r.player ? r.player.slug : r.fit && r.fit.player.slug
    if (slug) navigate(`/player/${slug}`)
  }
  const onKeyDown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && results[active]) go(results[active])
    else if (e.key === 'Escape') { setOpen(false); input.current?.blur() }
  }

  return (
    <div style={{ position: 'relative', width: 'min(300px, 100%)' }}>
      <div className="search-box" style={{ display: 'flex', alignItems: 'center', gap: 2, border: `1px solid ${showing ? INK : '#8a847e'}`, background: '#2c2a28', paddingLeft: 9 }}>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" style={{ flex: 'none' }}>
          <circle cx="5" cy="5" r="3.75" fill="none" stroke="#b8b2ab" strokeWidth="1.5" />
          <line x1="7.8" y1="7.8" x2="11" y2="11" stroke="#b8b2ab" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
        <input
          ref={input}
          value={query}
          onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true) }}
          onFocus={() => { load(); setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="SEARCH PLAYERS OR TEAMS"
          aria-label="Search players or teams"
          className="player-search"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#ece8e3', fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', padding: '8px 8px' }}
        />
        <span title="Press / to search" style={{ fontFamily: MONO, fontSize: 10, color: '#b8b2ab', border: '1px solid #6b655f', padding: '0 5px', marginRight: 7 }}>/</span>
      </div>
      {showing && (
        // Hangs off the field as one block: white frame, a section label over teams and
        // players, numbered rows with the typed text picked out, the active row inverted,
        // and the keys along the bottom.
        <div role="listbox" style={{ position: 'absolute', right: 0, top: '100%', marginTop: -1, width: '100%', zIndex: 20, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 14px 32px rgba(0,0,0,.55)' }}>
          {[['TEAMS', teamRows], ['PLAYERS', playerRows]].filter(([, rows]) => rows.length).map(([title, rows]) => (
            <div key={title}>
              <div style={{ ...small, display: 'flex', justifyContent: 'space-between', color: '#8a847e', padding: '6px 10px 5px', borderBottom: '1px solid #3d3a37', background: '#1a1918' }}>
                <span>{title}</span><span>{rows.length}</span>
              </div>
              {rows.map(r => {
                const i = results.indexOf(r)
                const on = i === active
                return (
                  <button
                    key={r.key}
                    role="option"
                    aria-selected={on}
                    onMouseDown={e => { e.preventDefault(); go(r) }}
                    onMouseEnter={() => setActive(i)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px', border: 'none', borderBottom: '1px solid #2f2c2a', background: on ? INK : 'transparent', color: on ? PAPER : INK, textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span style={{ ...small, width: 14, color: on ? '#6b655f' : '#544f4b', flex: 'none' }}>{String(i + 1).padStart(2, '0')}</span>
                    {r.team ? (
                      <>
                        <span style={{ width: 26, height: 26, flex: 'none', borderRadius: '50%', border: `1.5px solid color-mix(in srgb, ${teamTone(r.team.team)} 55%, #544f4b)`, background: PORTRAIT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={`/logos/color/${r.team.team}.png`} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.team.name}</span>
                          <span style={{ ...small, fontSize: 8, color: on ? '#6b655f' : '#8a847e' }}>{r.current ? 'CURRENT TEAM' : `OPENS ${lastName(r.fit.player.name).toUpperCase()}`}</span>
                        </span>
                        <Code team={r.team.team} on={on} />
                      </>
                    ) : (
                      <>
                        <Thumb player={r.player} />
                        <Name text={r.player.name} query={query} on={on} />
                        {r.player.team && <Code team={r.player.team} on={on} />}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
          <div style={{ ...small, fontSize: 8, display: 'flex', gap: 12, color: '#6b655f', padding: '6px 10px' }}>
            <span>↑↓ MOVE</span><span>↵ OPEN</span><span>ESC CLOSE</span>
          </div>
        </div>
      )}
    </div>
  )
}
