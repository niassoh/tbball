import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPlayers } from './api.js'
import { MONO } from './lib/format.js'

export default function PlayerIndex() {
  const [players, setPlayers] = useState([])
  const [query, setQuery] = useState('')
  useEffect(() => { fetchPlayers().then(list => setPlayers(list || [])) }, [])

  const q = query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const shown = q ? players.filter(p => p.slug.replace(/-/g, ' ').includes(q)).slice(0, 60) : []

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 16px' }}>Player Profiles</h1>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={`Search ${players.length.toLocaleString()} players`}
        style={{ width: '100%', padding: '10px 12px', background: '#2c2a28', border: '1px solid #544f4b', color: '#ece8e3', fontFamily: MONO, fontSize: 14 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
        {shown.map(p => (
          <Link key={p.slug} to={`/player/${p.slug}`} style={{ padding: '8px 4px', borderBottom: '1px solid #3d3a37', color: '#ece8e3' }}>{p.name}</Link>
        ))}
      </div>
    </main>
  )
}
