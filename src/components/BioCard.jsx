import { useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'

const card = { border: '1px solid #544f4b', background: '#2c2a28', display: 'flex', flexDirection: 'column', minWidth: 0 }
const logGrid = { display: 'grid', gridTemplateColumns: '28px 58px 12px repeat(3,minmax(0,1fr)) 30px', columnGap: 3, fontFamily: MONO }
const INJURY = { OUT: '#fa962a', DTD: '#e6c27a' }

const lastName = name => name.split(' ').slice(1).join(' ') || name
const shortDate = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
const rankColor = r => (r === null ? '#8a847e' : r <= 10 ? '#e6c27a' : r <= 20 ? '#d6d1cb' : '#8a847e')
const tsColor = ts => (ts === null ? '#ece8e3' : ts >= 60 ? '#8fb0e6' : ts < 52 ? '#fa962a' : '#ece8e3')

function Headshot({ slug, name }) {
  const [failed, setFailed] = useState(false)
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')
  return (
    <div style={{ width: 92, height: 92, margin: '-46px auto 0', position: 'relative', borderRadius: '50%', overflow: 'hidden', background: '#000', boxShadow: '0 0 0 3px #2c2a28,0 0 0 4px #6b655f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {failed ? (
        <span style={{ fontSize: 28, fontWeight: 800, color: '#6b655f' }}>{initials}</span>
      ) : (
        <img src={headshotUrl(slug)} alt={name} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%', display: 'block' }} />
      )}
    </div>
  )
}

export default function BioCard({ profile: p }) {
  const bio1 = [p.team, p.bio.position, p.bio.height].filter(Boolean).join(' · ')
  const bio2 = p.bio.age !== null ? `AGE ${p.bio.age.toFixed(1)}` : ''
  const games = (p.gameLog && p.gameLog.games) || []

  return (
    <div style={card}>
      <div style={{ position: 'relative', height: 72, background: '#1f1d1c', borderBottom: '1px solid #544f4b', overflow: 'hidden' }}>
        <img src="/banner-bokeh.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55, display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(31,29,28,.15) 0%,rgba(44,42,40,.85) 100%)' }} />
      </div>
      <Headshot slug={p.slug} name={p.name} />
      <div style={{ padding: '10px 14px 12px', margin: '0 14px', borderBottom: '2px solid #ece8e3', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1, fontWeight: 600, letterSpacing: '-.005em', textWrap: 'balance' }}>{p.name}</h1>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#a8a29c', lineHeight: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{bio1}</span>
          <span style={{ whiteSpace: 'nowrap' }}>{bio2}</span>
        </div>
      </div>

      {games.length > 0 && (
        <div style={{ padding: '12px 14px 4px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '2px 8px', paddingBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', whiteSpace: 'nowrap' }}>LAST 5 GAMES</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#8a847e', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{ color: '#e6c27a' }}>TOP-10</span><span style={{ color: '#d6d1cb' }}>MID</span><span>BOTTOM-10</span>
            </span>
          </div>
          <div style={{ ...logGrid, fontSize: 9, letterSpacing: '.06em', color: '#8a847e', borderBottom: '1px solid #6b655f', padding: '4px 2px' }}>
            <span>DATE</span><span>OPP</span><span /><span style={{ textAlign: 'right' }}>PTS</span><span style={{ textAlign: 'right' }}>REB</span><span style={{ textAlign: 'right' }}>AST</span><span style={{ textAlign: 'right' }}>TS%</span>
          </div>
          {games.map(g => (
            <div key={g.gameId} style={{ ...logGrid, fontSize: 10.5, padding: '5px 2px', borderBottom: '1px solid #3d3a37', alignItems: 'center' }}>
              <span style={{ color: '#a8a29c' }}>{shortDate(g.date)}</span>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: rankColor(g.oppRank) }}>{g.home ? g.opp : '@' + g.opp}</span>
              <span style={{ fontWeight: 600, color: g.result === 'W' ? '#97c197' : '#fa962a' }}>{g.result}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{g.pts}</span>
              <span style={{ textAlign: 'right' }}>{g.reb}</span>
              <span style={{ textAlign: 'right' }}>{g.ast}</span>
              <span style={{ textAlign: 'right', color: tsColor(g.ts) }}>{g.ts === null ? '—' : g.ts.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {p.depth && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #544f4b', paddingBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em' }}>{(p.teamName || p.team).toUpperCase()}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>DEPTH</span>
              {Object.entries(INJURY).map(([k, c]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, background: c }} />{k}</span>
              ))}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: '0 3px' }}>
            {p.depth.rows.map(row => (
              <div key={row.pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#a8a29c', textAlign: 'center', paddingBottom: 3 }}>{row.pos}</span>
                {row.players.map((pl, i) => {
                  const me = pl.slug === p.slug
                  return (
                    <span key={pl.espnId} title={pl.name} style={{ fontSize: 10.5, lineHeight: 1.3, fontWeight: me ? 700 : 500, color: me ? '#ece8e3' : pl.status ? '#8a847e' : i > 2 ? '#8a847e' : '#d6d1cb', textAlign: 'center', padding: '3px 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: me ? '2px solid #97c197' : '2px solid transparent', background: me ? 'rgba(151,193,151,.12)' : 'transparent' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {lastName(pl.name)}
                        {pl.status && <span title={pl.status} style={{ width: 5, height: 5, background: INJURY[pl.status], flex: 'none' }} />}
                      </span>
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
