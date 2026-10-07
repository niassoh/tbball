import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPlayers, headshotUrl, loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { searchPlayers, searchTeams } from '../lib/search.js'
import { bestFit, depthSlot } from '../lib/depth.js'
import TeamInitials from './TeamInitials.jsx'

const MAX = 8
const MAX_TEAMS = 3
// Same charcoal the portraits sit on elsewhere (search page thumbnails).
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const lastName = name => name.split(' ').slice(1).join(' ') || name

function Thumb({ player }) {
  const [failed, setFailed] = useState(false)
  return (
    <span style={{ width: 26, height: 26, flex: 'none', overflow: 'hidden', background: PORTRAIT_BG, display: 'flex' }}>
      {player.headshot && !failed
        ? <img src={headshotUrl(player.slug, 100, player.headshotVersion, player.headshot)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%' }} />
        : <TeamInitials name={player.name} team={player.team} fontSize={9} />}
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
    <div style={{ position: 'relative', width: 'min(260px, 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #544f4b', background: '#262422' }}>
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
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#ece8e3', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', padding: '6px 8px' }}
        />
        <span style={{ fontFamily: MONO, fontSize: 9, color: '#6b655f', border: '1px solid #3d3a37', padding: '0 4px', marginRight: 6 }}>/</span>
      </div>
      {open && results.length > 0 && (
        <div role="listbox" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', width: '100%', zIndex: 20, background: '#1f1d1c', border: '1px solid #6b655f', borderTop: '2px solid #ece8e3', boxShadow: '0 10px 28px rgba(0,0,0,.5)' }}>
          {results.map((r, i) => (
            <button
              key={r.key}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); go(r) }}
              onMouseEnter={() => setActive(i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', border: 'none', borderBottom: i < results.length - 1 ? `1px solid ${r.team && !(results[i + 1] && results[i + 1].team) ? '#6b655f' : '#3d3a37'}` : 'none', background: i === active ? '#2f2c2a' : 'transparent', color: '#ece8e3', textAlign: 'left', cursor: 'pointer' }}
            >
              {r.team ? (
                <>
                  <span style={{ width: 26, height: 26, flex: 'none', background: PORTRAIT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={`/logos/color/${r.team.team}.png`} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.team.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.06em', color: '#8a847e', whiteSpace: 'nowrap' }}>{r.current ? 'CURRENT' : `→ ${lastName(r.fit.player.name).toUpperCase()}`}</span>
                </>
              ) : (
                <>
                  <Thumb player={r.player} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: i === active ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.player.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.06em', color: '#8a847e' }}>{r.player.team}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
