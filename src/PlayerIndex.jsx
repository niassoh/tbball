import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPlayers, headshotUrl } from './api.js'
import { MONO } from './lib/format.js'
import TeamInitials from './components/TeamInitials.jsx'

const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const span = p => (p.seasons[0] === p.seasons[1] ? p.seasons[0] : `${p.seasons[0]} – ${p.seasons[1]}`)
const bpm = p => (p.recentBpm === null ? '' : `BPM ${p.recentBpm > 0 ? '+' : ''}${p.recentBpm.toFixed(1).replace('-', '−')}`)

// Portraits are transparent cutouts; behind them sits the charcoal (with a soft
// vignette) the portraits used to be drawn on.
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'

function Avatar({ player, size }) {
  const [failed, setFailed] = useState(false)
  const showImage = player.headshot && !failed
  return (
    <div style={{ width: size, height: size, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: showImage ? PORTRAIT_BG : '#34312e', boxShadow: '0 0 0 1px #544f4b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {showImage ? (
        <img src={headshotUrl(player.slug, 100, player.headshotVersion)} alt="" loading="lazy" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%' }} />
      ) : (
        <TeamInitials name={player.name} team={player.team} fontSize={size * 0.36} />
      )}
    </div>
  )
}

export default function PlayerIndex() {
  const [players, setPlayers] = useState(null)
  const [query, setQuery] = useState('')
  useEffect(() => { fetchPlayers().then(list => setPlayers(list || [])) }, [])

  const q = fold(query.trim())
  const matches = (players || []).filter(p => !q || fold(p.name).includes(q) || fold(p.team || '') === q)
  const featured = matches.filter(p => p.headshot)
  const rest = matches.filter(p => !p.headshot)

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: '2px solid #ece8e3', paddingBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>Player Profiles</h1>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#8a847e', letterSpacing: '.06em' }}>
          {players ? `${matches.length.toLocaleString()} OF ${players.length.toLocaleString()} PLAYERS` : 'LOADING…'}
        </span>
      </div>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name or team (e.g. Jokic, DEN)"
        style={{ width: '100%', margin: '16px 0 20px', padding: '10px 12px', background: '#2c2a28', border: '1px solid #544f4b', color: '#ece8e3', fontFamily: MONO, fontSize: 14, outline: 'none' }}
      />

      {featured.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {featured.map(p => (
              <Link key={p.slug} to={`/player/${p.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: '#2c2a28', border: '1px solid #544f4b', color: '#ece8e3' }}>
                <Avatar player={p} size={56} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#a8a29c' }}>{p.team} · {span(p)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#8fb0e6' }}>{bpm(p)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: '#8a847e', marginBottom: 6 }}>{featured.length ? 'ALL OTHER PLAYERS' : 'PLAYERS'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', columnGap: 24 }}>
            {rest.map(p => (
              <Link key={p.slug} to={`/player/${p.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px', borderBottom: '1px solid #3d3a37', color: '#ece8e3' }}>
                <Avatar player={p} size={26} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#8a847e', whiteSpace: 'nowrap' }}>{p.team} · {p.seasons[1].slice(0, 4)}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#a8a29c', whiteSpace: 'nowrap', minWidth: 58, textAlign: 'right' }}>{bpm(p)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {players && matches.length === 0 && <p style={{ fontFamily: MONO, fontSize: 12, color: '#8a847e' }}>No players match “{query}”.</p>}
    </main>
  )
}
