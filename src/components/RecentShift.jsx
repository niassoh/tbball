import { useState } from 'react'
import { MONO, fmt } from '../lib/format.js'
import { BANDS, BETTER, MODES, mix, rgb, shotModel } from '../lib/shot.js'
import { BAND_EDGES, BASKET, COURT_H, INSIDE_THREE, THREE_LINE } from '../lib/court.js'

const legendSwatch = (color, label, round = false, hollow = false) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 7, height: 7, background: hollow ? 'transparent' : color, border: hollow ? `1.5px solid ${color}` : 'none', borderRadius: round ? '50%' : 0 }} />
    {label}
  </span>
)
const subhead = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e' }

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A shot lands like a ball coming down: from just above, a slight overshoot,
// then it settles. Shots ripple outward from the rim, all within ~0.4s.
const SHOT_KEYFRAMES = '@keyframes shotIn { 0% { opacity: 0; transform: translateY(-14px) scale(.5) } 60% { opacity: 1; transform: translateY(1.5px) scale(1.12) } 100% { opacity: 1; transform: none } }'

// ESPN locates shots to the whole foot, so stacked shots are spread within that
// foot (a fixed offset per shot, so they don't move between hovers).
const spread = i => [((i * 37) % 11) - 5, ((i * 53) % 11) - 5]

// On a hovered (darkened) zone: makes blue, misses orange. Dots are see-through
// so overlapping shots build up and show density. Hover shows the last N games;
// clicking switches to the rest of the season (fainter, as it has more shots).
const MAKE = '#6f9be8'
const MISS = '#fa962a'

function Shot({ shot: [x, y, made, recent], offset: [dx, dy], delay, animate }) {
  const motion = animate ? { animation: `shotIn 320ms cubic-bezier(.3,.7,.4,1) ${delay}ms both`, transformBox: 'fill-box', transformOrigin: 'center' } : undefined
  return (
    <g transform={`translate(${BASKET.x + x + dx} ${BASKET.y + Math.max(0, y + dy)})`}>
      <g style={motion}>
        <circle r="4.2" fill={made ? MAKE : MISS} fillOpacity={recent ? 0.45 : 0.15} />
      </g>
    </g>
  )
}

function ShotMap({ shotShift, divided }) {
  const [mode, setMode] = useState('value')
  const [hover, setHover] = useState(null)
  const [season, setSeason] = useState(false)
  const zones = shotModel(shotShift, mode)
  const band = zones.find(z => z.id === hover)
  const index = BANDS.findIndex(b => b.id === hover)
  // One set at a time, rippling out from the rim. Numbered before the set filter so
  // the two sets never share keys and a switch animates the new set in.
  const shots = (hover === null ? [] : (shotShift.shots || []).filter(s => s[4] === index))
    .map((s, i) => ({ s, i, r: Math.hypot(s[0], s[1]) }))
    .filter(x => !x.s[3] === season)
    .sort((a, b) => a.r - b.r)
  const far = Math.max(1, ...shots.map(x => x.r))
  const animate = !reduceMotion()
  const enter = id => {
    if (id === hover) return
    setHover(id)
    setSeason(false)
  }
  const leave = () => {
    setHover(null)
    setSeason(false)
  }
  const toggle = id => {
    setHover(id)
    setSeason(on => (id === hover ? !on : true))
  }
  return (
    <>
      <div style={{ padding: '10px 0 0', margin: '0 14px', borderTop: divided ? '1px solid #544f4b' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
        <svg viewBox={`0 0 500 ${COURT_H}`} onMouseLeave={leave} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <style>{SHOT_KEYFRAMES}</style>
          <rect x="0" y="0" width="500" height={COURT_H} fill="#262422" />
          <defs>
            <clipPath id="courtClip"><rect x="1" y="1" width="498" height={COURT_H - 2} /></clipPath>
            <clipPath id="insideThree"><path d={INSIDE_THREE} /></clipPath>
          </defs>
          <g clipPath="url(#courtClip)">
            {zones.map(z => (
              <path key={z.id} d={z.d} fill={hover === z.id ? '#121110' : z.fill} fillRule="evenodd" clipPath={z.clip ? 'url(#insideThree)' : undefined}
                onMouseEnter={() => enter(z.id)} onClick={() => toggle(z.id)}
                style={{ cursor: 'pointer', opacity: hover && hover !== z.id ? 0.3 : 1, transition: 'opacity .15s' }} />
            ))}
          </g>
          {/* Court markings over the bands, light and thin so they read the same on every color. */}
          <g fill="none" stroke="rgba(236,232,227,.4)" strokeWidth="1.5" pointerEvents="none">
            <rect x="1" y="1" width="498" height={COURT_H - 2} />
            <path d={THREE_LINE} />
            {BAND_EDGES.map(d => <path key={d} d={d} />)}
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
            {shots.map(({ s, i, r }) => <Shot key={i} shot={s} offset={spread(i)} animate={animate} delay={Math.round((r / far) * 240)} />)}
          </g>
          {band && (
            <g pointerEvents="none">
              <rect x="10" y="10" width={band.name.length * 10 + 18} height="28" fill="rgba(31,29,28,.85)" />
              <text x="19" y="24" dominantBaseline="central" fontFamily={MONO} fontSize="15" fontWeight="700" letterSpacing="1" fill="#ece8e3">{band.name}</text>
            </g>
          )}
        </svg>
      </div>
    </>
  )
}

// Each slider is centred on the season average and the recent dot moves by the
// change in units of the league's spread (standard deviation across players), so
// a change reads by how much it matters league-wide, not by its raw size, and
// stars at the top of the league can still move. The ends are this many spreads
// either side: between the 90th (1.3) and 95th (1.6) percentile change across
// players and stats in 2025-26; bigger swings pin to the end.
const RANGE = 1.5
// Slider colour runs green -> muted grey-green -> near-black with the size of the
// move (like the shot map): small changes sit near the middle tone, the biggest
// rises reach the site green and the biggest drops near-black.
const SLIDER_MID = [110, 122, 111]
const SLIDER_LOW = [19, 18, 17]
const sliderColor = t => rgb(t >= 0 ? mix(SLIDER_MID, BETTER, t) : mix(SLIDER_MID, SLIDER_LOW, -t))

function CoreStats({ profile: p }) {
  const rows = p.recentShift.stats.filter(r => p.stats[r.stat])
  return (
    <>
      <div style={{ padding: '10px 0 0', margin: '0 14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '4px 8px' }}>
        <span style={{ display: 'flex', gap: 10, fontFamily: MONO, fontSize: 9, color: '#8a847e', whiteSpace: 'nowrap' }}>
          {legendSwatch('#8a847e', 'SEASON', true, true)}
          {legendSwatch('#ece8e3', 'RECENT', true)}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '4px 14px 12px', gap: 2 }}>
        {rows.map(r => {
          const stat = p.stats[r.stat]
          const change = r.recent.value - r.season.value
          // Right is better, so a lower-better stat moves right when it falls.
          const move = (stat.lowerBetter ? -change : change) / r.spread
          const t = Math.max(-1, Math.min(1, move / RANGE))
          const p0 = 50
          const p1 = 50 + t * 50
          const neutral = Math.abs(move) < 0.1
          const good = move > 0
          const color = neutral ? '#8a847e' : good ? rgb(BETTER) : '#d6d1cb'
          const end = neutral ? '#8a847e' : sliderColor(t)
          // The bar shades from the middle tone at the season dot to the move's colour at the recent dot.
          const bar = neutral ? '#6b655f' : `linear-gradient(to ${good ? 'right' : 'left'}, ${rgb(SLIDER_MID)}, ${end})`
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
                <div style={{ position: 'absolute', left: lo + '%', width: hi - lo + '%', top: 7, height: 4, background: bar }} />
                <div style={{ position: 'absolute', left: p0 + '%', top: 4, width: 8, height: 8, marginLeft: -5, border: '1.5px solid #8a847e', borderRadius: '50%', background: '#2c2a28', boxSizing: 'border-box' }} />
                <div style={{ position: 'absolute', left: p1 + '%', top: 4, width: 10, height: 10, marginLeft: -5, borderRadius: '50%', background: '#ece8e3', border: '2px solid ' + end, boxSizing: 'border-box' }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, textAlign: 'right', color, whiteSpace: 'nowrap' }}>{(change >= 0 ? '+' : '−') + Math.abs(change).toFixed(stat.dec || 1)}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

// Empty states keep each module's shape (stat rows, court) at low contrast, with the
// reason stamped in the middle, so the card reads as "no data" rather than broken.
const EMPTY_STATS = ['BPM', 'AuPM / g', 'Load', 'Net On', 'ORTG On']
const stamp = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: '#a8a29c', background: '#2c2a28', border: '1px solid #544f4b', padding: '4px 8px', whiteSpace: 'nowrap' }

function EmptyStats({ reason }) {
  return (
    <div style={{ position: 'relative', padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {EMPTY_STATS.map(s => (
        <div key={s} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) 54px', gap: 10, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #3d3a37', opacity: 0.45 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.02em', color: '#8a847e' }}>{s}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: '#6b655f' }}>— → —</span>
          </div>
          <div style={{ position: 'relative', height: 18 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 2, background: '#3d3a37' }} />
            <div style={{ position: 'absolute', left: '50%', top: 4, width: 1, height: 10, background: '#6b655f' }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, textAlign: 'right', color: '#6b655f' }}>—</span>
        </div>
      ))}
      <span style={{ ...stamp, position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>{reason}</span>
    </div>
  )
}

function EmptyShotMap({ reason, divided }) {
  return (
    <>
      <div style={{ padding: '10px 0 0', margin: '0 14px', borderTop: divided ? '1px solid #544f4b' : 'none' }}>
        <span style={subhead}>SHOT PROFILE</span>
      </div>
      <div style={{ position: 'relative', padding: '8px 14px 12px' }}>
        <svg viewBox={`0 0 500 ${COURT_H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <rect x="0" y="0" width="500" height={COURT_H} fill="#262422" />
          <defs>
            <clipPath id="emptyCourtClip"><rect x="1" y="1" width="498" height={COURT_H - 2} /></clipPath>
            <clipPath id="emptyInsideThree"><path d={INSIDE_THREE} /></clipPath>
          </defs>
          <g clipPath="url(#emptyCourtClip)">
            {BANDS.map((b, i) => <path key={b.id} d={b.d} fill={i % 2 ? '#292725' : '#2e2c2a'} fillRule="evenodd" clipPath={b.clip ? 'url(#emptyInsideThree)' : undefined} />)}
          </g>
          <g fill="none" stroke="rgba(236,232,227,.18)" strokeWidth="1.5">
            <rect x="1" y="1" width="498" height={COURT_H - 2} />
            <path d={THREE_LINE} />
            {BAND_EDGES.map(d => <path key={d} d={d} />)}
            <line x1="220" y1="40" x2="280" y2="40" />
            <circle cx={BASKET.x} cy={BASKET.y} r="7.5" />
          </g>
        </svg>
        <span style={{ ...stamp, position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>{reason}</span>
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
            DIFFERENCE BETWEEN <span style={{ color: '#ece8e3', fontWeight: 700 }}>{windowLabel(games)}</span> AND REST OF SEASON
          </span>
        </div>
      </div>
      {games === 0 || !p.recentShift
        ? <EmptyStats reason={games === 0 ? 'NO GAMES IN THE LAST 30 DAYS' : 'NO RECENT STATS'} />
        : <CoreStats profile={p} />}
      {games !== 0 && p.shotShift
        ? <ShotMap shotShift={p.shotShift} divided />
        : <EmptyShotMap reason={games === 0 ? 'NO RECENT SHOTS' : 'NO SHOT DATA THIS SEASON'} divided />}
    </div>
  )
}
