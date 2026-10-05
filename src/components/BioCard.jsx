import { useState } from 'react'
import { Link } from 'react-router-dom'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import TeamInitials from './TeamInitials.jsx'

const card = { border: '1px solid #544f4b', background: '#2c2a28', display: 'flex', flexDirection: 'column', minWidth: 0 }
const logGrid = { display: 'grid', gridTemplateColumns: '28px 58px 12px repeat(3,minmax(0,1fr)) 30px', columnGap: 3, fontFamily: MONO }
const INJURY = { OUT: '#fa962a', DTD: '#e6c27a' }

const lastName = name => name.split(' ').slice(1).join(' ') || name
const shortDate = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
const rankColor = r => (r === null ? '#8a847e' : r <= 10 ? '#e6c27a' : r <= 20 ? '#d6d1cb' : '#8a847e')
const tsColor = ts => (ts === null ? '#ece8e3' : ts >= 60 ? '#8fb0e6' : ts < 52 ? '#fa962a' : '#ece8e3')

const HERO_H = 150
const PORTRAIT = 116
// The portrait (or team-initials block) sits in the banner's bottom-right corner,
// standing on the rule like a thumbnail subject, and fades into the bokeh on its
// left and top edges; portraits share the banner's charcoal, so no edge shows.
const fadeIn = 'linear-gradient(90deg, transparent 0%, #000 42%), linear-gradient(180deg, transparent 0%, #000 34%)'

function Headshot({ slug, version, name, team }) {
  const [failed, setFailed] = useState(false)
  return (
    <div style={{ position: 'absolute', right: 0, bottom: 0, width: PORTRAIT, height: PORTRAIT, WebkitMaskImage: fadeIn, WebkitMaskComposite: 'source-in', maskImage: fadeIn, maskComposite: 'intersect' }}>
      {failed ? (
        <TeamInitials name={name} team={team} fontSize={32} />
      ) : (
        <img src={headshotUrl(slug, 400, version)} alt={name} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%', display: 'block' }} />
      )}
    </div>
  )
}

// First name on one line, the rest below; long surnames get a smaller size so they
// stop short of the portrait (~0.62em per character in this face).
const nameLines = name => {
  const [first, ...rest] = name.split(' ')
  return rest.length ? [first, rest.join(' ')] : [name]
}
const nameSize = lines => Math.min(30, Math.floor(240 / (0.62 * Math.max(...lines.map(l => l.length)))))

export default function BioCard({ profile: p }) {
  const stamp = [p.team, p.bio.position].filter(Boolean).join(' · ')
  const bio = [p.bio.height, p.bio.age !== null ? `AGE ${p.bio.age.toFixed(1)}` : null].filter(Boolean).join(' · ')
  const lines = nameLines(p.name)
  const games = (p.gameLog && p.gameLog.games) || []

  return (
    <div style={card}>
      <div style={{ position: 'relative', height: HERO_H, background: '#1f1d1c', borderBottom: '2px solid #ece8e3', overflow: 'hidden' }}>
        <img src="/banner-bokeh.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55, display: 'block' }} />
        <Headshot slug={p.slug} version={p.headshotVersion} name={p.name} team={p.team} />
        <span style={{ position: 'absolute', left: 14, top: 12, fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: '#8a847e' }}>{stamp}</span>
        <h1 style={{ position: 'absolute', left: 14, bottom: 12, margin: 0, fontSize: nameSize(lines), lineHeight: 1.02, fontWeight: 600, letterSpacing: '-.005em', textShadow: '0 1px 8px rgba(0,0,0,.5)' }}>
          {lines.map(l => <span key={l} style={{ display: 'block', whiteSpace: 'nowrap' }}>{l}</span>)}
        </h1>
      </div>
      {bio && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#a8a29c', padding: '8px 14px 0' }}>{bio}</div>}

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
                  const Name = pl.hasProfile && !me ? Link : 'span'
                  return (
                    <Name key={pl.espnId} {...(Name === Link && { to: `/player/${pl.slug}`, className: 'depth-link' })} title={pl.name} style={{ fontSize: 10.5, lineHeight: 1.3, fontWeight: me ? 700 : 500, color: me ? '#ece8e3' : pl.status ? '#8a847e' : i > 2 ? '#8a847e' : '#d6d1cb', textAlign: 'center', padding: '3px 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: me ? '2px solid #97c197' : '2px solid transparent', background: me ? 'rgba(151,193,151,.12)' : 'transparent' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {lastName(pl.name)}
                        {pl.status && <span title={pl.status} style={{ width: 5, height: 5, background: INJURY[pl.status], flex: 'none' }} />}
                      </span>
                    </Name>
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
