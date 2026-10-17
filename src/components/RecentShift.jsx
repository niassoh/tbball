import { useState } from 'react'
import { MONO, fmt } from '../lib/format.js'
import { BANDS, MODES, mix, rgb, shotModel } from '../lib/shot.js'
import { BAND_EDGES, BASKET, COURT_H, INSIDE_THREE, KEY_HASHES, KEY_LINES, THREE_LINE } from '../lib/court.js'
import { emptyNote, seasonsBetween } from '../lib/seasons.js'

const subhead = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#a09a93' }

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

// The empty state renders the same header and legend rows, hidden, so the card's
// sections sit at the same heights whether or not there is data.
function ShotHeader({ divided, children }) {
  return (
    <div style={{ padding: '10px 0 0', margin: '0 14px', borderTop: divided ? '1px solid #544f4b' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={subhead}>SHOT PROFILE</span>
      {children}
    </div>
  )
}

function ModeToggle({ mode, onPick, hidden }) {
  return (
    <div aria-hidden={hidden || undefined} style={{ display: 'flex', border: '1px solid #544f4b', visibility: hidden ? 'hidden' : 'visible' }}>
      {Object.entries(MODES).map(([id, m]) => {
        const on = id === mode
        return (
          <button key={id} onClick={() => onPick(id)} style={{ background: on ? '#ece8e3' : 'transparent', color: on ? '#1f1d1c' : '#b3ada6', border: 'none', padding: '3px 7px', fontFamily: MONO, fontSize: 9, letterSpacing: '.06em', fontWeight: on ? 700 : 400, cursor: 'pointer' }}>{m.label}</button>
        )
      })}
    </div>
  )
}

// The card's two windows: the last 30 days against the rest of the season, or in
// playoffs mode the playoffs against that regular season (same data shape).
// `short` fits the shot map's hover box.
const WINDOWS = { regular: { base: 'SEASON', window: 'RECENT', short: 'SEASON' }, playoffs: { base: 'REG SEASON', window: 'PLAYOFFS', short: 'SEASON' } }

function Legend({ hidden, labels = WINDOWS.regular }) {
  return (
    <div aria-hidden={hidden || undefined} style={{ padding: '10px 0 0', margin: '0 14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '4px 8px', visibility: hidden ? 'hidden' : 'visible' }}>
      <span style={{ display: 'flex', gap: 10, fontFamily: MONO, fontSize: 9, color: '#a09a93', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 1, height: 9, background: '#a09a93' }} />{labels.base}</span>
        {/* "vs", not an arrow: the window is set against the base, not reached from it. */}
        <span style={{ color: '#837d76' }}>vs</span>
        <span>{labels.window}</span>
      </span>
    </div>
  )
}

const statRows = { display: 'flex', flexDirection: 'column', padding: '4px 14px 12px', gap: 2 }

// The key, faint and broken like a stencil, so the bands read against the court's own
// distances.
function CourtKey({ opacity }) {
  return (
    <g fill="none" stroke={`rgba(236,232,227,${opacity})`} strokeWidth="1.5" pointerEvents="none">
      {KEY_LINES.map(d => <path key={d} d={d} strokeDasharray="12 5" />)}
      <path d={KEY_HASHES} />
    </g>
  )
}

function ShotMap({ shotShift, divided, po = false, labels = WINDOWS[po ? 'playoffs' : 'regular'] }) {
  const [mode, setMode] = useState('value')
  const [hover, setHover] = useState(null)
  const [season, setSeason] = useState(false)
  const zones = shotModel(shotShift, mode, po)
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
      <ShotHeader divided={divided}><ModeToggle mode={mode} onPick={setMode} /></ShotHeader>
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
                style={{ cursor: 'pointer', opacity: hover && hover !== z.id ? 0.3 : 1, transition: 'opacity .15s, fill .45s' }} />
            ))}
          </g>
          <CourtKey opacity={0.22} />
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
            // The zone's own shooting in each window: makes/attempts, FG% and its share of
            // the window's shots. The window whose shots are drawn is bright.
            <g pointerEvents="none" fontFamily={MONO}>
              <rect x="10" y="10" width="244" height="70" fill="rgba(31,29,28,.88)" />
              <text x="19" y="25" dominantBaseline="central" fontSize="15" fontWeight="700" letterSpacing="1" fill="#ece8e3">{band.name}</text>
              {[[labels.window, band.recentShots, !season], [labels.short, band.seasonShots, season]].map(([name, c, on], i) => (
                <text key={name} x="19" y={48 + i * 18} dominantBaseline="central" fontSize="11.5" fontWeight={on ? 700 : 400} fill={on ? '#ece8e3' : '#a09a93'}>
                  <tspan>{name}</tspan>
                  <tspan x="84">{c.fgm}/{c.fga}</tspan>
                  <tspan x="148">{c.pct === null ? '—' : `${c.pct.toFixed(1)}%`}</tspan>
                  <tspan x="204">{c.share === null ? '—' : `${Math.round(c.share)}%`}</tspan>
                </text>
              ))}
              <text x="245" y="25" dominantBaseline="central" textAnchor="end" fontSize="9" fill="#a09a93">FG · FG% · OF FGA</text>
            </g>
          )}
        </svg>
      </div>
    </>
  )
}

// Each slider is centred on the season average and the arrow runs by the
// change in units of the league's spread (standard deviation across players), so
// a change reads by how much it matters league-wide, not by its raw size, and
// stars at the top of the league can still move. The ends are this many spreads
// either side: between the 90th (1.3) and 95th (1.6) percentile change across
// players and stats in 2025-26; bigger swings pin to the end.
const RANGE = 1.5
// Moving to another player keeps these rows mounted, so the arrows slide over.
const SLIDE = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'none' : 'left .45s cubic-bezier(.2,.8,.2,1), width .45s cubic-bezier(.2,.8,.2,1), border-color .45s'
// An arrow from the season (the middle tick) to the recent value: green a rise, orange a
// drop (Footprint's cost), both darkened to sit with the shot map's blue and orange. Its
// colour runs up from the track's grey with the size of the move, so small changes stay
// quiet and the biggest reach the full tone.
const UP = [102, 153, 104]
const DOWN = [196, 116, 48]
const QUIET = [131, 125, 118]
const HEAD = { right: 'polygon(0 0, 100% 50%, 0 100%)', left: 'polygon(100% 0, 0 50%, 100% 100%)' }

function CoreStats({ profile: p, shift, po = false, labels = WINDOWS[po ? 'playoffs' : 'regular'] }) {
  // The same rows every time (EMPTY_STATS' order), a missing one drawn empty, so the
  // card keeps its height between players and between the season and the playoffs.
  const byStat = new Map(shift.stats.filter(r => p.stats[r.stat]).map(r => [r.stat, r]))
  const rows = EMPTY_STATS.map(stat => byStat.get(stat) || { stat, missing: true })
  return (
    <>
      <Legend labels={labels} />
      <div style={statRows}>
        {rows.map(r => {
          if (r.missing) return <EmptyRow key={r.stat} stat={r.stat} />
          const stat = p.stats[r.stat]
          const change = r.recent.value - r.season.value
          // Right is better, so a lower-better stat moves right when it falls.
          const move = (stat.lowerBetter ? -change : change) / r.spread
          const t = Math.max(-1, Math.min(1, move / RANGE))
          const p0 = 50
          const p1 = 50 + t * 50
          const neutral = Math.abs(move) < 0.1
          const good = move > 0
          const color = neutral ? '#a09a93' : rgb(good ? UP : DOWN)
          const end = neutral ? '#a09a93' : rgb(mix(QUIET, good ? UP : DOWN, 0.45 + 0.55 * Math.abs(t)))
          // The shaft shades from the track at the season tick to the move's colour at its head.
          const bar = `linear-gradient(to ${good ? 'right' : 'left'}, #3d3a37, ${end})`
          const lo = Math.min(p0, p1)
          const hi = Math.max(p0, p1)
          return (
            <div key={r.stat} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) 54px', gap: 10, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #3d3a37' }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.stat}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#a09a93', whiteSpace: 'nowrap' }}>{fmt(stat, r.season.value)} → {fmt(stat, r.recent.value)}</span>
              </div>
              <div style={{ position: 'relative', height: 18 }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 2, background: '#3d3a37' }} />
                <div style={{ position: 'absolute', left: '50%', top: 4, width: 1, height: 10, background: '#837d76' }} />
                {neutral
                  ? <div style={{ position: 'absolute', left: p1 + '%', top: 6, width: 6, height: 6, marginLeft: -3, borderRadius: '50%', background: end, transition: SLIDE }} />
                  : <>
                    <div style={{ position: 'absolute', left: lo + '%', width: hi - lo + '%', top: 8, height: 2, background: bar, transition: SLIDE }} />
                    <div style={{ position: 'absolute', left: p1 + '%', top: 4, width: 8, height: 10, marginLeft: good ? -8 : 0, background: end, clipPath: HEAD[good ? 'right' : 'left'], transition: SLIDE }} />
                  </>}
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
const EMPTY_STATS = ['BPM', 'AuPM / g', 'Load', 'rTS%', 'Net On']
const stamp = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: '#b3ada6', background: '#2c2a28', border: '1px solid #544f4b', padding: '4px 8px', whiteSpace: 'nowrap' }

// A stat row with no value: its frame at low contrast.
function EmptyRow({ stat }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) 54px', gap: 10, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #3d3a37', opacity: 0.45 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.02em', color: '#a09a93' }}>{stat}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: '#837d76' }}>— → —</span>
      </div>
      <div style={{ position: 'relative', height: 18 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 2, background: '#3d3a37' }} />
        <div style={{ position: 'absolute', left: '50%', top: 4, width: 1, height: 10, background: '#837d76' }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, textAlign: 'right', color: '#837d76' }}>—</span>
    </div>
  )
}

function EmptyStats({ reason }) {
  return (
    <>
      <Legend hidden />
      <div style={{ ...statRows, position: 'relative' }}>
        {EMPTY_STATS.map(s => <EmptyRow key={s} stat={s} />)}
        <span style={{ ...stamp, position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>{reason}</span>
      </div>
    </>
  )
}

function EmptyShotMap({ reason, divided }) {
  return (
    <>
      <ShotHeader divided={divided}><ModeToggle mode="value" onPick={() => {}} hidden /></ShotHeader>
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
          <CourtKey opacity={0.1} />
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

// Playoffs mode: the picked season's playoffs against its regular season (`shift`). A run
// without one wasn't in the regular season's pull (under its minutes floor); an empty
// season says why (emptyNote). The shot map is the latest playoffs' only.
function PlayoffShift({ profile: p, season: k }) {
  const s = p.seasons[k]
  const season = s.season
  const label = season.replace('-', '–')
  const games = s.empty ? null : s.gp
  const reason = s.empty ? emptyNote(s, 'playoffs') : 'NOT QUALIFIED'
  const shots = p.shotShift && p.shotShift.season === season ? p.shotShift : null
  return (
    <div style={{ border: '1px solid #544f4b', background: '#2c2a28', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '12px 0 8px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '2px 8px', borderBottom: '1px solid #544f4b', margin: '0 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Playoffs vs Season</span>
          <span style={{ ...subhead, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
            DIFFERENCE BETWEEN <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{games === null ? `THE ${label} PLAYOFFS` : `${games} PLAYOFF GAME${games === 1 ? '' : 'S'}`}</span> AND {label} REG SEASON
          </span>
        </div>
      </div>
      {s.shift ? <CoreStats profile={p} shift={s.shift} po /> : <EmptyStats reason={reason} />}
      {shots ? <ShotMap shotShift={shots} divided po /> : <EmptyShotMap reason={s.empty ? reason : 'NO SHOT DATA'} divided />}
    </div>
  )
}

// A past player (out of the latest season): the picked season against his other seasons on
// the site (`career`: their minutes-weighted values; his shots by band, summed), an
// archive's view of where it sat in his career. The span is named, since a career begun
// before 1996-97 is only partly here. Over the rows, his BPM season by season, the picked
// one lit.
const ARCHIVE = '#c9b994'
const yy = season => `’${season.slice(-2)}`
function CareerStrip({ profile: p, k }) {
  const played = p.seasons.filter(x => !x.empty)
  const span = seasonsBetween(played[0].season, played[played.length - 1].season)
  const bpm = new Map(p.seasons.map((x, i) => [x.season, p.stats.BPM && p.stats.BPM.vals[i] ? p.stats.BPM.vals[i].n : null]))
  const top = Math.max(1, ...[...bpm.values()].filter(v => v !== null).map(Math.abs))
  const H = 15
  const w = 100 / span.length
  return (
    <div style={{ margin: '10px 14px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em', color: '#837d76' }}>
        <span>BPM BY SEASON</span>
        <span>{yy(span[0])}–{yy(span[span.length - 1])}</span>
      </div>
      <svg viewBox={`0 0 100 ${2 * H}`} preserveAspectRatio="none" style={{ width: '100%', height: 30, display: 'block' }} aria-hidden="true">
        <line x1="0" x2="100" y1={H} y2={H} stroke="#3d3a37" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {span.map((season, i) => {
          const v = bpm.get(season)
          if (v === null || v === undefined) return null
          const h = Math.max(0.8, (Math.abs(v) / top) * (H - 1))
          const on = season === p.seasons[k].season
          return <rect key={season} x={i * w + w * 0.18} width={w * 0.64} y={v >= 0 ? H - h : H} height={h} fill={on ? ARCHIVE : '#5a5550'} />
        })}
      </svg>
    </div>
  )
}

function CareerShift({ profile: p, season: k }) {
  const s = p.seasons[k]
  const played = p.seasons.filter(x => !x.empty)
  const first = played[0].season
  const last = played[played.length - 1].season
  const c = s.career
  const labels = { base: 'OTHER SEASONS', window: yy(s.season), short: 'OTHER' }
  const reason = s.empty ? 'NO GAMES THIS SEASON' : 'NO OTHER SEASONS TO COMPARE'
  return (
    <div style={{ border: '1px solid #544f4b', background: '#2c2a28', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '12px 0 8px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px 8px', borderBottom: '1px solid #544f4b', margin: '0 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>In His Career</span>
          <span style={{ ...subhead, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#ece8e3', fontWeight: 700 }}>{s.season.replace('-', '–')}</span> AGAINST HIS OTHER SEASONS <span style={{ color: '#ece8e3', fontWeight: 700 }}>{yy(first)}–{yy(last)}</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span title="A retired player: each season against the rest of his on the site" style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '.22em', color: ARCHIVE }}>RETIRED</span>
          <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.1em', color: '#837d76', whiteSpace: 'nowrap' }}>LAST SEASON {last.replace('-', '–')}</span>
        </div>
      </div>
      <CareerStrip profile={p} k={k} />
      {c && c.stats.length ? <CoreStats profile={p} shift={c} labels={labels} /> : <EmptyStats reason={reason} />}
      {c && c.shots ? <ShotMap shotShift={c.shots} divided labels={labels} /> : <EmptyShotMap reason={c ? 'NO SHOT DATA' : reason} divided />}
    </div>
  )
}

export default function RecentShift({ profile: p, season }) {
  if (p.seasonType === 'playoffs') return <PlayoffShift profile={p} season={season} />
  if (p.active === false) return <CareerShift profile={p} season={season} />
  const games = p.gameLog && p.gameLog.recent ? p.gameLog.recent.games : null
  // Not in the pull, which keeps only players over the sheet's minutes floor: for the
  // season (no game log, so no shot data either), or, scaled to each window, in both
  // the last 30 days and the rest of the season. The window label says why on hover.
  const unqualified = games !== 0 && !p.recentShift
  const whyUnqualified = games === null
    ? 'Too few minutes this season to qualify'
    : 'Too few minutes in the last 30 days or the rest of the season to qualify'
  return (
    <div style={{ border: '1px solid #544f4b', background: '#2c2a28', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '12px 0 8px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '2px 8px', borderBottom: '1px solid #544f4b', margin: '0 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Last 30 Days</span>
          <span style={{ ...subhead, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
            DIFFERENCE BETWEEN <span title={unqualified ? whyUnqualified : undefined} style={{ color: '#ece8e3', fontWeight: 700, textDecoration: unqualified ? 'underline dotted' : 'none', textUnderlineOffset: 2 }}>{windowLabel(games)}</span> AND REST OF SEASON
          </span>
        </div>
      </div>
      {games === 0 || unqualified
        ? <EmptyStats reason={games === 0 ? 'NO GAMES IN THE LAST 30 DAYS' : 'NOT QUALIFIED'} />
        : <CoreStats profile={p} shift={p.recentShift} />}
      {games !== 0 && p.shotShift
        ? <ShotMap shotShift={p.shotShift} divided />
        : <EmptyShotMap reason={games === 0 ? 'NO RECENT SHOTS' : 'NOT QUALIFIED'} divided />}
    </div>
  )
}
