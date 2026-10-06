import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPlayers, headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import TeamInitials from './TeamInitials.jsx'

const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const MAX = 8
// Same charcoal the portraits sit on elsewhere (search page thumbnails).
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'

// Players whose first or last name starts with the query lead; otherwise the index's
// own order (portraits first, then value), so the best-known players come first.
const search = (players, q) => {
  const query = fold(q.trim())
  if (!query) return []
  const hits = players.filter(p => fold(p.name).includes(query))
  const starts = p => fold(p.name).split(' ').some(w => w.startsWith(query))
  return [...hits.filter(starts), ...hits.filter(p => !starts(p))].slice(0, MAX)
}

function Thumb({ player }) {
  const [failed, setFailed] = useState(false)
  return (
    <span style={{ width: 26, height: 26, flex: 'none', overflow: 'hidden', background: PORTRAIT_BG, display: 'flex' }}>
      {player.headshot && !failed
        ? <img src={headshotUrl(player.slug, 100, player.headshotVersion)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%' }} />
        : <TeamInitials name={player.name} team={player.team} fontSize={9} />}
    </span>
  )
}

// Compact player search for the profile's top bar. "/" focuses it from anywhere.
export default function PlayerSearch() {
  const [players, setPlayers] = useState(null)
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

  // The index is fetched on first focus, not on every profile load.
  const load = () => { if (!players) fetchPlayers().then(list => setPlayers(list || [])) }
  const results = players ? search(players, query) : []
  const go = p => {
    setQuery('')
    setOpen(false)
    input.current?.blur()
    navigate(`/player/${p.slug}`)
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
          placeholder="SEARCH PLAYERS"
          aria-label="Search players"
          className="player-search"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#ece8e3', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', padding: '6px 8px' }}
        />
        <span style={{ fontFamily: MONO, fontSize: 9, color: '#6b655f', border: '1px solid #3d3a37', padding: '0 4px', marginRight: 6 }}>/</span>
      </div>
      {open && results.length > 0 && (
        <div role="listbox" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', width: '100%', zIndex: 20, background: '#1f1d1c', border: '1px solid #6b655f', borderTop: '2px solid #ece8e3', boxShadow: '0 10px 28px rgba(0,0,0,.5)' }}>
          {results.map((p, i) => (
            <button
              key={p.slug}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); go(p) }}
              onMouseEnter={() => setActive(i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', border: 'none', borderBottom: i < results.length - 1 ? '1px solid #3d3a37' : 'none', background: i === active ? '#2f2c2a' : 'transparent', color: '#ece8e3', textAlign: 'left', cursor: 'pointer' }}
            >
              <Thumb player={p} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: i === active ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.06em', color: '#8a847e' }}>{p.team}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
