import { useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import { STATS, change, litOf, seasonsText, starsText, toneOf, trackPos, value } from '../lib/lonestar.js'
import SectionHeader from './SectionHeader.jsx'
import TeamInitials from './TeamInitials.jsx'

// The Lonestar tab: how he plays when his team's stars sit (thinking-bball
// lib/lonestar.js). Keys pick the stars: his top-Load teammate, or his top two. Each row
// is one stat: his value with them ON and OFF, both marked on a track across the
// league's range, the change, and where it ranks among every player's (#1 the biggest
// increase) on a 10-segment meter.
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#ece8e3' }
const BG = '#262422'
const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }

// A star on a key: his face cropped close, in greyscale (he's the one sitting), in a
// slot the key's full height (index.css lifts it on hover and when picked).
function Slot({ who, team }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="ls-face" style={{ width: 32, height: 32, flex: 'none', overflow: 'hidden', background: PORTRAIT_BG, borderRight: `1px solid ${RULE}` }}>
      {who.headshot && !failed
        ? <img src={headshotUrl(who.slug, 100, who.headshotVersion, who.headshot)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 18%', transform: 'scale(1.4)', transformOrigin: '50% 26%', display: 'block' }} />
        : <TeamInitials name={who.name || '?'} team={team} fontSize={9} />}
    </span>
  )
}

function Key({ on, onClick, stars, team, children }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="ls-key"
      style={{ display: 'flex', alignItems: 'center', gap: 10, height: 34, padding: '0 12px 0 0', background: on ? INK : 'transparent', color: on ? '#1f1d1c' : '#b8b2ab', border: `1px solid ${on ? INK : EDGE}`, fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'flex' }}>{stars.map(t => <Slot key={t.id} who={t} team={team} />)}</span>
      {children}
    </button>
  )
}

function Meter({ n }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ width: 5, height: 8, background: i < n ? INK : RULE }} />)}
    </span>
  )
}

// The two markers, small squares: hollow WITH the stars, filled WITHOUT them.
const MARK = '#c9c3bc'
const mark = hollow => ({ width: 7, height: 7, boxSizing: 'border-box', flex: 'none', ...(hollow ? { border: `1px solid ${MARK}`, background: BG } : { background: MARK }) })

// A stat's track: a dot-matrix rule across the league's spread of values (2nd to 98th
// percentile), the dots between his two values lit, and a marker at each. Only the
// change carries colour. The lit dots are the same rule clipped to the stretch, so they
// sit exactly on the unlit ones.
const dots = color => `repeating-linear-gradient(90deg, ${color} 0 2px, transparent 2px 5px)`
function Track({ a, b }) {
  if (a === null || b === null) return <span style={{ gridArea: 'track' }} />
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const at = x => ({ position: 'absolute', top: '50%', left: `${x}%`, transform: 'translate(-50%, -50%)' })
  const rule = { position: 'absolute', left: 0, right: 0, top: 6, height: 2 }
  return (
    <span aria-hidden="true" style={{ gridArea: 'track', position: 'relative', height: 14, margin: '0 5px' }}>
      <span style={{ ...rule, background: dots(RULE) }} />
      <span style={{ ...rule, background: dots(DIM), clipPath: `inset(0 ${100 - hi}% 0 ${lo}%)` }} />
      <span style={{ ...at(a), ...mark(true) }} />
      <span style={{ ...at(b), ...mark(false) }} />
    </span>
  )
}

// One stat: its value with the stars, the track, its value without, the change, and the
// change's rank among every player's on the meter.
function Row({ stat, s, scale }) {
  const on = s.on[stat.key]
  const off = s.off[stat.key]
  const d = s.change[stat.key]
  const tone = toneOf(stat, d)
  const r = s.ranks && s.ranks[stat.key]
  return (
    <div className="ls-row">
      <span style={{ gridArea: 'stat', ...label, color: '#c9c3bc' }}>{stat.label}</span>
      <span style={{ gridArea: 'with', textAlign: 'right', color: '#b8b2ab' }}>{value(stat, on)}</span>
      <Track a={trackPos(scale, on)} b={trackPos(scale, off)} />
      <span style={{ gridArea: 'wo', color: INK, fontWeight: 600 }}>{value(stat, off)}</span>
      <span style={{ gridArea: 'change', textAlign: 'right', fontSize: 15, fontWeight: 600, color: TONES[tone] }}>{change(stat, d)}</span>
      <span style={{ gridArea: 'rank', display: 'flex', alignItems: 'center', gap: 10 }} title={r ? `His change ranks #${r.rank} of ${r.of} players' (#1 the biggest increase)` : 'Too few minutes to rank'}>
        <span style={{ width: 66, fontSize: 11, color: r ? INK : FAINT }}>{r ? `#${r.rank}` : '—'}<span style={{ color: DIM, fontSize: 10 }}>{r ? ` / ${r.of}` : ''}</span></span>
        <Meter n={litOf(r)} />
      </span>
    </div>
  )
}

// One figure beside the keys: its label over its value, set off by a rule, the keys' height.
function Readout({ k, v, small, short, minRank }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, height: 34, padding: '0 14px', borderLeft: `1px solid ${RULE}` }}>
      <span style={label}>{k}</span>
      <span title={short ? `Under ${minRank} minutes: too few to rank` : undefined}
        style={{ fontSize: small ? 11 : 15, fontWeight: small ? 500 : 600, color: short ? TONES.bad : INK, letterSpacing: small ? '.04em' : 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  )
}

export default function Lonestar({ profile: p }) {
  const ls = p.lonestar
  const [pick, setPick] = useState(0)
  const s = ls.scenarios[Math.min(pick, ls.scenarios.length - 1)]
  const teams = new Set(ls.scenarios.map(x => x.team))
  return (
    <section id="sec-lonestar" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader title="Lonestar">
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: '.08em', textTransform: 'uppercase' }}>{p.name} · {seasonsText(ls.seasons)} REG</span>
      </SectionHeader>
      <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, lineHeight: 1.6, color: '#a8a29c' }}>{lastName(p.name)} with his team&apos;s stars OFF the floor, against ON</p>

      {/* The keys, and at their right the picked one's team, seasons and minutes each way
          (a side too short to rank shows orange). */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ls.scenarios.map((x, i) => (
            <Key key={`${x.team}-${x.stars.map(t => t.id).join()}`} on={x === s} onClick={() => setPick(i)} stars={x.stars} team={x.team}>
              W/O {starsText(x.stars)}{teams.size > 1 ? ` · ${x.team}` : ''}
            </Key>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', fontFamily: MONO }}>
          <Readout k={s.team} v={seasonsText(s.seasons)} small />
          {[['W/O · min', s.off.minutes], ['With · min', s.on.minutes]].map(([k, m]) => (
            <Readout key={k} k={k} v={Math.round(m).toLocaleString()} short={!s.ranked && m < ls.minRank} minRank={ls.minRank} />
          ))}
        </div>
      </div>

      {/* The stats as rows; the head names the two markers over the tracks. */}
      <div className="ls-table" style={{ fontFamily: MONO }}>
        <div className="ls-row ls-head">
          <span style={{ gridArea: 'track', display: 'flex', justifyContent: 'space-between', gap: 12, ...label }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={mark(true)} />With stars</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Without<span style={mark(false)} /></span>
          </span>
          <span style={{ gridArea: 'change', textAlign: 'right', ...label }}>Change</span>
          <span style={{ gridArea: 'rank', ...label }}>Rank</span>
        </div>
        {STATS.map(stat => <Row key={stat.key} stat={stat} s={s} scale={ls.scale && ls.scale[stat.key]} />)}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 6, height: 6, background: TONES.good }} />BETTER</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 6, height: 6, background: TONES.bad }} />WORSE</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 6, height: 6, background: TONES.neutral }} />VOLUME</span>
        <span>CHANGE · W/O − WITH</span>
        <span>TRACK · THE LEAGUE&apos;S RANGE FOR THE STAT</span>
        <span>#RANK · AMONG EVERY PLAYER&apos;S CHANGE ({ls.minRank}+ MIN EACH WAY), #1 THE BIGGEST INCREASE</span>
      </div>
    </section>
  )
}
