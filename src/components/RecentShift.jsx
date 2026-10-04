import { useState } from 'react'
import { MONO, fmt } from '../lib/format.js'
import { BETTER, MODES, WORSE, rgb, shotModel } from '../lib/shot.js'
import { BASKET, COURT_H, INSIDE_THREE, THREE_LINE } from '../lib/court.js'

const legendSwatch = (color, label, round = false, hollow = false) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 7, height: 7, background: hollow ? 'transparent' : color, border: hollow ? `1.5px solid ${color}` : 'none', borderRadius: round ? '50%' : 0 }} />
    {label}
  </span>
)
const subhead = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e' }

function ShotMap({ shotShift }) {
  const [mode, setMode] = useState('value')
  const zones = shotModel(shotShift, mode)
  return (
    <>
      <div style={{ padding: '10px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={subhead}>SHOT PROFILE</span>
        <div style={{ display: 'flex', border: '1px solid #544f4b' }}>
          {Object.entries(MODES).map(([id, m]) => {
            const on = id === mode
            return (
              <button key={id} onClick={() => setMode(id)} style={{ background: on ? '#ece8e3' : 'transparent', color: on ? '#1f1d1c' : '#a8a29c', border: 'none', padding: '3px 7px', fontFamily: MONO, fontSize: 9, letterSpacing: '.06em', fontWeight: on ? 700 : 400, cursor: 'pointer' }}>{m.label}</button>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 14px 12px', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 500 ${COURT_H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <rect x="0" y="0" width="500" height={COURT_H} fill="#262422" />
            <defs>
              <clipPath id="courtClip"><rect x="1" y="1" width="498" height={COURT_H - 2} /></clipPath>
              <clipPath id="insideThree"><path d={INSIDE_THREE} /></clipPath>
            </defs>
            <g clipPath="url(#courtClip)">
              {zones.map(z => <path key={z.id} d={z.d} fill={z.fill} fillRule="evenodd" clipPath={z.clip ? 'url(#insideThree)' : undefined} />)}
            </g>
            {/* Court markings over the bands, light and thin so they read the same on every color. */}
            <g fill="none" stroke="rgba(236,232,227,.3)" strokeWidth="1.5">
              <rect x="1" y="1" width="498" height={COURT_H - 2} />
              <rect x="170" y="1" width="160" height="189" />
              <path d={THREE_LINE} />
              <line x1="220" y1="40" x2="280" y2="40" />
              <circle cx={BASKET.x} cy={BASKET.y} r="7.5" />
            </g>
          </svg>
          {zones.map(z => (
            <div key={z.id} style={{ position: 'absolute', left: `${z.lx / 5}%`, top: `${(z.ly / COURT_H) * 100}%`, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '3px 6px 4px', background: 'rgba(31,29,28,.72)', fontFamily: MONO, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ece8e3', lineHeight: 1, opacity: z.small ? 0.7 : 1 }}>{z.label}</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.08em', color: '#d6d1cb', lineHeight: 1 }}>{z.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function CoreStats({ profile: p }) {
  const rows = p.recentShift.stats.filter(r => p.stats[r.stat])
  return (
    <>
      <div style={{ padding: '10px 0 0', borderTop: '1px solid #544f4b', margin: '0 14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '4px 8px' }}>
        <span style={{ display: 'flex', gap: 10, fontFamily: MONO, fontSize: 9, color: '#8a847e', whiteSpace: 'nowrap' }}>
          {legendSwatch('#8a847e', 'SEASON', true, true)}
          {legendSwatch('#ece8e3', 'RECENT', true)}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '4px 14px 12px', gap: 2 }}>
        {rows.map(r => {
          const stat = p.stats[r.stat]
          const p0 = r.season.pctl
          const p1 = r.recent.pctl
          const neutral = Math.abs(p1 - p0) < 3
          const good = r.delta > 0 !== stat.lowerBetter
          const color = neutral ? '#8a847e' : good ? rgb(BETTER) : '#93a398'
          const bg = neutral ? '#6b655f' : rgb(good ? BETTER : WORSE)
          const lo = Math.min(p0, p1)
          const hi = Math.max(p0, p1)
          return (
            <div key={r.stat} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) 54px', gap: 10, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #3d3a37' }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.stat}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#8a847e', whiteSpace: 'nowrap' }}>{fmt(stat, r.season.value)} → {fmt(stat, r.recent.value)}</span>
              </div>
              <div style={{ position: 'relative', height: 18 }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 2, background: '#3d3a37' }} />
                <div style={{ position: 'absolute', left: '50%', top: 4, width: 1, height: 10, background: '#6b655f' }} />
                <div style={{ position: 'absolute', left: lo + '%', width: hi - lo + '%', top: 7, height: 4, background: bg, opacity: 0.85 }} />
                <div style={{ position: 'absolute', left: p0 + '%', top: 4, width: 8, height: 8, marginLeft: -5, border: '1.5px solid #8a847e', borderRadius: '50%', background: '#2c2a28', boxSizing: 'border-box' }} />
                <div style={{ position: 'absolute', left: p1 + '%', top: 4, width: 10, height: 10, marginLeft: -5, borderRadius: '50%', background: '#ece8e3', border: '2px solid ' + (neutral ? '#8a847e' : bg), boxSizing: 'border-box' }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, textAlign: 'right', color, whiteSpace: 'nowrap' }}>{(r.delta >= 0 ? '+' : '−') + Math.abs(r.delta).toFixed(stat.dec || 1)}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

// The shared 30-day window, counted in this player's games when known.
const windowLabel = games =>
  games === null ? 'THE LAST 30 DAYS' : `LAST ${games} GAME${games === 1 ? '' : 'S'}`

export default function RecentShift({ profile: p }) {
  const games = p.gameLog && p.gameLog.recent ? p.gameLog.recent.games : null
  return (
    <div style={{ border: '1px solid #544f4b', background: '#2c2a28', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '12px 0 8px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '2px 8px', borderBottom: '1px solid #544f4b', margin: '0 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Last 30 Days</span>
          <span style={{ ...subhead, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
            DIFFERENCE BETWEEN {windowLabel(games)} AND REST OF SEASON
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px 10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', fontFamily: MONO, fontSize: 9, color: '#a8a29c' }}>
          {legendSwatch(rgb(BETTER), 'BETTER')}
          {legendSwatch(rgb(WORSE), 'WORSE')}
        </div>
      </div>
      {games === 0 ? (
        <span style={{ ...subhead, padding: '12px 14px' }}>NO GAMES IN THE RECENT WINDOW</span>
      ) : (
        <>
          {p.shotShift ? <ShotMap shotShift={p.shotShift} /> : <span style={{ ...subhead, padding: '12px 14px' }}>NO SHOT DATA THIS SEASON</span>}
          {p.recentShift && <CoreStats profile={p} />}
        </>
      )}
    </div>
  )
}
