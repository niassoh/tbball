import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPlayers, headshotUrl, loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { matchParts, searchPlayers, searchTeams } from '../lib/search.js'
import { bestFit, depthSlot } from '../lib/depth.js'
import TeamInitials from './TeamInitials.jsx'

const MAX = 8
const MAX_TEAMS = 3
const INK = '#ece8e3'
const PAPER = '#1f1d1c'
const BLUE = '#8fb0e6'
// Same charcoal the portraits sit on elsewhere (search page thumbnails).
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const lastName = name => name.split(' ').slice(1).join(' ') || name

// Results sit back in muted greyscale; the active row's picture comes up to colour.
const muted = on => ({ filter: on ? 'none' : 'grayscale(1) brightness(.6)', transition: 'filter .15s' })

function Thumb({ player, on }) {
  const [failed, setFailed] = useState(false)
  return (
    <span style={{ width: 28, height: 28, flex: 'none', overflow: 'hidden', borderRadius: '50%', background: PORTRAIT_BG, display: 'flex', ...muted(on) }}>
      {player.headshot && !failed
        ? <img src={headshotUrl(player.slug, 100, player.headshotVersion, player.headshot)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }} />
        : <TeamInitials name={player.name} team={player.team} fontSize={9} />}
    </span>
  )
}

// A name in caps: the first name light, the rest heavy, and the typed letters in blue.
function Name({ text, query, on }) {
  const split = text.indexOf(' ') + 1
  const pieces = []
  let at = 0
  for (const [part, hit] of matchParts(text, query).map((part, i) => [part, i === 1])) {
    // Cut each piece where the first name ends, so its weight can change there.
    for (const [a, b] of [[at, Math.min(at + part.length, split)], [Math.max(at, split), at + part.length]]) {
      if (b > a) pieces.push({ text: text.slice(a, b), hit, first: a < split })
    }
    at += part.length
  }
  return (
    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, letterSpacing: '.03em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {pieces.map((p, i) => (
        <span key={i} style={{ fontWeight: p.first ? 400 : 800, color: p.hit ? BLUE : p.first ? '#8a847e' : on ? INK : '#b8b2ab' }}>{p.text}</span>
      ))}
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
        // Hangs off the field as one white-framed block. Type carries it: names in caps,
        // first name light and the rest heavy, the typed letters in blue; pictures stay
        // grey until their row is active. Teams come first, ruled off from the players.
        <div role="listbox" style={{ position: 'absolute', right: 0, top: '100%', marginTop: -1, width: '100%', zIndex: 20, background: PAPER, border: `1px solid ${INK}`, boxShadow: '0 14px 32px rgba(0,0,0,.55)', padding: '4px 0' }}>
          {results.map((r, i) => {
            const on = i === active
            const lastTeam = r.team && !(results[i + 1] && results[i + 1].team) && i < results.length - 1
            return (
              <button
                key={r.key}
                role="option"
                aria-selected={on}
                onMouseDown={e => { e.preventDefault(); go(r) }}
                onMouseEnter={() => setActive(i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', border: 'none', borderBottom: lastTeam ? '1px solid #544f4b' : 'none', marginBottom: lastTeam ? 4 : 0, background: on ? '#2a2826' : 'transparent', color: INK, textAlign: 'left', cursor: 'pointer' }}
              >
                {r.team ? (
                  <>
                    <span style={{ width: 28, height: 28, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', ...muted(on) }}>
                      <img src={`/logos/color/${r.team.team}.png`} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Name text={`the ${r.team.name}`} query={query} on={on} />
                      <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', color: '#6b655f' }}>{r.current ? 'CURRENT TEAM' : `OPENS ${lastName(r.fit.player.name).toUpperCase()}`}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Thumb player={r.player} on={on} />
                    <Name text={r.player.name} query={query} on={on} />
                  </>
                )}
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: on ? INK : '#6b655f', flex: 'none' }}>{r.team ? r.team.team : r.player.team}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
