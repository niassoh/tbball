import { useState } from 'react'
import { Link } from 'react-router-dom'
import { headshotUrl } from '../api.js'
import { MONO, ord, signed } from '../lib/format.js'
import TeamInitials from './TeamInitials.jsx'

const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#6b655f'
const BLUE = '#8fb0e6'
const ORANGE = '#fa962a'
const RULE = '1px solid #3d3a37'
const EDGE = '1px solid #544f4b'
const TILE = 40
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: DIM }
const lastName = name => name.split(' ').slice(1).join(' ') || name
const net = v => (v === null || v === undefined ? '—' : signed(v))
// Colour is kept for the verdicts (Δ and a unit's net); everything else is ink and grey.
const verdict = v => (v === null || v === undefined ? FAINT : v >= 0 ? BLUE : ORANGE)
const neutral = v => (v === null || v === undefined ? FAINT : v >= 0 ? INK : '#a8a29c')
const mins = m => m.toLocaleString()

function Mate({ mate }) {
  const name = mate.name ? lastName(mate.name) : '?'
  return mate.slug
    ? <Link to={`/player/${mate.slug}`} className="depth-link" style={{ color: INK, borderBottom: '1px solid transparent' }}>{name}</Link>
    : <span style={{ color: DIM }}>{name}</span>
}

// A square headshot tile with the last name under it. His own tile carries a
// team-colour bar; teammates' tiles link to their pages.
function Tile({ player, team, accent, self }) {
  const [failed, setFailed] = useState(false)
  const name = player.name ? lastName(player.name) : '?'
  const face = player.headshot && !failed
    ? <img src={headshotUrl(player.slug, 100, player.headshotVersion, player.headshot)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%', display: 'block' }} />
    : <TeamInitials name={player.name || '?'} team={team} fontSize={15} />
  const box = (
    <span className="lineup-tile" style={{ position: 'relative', display: 'block', width: TILE, height: TILE, border: EDGE, background: '#34312e', overflow: 'hidden' }}>
      {face}
      {self && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: accent || INK }} />}
    </span>
  )
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, width: TILE, minWidth: 0 }}>
      {player.slug && !self ? <Link to={`/player/${player.slug}`} title={player.name} style={{ display: 'block' }}>{box}</Link> : box}
      <span title={player.name || ''} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '.02em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: self ? 700 : 400, color: self ? INK : DIM }}>
        {player.slug && !self ? <Link to={`/player/${player.slug}`} className="depth-link" style={{ color: 'inherit', borderBottom: '1px solid transparent' }}>{name}</Link> : name}
      </span>
    </span>
  )
}

// One unit he plays in: him and his teammates in it as tiles, then its net and minutes
// (and its share of his minutes when it's his most-used). Without a unit over the
// floor, the same frame shows empty tiles.
function Unit({ title, unit, size, self, team, accent, empty, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, ...style }}>
      <span style={{ ...label, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', gap: 3, flex: 1, minWidth: 0 }}>
          {unit
            ? [self, ...unit.mates].map((pl, i) => <Tile key={i} player={pl} team={team} accent={accent} self={i === 0} />)
            : Array.from({ length: size }, (_, i) => <span key={i} style={{ width: TILE, height: TILE, flex: 'none', border: '1px dashed #3d3a37' }} />)}
        </div>
        <div style={{ height: TILE, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 3, flex: 'none' }}>
          <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1, color: unit ? verdict(unit.net) : FAINT }}>{unit ? net(unit.net) : '—'}</span>
          <span style={{ ...label, fontSize: 8, whiteSpace: 'nowrap' }}>{unit ? `${mins(unit.minutes)} MIN` : empty}</span>
          {unit && unit.share !== undefined && <span style={{ ...label, fontSize: 8, whiteSpace: 'nowrap' }}>{unit.share}% OF HIS</span>}
        </div>
      </div>
    </div>
  )
}

const mateGrid = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px 44px 44px 40px', columnGap: 6, alignItems: 'baseline' }

// The bio card's lineup module. First his most-shared teammates, with the team's net
// with both on (WITH) and with him on and the teammate off (APART); Δ = WITH − APART,
// so the teammates he wins with read blue. Then the units he plays in, as headshot
// tiles: his best five (100+ min; his most-used five when none has the minutes), and
// side by side his best trio (250+ min) and most-used trio. Then his career on/off.
// All net rating per 100 possessions, from the season's five-man lineups.
export default function LineupPanel({ profile: p, accent }) {
  const L = p.lineups

  return (
    <div key={`lineups-${p.slug}`} className="swap-in" style={{ padding: '10px 14px 8px', display: 'flex', flexDirection: 'column', gap: 6, '--team': accent || INK }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...label }}>
        <span>{L ? `${L.season.replace('-', '–')} · ${L.team} · LINEUPS` : 'LINEUPS'}</span>
        <span>NET / 100</span>
      </div>

      {!L ? (
        <span style={{ ...label, color: FAINT, padding: '6px 0', borderTop: RULE, borderBottom: RULE }}>NO LINEUP DATA THIS SEASON</span>
      ) : (
        <>
          <div>
            <div style={{ ...mateGrid, ...label, paddingBottom: 3, borderBottom: EDGE }}>
              <span>TEAMMATES</span>
              <span style={{ textAlign: 'right' }}>SHARED</span>
              <span style={{ textAlign: 'right' }}>WITH</span>
              <span style={{ textAlign: 'right' }}>APART</span>
              <span style={{ textAlign: 'right' }}>Δ</span>
            </div>
            {L.mates.map((m, i) => {
              const d = m.together.net !== null && m.apart.net !== null ? m.together.net - m.apart.net : null
              return (
                <div key={i} style={{ ...mateGrid, fontFamily: MONO, fontSize: 11, padding: '3px 0', borderBottom: RULE }}>
                  <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Mate mate={m} /></span>
                  <span style={{ textAlign: 'right', color: DIM, fontSize: 9.5 }}>{mins(m.together.minutes)}</span>
                  <span style={{ textAlign: 'right', color: neutral(m.together.net) }}>{net(m.together.net)}</span>
                  <span style={{ textAlign: 'right', color: neutral(m.apart.net) }}>{net(m.apart.net)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: verdict(d) }}>{net(d)}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {L.bestFive
              ? <Unit title={`BEST FIVE · ${L.floors.five}+ MIN`} unit={L.bestFive} size={5} self={L.self} team={L.team} accent={accent} style={{ padding: '5px 0', borderBottom: RULE }} />
              : <Unit title="MOST USED FIVE" unit={L.mostUsed} size={5} self={L.self} team={L.team} accent={accent} style={{ padding: '5px 0', borderBottom: RULE }} />}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', borderBottom: RULE }}>
              <Unit title={`BEST TRIO · ${L.floors.trio}+`} unit={L.bestTrio} size={3} self={L.self} team={L.team} accent={accent} empty={`NONE ${L.floors.trio}+`} style={{ padding: '5px 10px 5px 0', borderRight: RULE }} />
              <Unit title="MOST USED TRIO" unit={L.mostUsedTrio} size={3} self={L.self} team={L.team} accent={accent} style={{ padding: '5px 0 5px 10px' }} />
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', ...label }}>
        <span>CAREER ON/OFF</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: p.onOff ? neutral(p.onOff.value) : FAINT }}>
          {p.onOff ? `${signed(p.onOff.value)} · ${ord(p.onOff.pctl).toUpperCase()} PCT` : '—'}
        </span>
      </div>
    </div>
  )
}
