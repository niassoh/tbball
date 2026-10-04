import { useState } from 'react'
import { MONO, fmt } from '../lib/format.js'
import { BANDS, BETTER, MODES, WORSE, rgb, shotModel } from '../lib/shot.js'
import { BASKET, COURT_H, INSIDE_THREE, THREE_LINE } from '../lib/court.js'

const legendSwatch = (color, label, round = false, hollow = false) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 7, height: 7, background: hollow ? 'transparent' : color, border: hollow ? `1.5px solid ${color}` : 'none', borderRadius: round ? '50%' : 0 }} />
    {label}
  </span>
)
const subhead = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e' }

const pctLine = c => (c.fga ? `${c.fgm}/${c.fga} · ${((c.fgm / c.fga) * 100).toFixed(1)}%` : '0/0')
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A shot lands like a ball coming down: from just above, a slight overshoot,
// then it settles. Shots ripple outward from the rim, all within ~0.4s.
const SHOT_KEYFRAMES = '@keyframes shotIn { 0% { opacity: 0; transform: translateY(-14px) scale(.5) } 60% { opacity: 1; transform: translateY(1.5px) scale(1.12) } 100% { opacity: 1; transform: none } }'

// ESPN locates shots to the whole foot, so stacked shots are spread within that
// foot (a fixed offset per shot, so they don't move between hovers).
const spread = i => [((i * 37) % 11) - 5, ((i * 53) % 11) - 5]

function Shot({ shot: [x, y, made, recent], offset: [dx, dy], delay, animate }) {
  const motion = animate ? { animation: `shotIn 320ms cubic-bezier(.3,.7,.4,1) ${delay}ms both`, transformBox: 'fill-box', transformOrigin: 'center' } : undefined
  return (
    <g transform={`translate(${BASKET.x + x + dx} ${BASKET.y + Math.max(0, y + dy)})`}>
      <g style={motion}>
        {made
          ? <circle r="4.2" fill={recent ? rgb(BETTER) : 'rgba(151,193,151,.35)'} stroke="#1f1d1c" strokeWidth="1" />
          : <path d="M-3.2 -3.2 L3.2 3.2 M-3.2 3.2 L3.2 -3.2" stroke={recent ? '#ece8e3' : 'rgba(236,232,227,.3)'} strokeWidth="1.6" strokeLinecap="round" />}
      </g>
    </g>
  )
}

function ShotMap({ shotShift, games }) {
  const [mode, setMode] = useState('value')
  const [hover, setHover] = useState(null)
  const zones = shotModel(shotShift, mode)
  const band = zones.find(z => z.id === hover)
  const index = BANDS.findIndex(b => b.id === hover)
  // Rest of season underneath, last N games on top; each set ripples out from the rim.
  const shots = (hover === null ? [] : (shotShift.shots || []).filter(s => s[4] === index))
    .map((s, i) => ({ s, i, r: Math.hypot(s[0], s[1]) }))
    .sort((a, b) => a.s[3] - b.s[3] || a.r - b.r)
  const far = Math.max(1, ...shots.map(x => x.r))
  const animate = !reduceMotion()
  const recentLabel = games === null ? 'LAST 30 DAYS' : `LAST ${games} G`
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
      <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 14px 12px' }}>
        {/* Space stays reserved when idle so the chart doesn't jump on hover. */}
        <div style={{ height: 36, padding: '0 9px', background: band ? '#1f1d1c' : 'transparent', borderTop: band ? `2px solid ${band.small ? '#6b655f' : rgb(band.delta > 0 ? BETTER : WORSE)}` : '2px solid transparent', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, fontFamily: MONO, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {band ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#ece8e3' }}>{band.name} <span style={{ fontWeight: 400, color: '#8a847e', fontSize: 9 }}>{band.range}</span></span>
                <span style={{ fontSize: 11, fontWeight: 700, color: band.small ? '#a8a29c' : rgb(band.delta > 0 ? BETTER : [147, 163, 152]) }}>{band.label} <span style={{ fontWeight: 400, fontSize: 9, color: '#8a847e' }}>{MODES[mode].label}</span></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 9, color: '#a8a29c' }}>
                <span><span style={{ color: '#ece8e3' }}>{recentLabel}</span> {pctLine(band.recent)}  <span style={{ color: '#6b655f' }}>·</span>  REST {pctLine(band.rest)}</span>
                <span style={{ display: 'flex', gap: 8, color: '#8a847e' }}><span><span style={{ color: rgb(BETTER) }}>●</span> MAKE</span><span><span style={{ color: '#ece8e3' }}>×</span> MISS</span></span>
              </div>
            </>
          ) : null}
        </div>
        <svg viewBox={`0 0 500 ${COURT_H}`} onMouseLeave={() => setHover(null)} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <style>{SHOT_KEYFRAMES}</style>
          <rect x="0" y="0" width="500" height={COURT_H} fill="#262422" />
          <defs>
            <clipPath id="courtClip"><rect x="1" y="1" width="498" height={COURT_H - 2} /></clipPath>
            <clipPath id="insideThree"><path d={INSIDE_THREE} /></clipPath>
          </defs>
          <g clipPath="url(#courtClip)">
            {zones.map(z => (
              <path key={z.id} d={z.d} fill={z.fill} fillRule="evenodd" clipPath={z.clip ? 'url(#insideThree)' : undefined}
                onMouseEnter={() => setHover(z.id)} onClick={() => setHover(h => (h === z.id ? null : z.id))}
                style={{ cursor: 'pointer', opacity: hover && hover !== z.id ? 0.3 : 1, transition: 'opacity .15s' }} />
            ))}
          </g>
          {/* Court markings over the bands, light and thin so they read the same on every color. */}
          <g fill="none" stroke="rgba(236,232,227,.3)" strokeWidth="1.5" pointerEvents="none">
            <rect x="1" y="1" width="498" height={COURT_H - 2} />
            <rect x="170" y="1" width="160" height="189" />
            <path d={THREE_LINE} />
            <line x1="220" y1="40" x2="280" y2="40" />
            <circle cx={BASKET.x} cy={BASKET.y} r="7.5" />
          </g>
          {hover === null && zones.map(z => (
            <g key={`label-${z.id}`} pointerEvents="none">
              <rect x={z.lx - 27} y={z.ly - 13} width="54" height="26" fill="rgba(31,29,28,.72)" />
              <text x={z.lx} y={z.ly} textAnchor="middle" dominantBaseline="central" fontFamily={MONO} fontSize="17" fontWeight="700" fill="#ece8e3" opacity={z.small ? 0.7 : 1}>{z.label}</text>
            </g>
          ))}
          <g key={hover} clipPath="url(#courtClip)" pointerEvents="none">
            {shots.map(({ s, i, r }) => <Shot key={i} shot={s} offset={spread(i)} animate={animate} delay={Math.round((r / far) * 240 + (s[3] ? 80 : 0))} />)}
          </g>
        </svg>
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
          {p.shotShift ? <ShotMap shotShift={p.shotShift} games={games} /> : <span style={{ ...subhead, padding: '12px 14px' }}>NO SHOT DATA THIS SEASON</span>}
          {p.recentShift && <CoreStats profile={p} />}
        </>
      )}
    </div>
  )
}
