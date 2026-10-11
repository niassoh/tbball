import { useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import { GROUPS, cellsOf, change, litOf, seasonsText, segmentsOf, shiftsOf, starsText, toneOf, value } from '../lib/lonestar.js'
import SectionHeader from './SectionHeader.jsx'
import TeamInitials from './TeamInitials.jsx'

// The Lonestar tab: how he plays when his team's stars sit (thinking-bball
// lib/lonestar.js). Keys pick the stars: his top-Load teammate, or his top two. The
// shape up top gives the feel of the change: a column per stat filled to his league
// percentile without the stars, a tick where it reached with them, grouped by role,
// shot diet, efficiency and team, with his number without them and the change (raw or
// in percentiles). The table under it has the numbers: with, without, the change, and
// where the change ranks among every player's (#1 the biggest increase) on a meter.
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#ece8e3' }
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
    <span className="ls-meter" aria-hidden="true" style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ width: 5, height: 8, background: i < n ? INK : RULE }} />)}
    </span>
  )
}

// A column fills to his league percentile without the stars, a segment per 10 points:
// grey what he had with them too, lit in the change's colour what he gains without them
// (a soft warm grey for a volume stat). A tick marks where it reached with them, so a
// drop is the column standing short of its tick: the segments it gave up stay as a faint
// wash of the change's colour, and the tick takes that colour.
const HELD = '#6b655f'
const VOLUME = '#cfc8bf'
const TICK = '#b8b2ab'
const EMPTY = '#2f2c2a'
const SEG = 7
const GAP = 3
const cell = (state, color) => ({ background: state === 'held' ? HELD : state === 'gained' ? color : state === 'lost' ? `color-mix(in srgb, ${color} 24%, ${EMPTY})` : EMPTY })
const toneColor = tone => (tone === 'neutral' ? VOLUME : TONES[tone])
const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`
const pctlText = p => (p === null || p === undefined ? '—' : String(p))

function Column({ stat, s, mode }) {
  const pOn = s.pctl.on[stat.key]
  const pOff = s.pctl.off[stat.key]
  const tone = toneOf(stat, s.change[stat.key])
  const tick = segmentsOf(pOn)
  const dropped = segmentsOf(pOff) < tick
  const pctl = mode === 'pctl'
  return (
    <div title={`${stat.label}: ${value(stat, s.on[stat.key])} with his stars (${pctlText(pOn)} pctl), ${value(stat, s.off[stat.key])} without (${pctlText(pOff)} pctl)`}
      style={{ width: 44, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div aria-hidden="true" style={{ position: 'relative', display: 'flex', flexDirection: 'column-reverse', gap: GAP, width: 22, marginBottom: 2 }}>
        {cellsOf(pOn, pOff).map((state, i) => <span key={i} style={{ height: SEG, ...cell(state, toneColor(tone)) }} />)}
        {tick > 0 && <span style={{ position: 'absolute', left: -4, right: -4, bottom: tick * (SEG + GAP) - GAP / 2 - 1, height: 2, background: dropped ? toneColor(tone) : TICK }} />}
      </div>
      <span style={{ ...label, color: '#c9c3bc', textAlign: 'center', whiteSpace: 'nowrap' }}>{stat.short}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: INK, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{pctl ? pctlText(pOff) : value(stat, s.off[stat.key])}</span>
      <span style={{ fontSize: 10, color: TONES[tone], whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', marginTop: -3 }}>{pctl ? (pOn === null || pOff === null ? '—' : signed(pOff - pOn)) : change(stat, s.change[stat.key])}</span>
    </div>
  )
}

// The three stats whose league percentile moves most without his stars: where he goes
// from and to, and by how much, in raw numbers or percentiles, in the change's colour
// (grey for a volume stat).
function Shifts({ s, mode }) {
  const pctl = mode === 'pctl'
  return (
    <div style={{ flex: '0 1 320px', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 24, borderLeft: `1px solid ${RULE}` }}>
      <span style={{ ...label, color: '#c9c3bc' }}>Biggest shifts</span>
      {shiftsOf(s.pctl).map(x => {
        const k = x.stat.key
        const tone = toneOf(x.stat, s.change[k])
        return (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'baseline', gap: 14, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ ...label, color: '#b8b2ab' }}>{x.stat.label}</span>
            <span style={{ fontSize: 11, color: DIM }}>{pctl ? x.on : value(x.stat, s.on[k])}<span style={{ color: FAINT }}> → </span><span style={{ color: INK }}>{pctl ? x.off : value(x.stat, s.off[k])}</span></span>
            <span style={{ fontSize: 20, fontWeight: 600, minWidth: 56, textAlign: 'right', color: toneColor(tone) }}>{pctl ? signed(x.delta) : change(x.stat, s.change[k])}</span>
          </div>
        )
      })}
    </div>
  )
}

// RAW | PCTL: what the columns and the shifts read in.
function ModeSwitch({ mode, setMode }) {
  return (
    <div role="group" aria-label="Show values as" style={{ display: 'flex', border: `1px solid ${EDGE}` }}>
      {[['raw', 'Raw'], ['pctl', 'Pctl']].map(([m, name]) => (
        <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className="ls-mode"
          style={{ height: 22, padding: '0 10px', background: mode === m ? '#3d3a37' : 'transparent', color: mode === m ? INK : DIM, border: 'none', fontFamily: MONO, fontSize: 9, fontWeight: mode === m ? 700 : 500, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>{name}</button>
      ))}
    </div>
  )
}

// One stat's numbers: with the stars, without, the change, and the change's rank among
// every player's on the meter.
function Row({ stat, s }) {
  const d = s.change[stat.key]
  const tone = toneOf(stat, d)
  const r = s.ranks && s.ranks[stat.key]
  return (
    <div className="ls-row">
      <span style={{ gridArea: 'stat', ...label, color: '#c9c3bc' }}>{stat.label}</span>
      <span style={{ gridArea: 'with', textAlign: 'right', color: '#b8b2ab' }}>{value(stat, s.on[stat.key])}</span>
      <span style={{ gridArea: 'wo', textAlign: 'right', color: INK, fontWeight: 600 }}>{value(stat, s.off[stat.key])}</span>
      <span style={{ gridArea: 'change', textAlign: 'right', fontWeight: 600, color: TONES[tone] }}>{change(stat, d)}</span>
      <span style={{ gridArea: 'rank', display: 'flex', alignItems: 'center', gap: 10 }} title={r ? `His change ranks #${r.rank} of ${r.of} players' (#1 the biggest increase)` : 'Too few minutes to rank'}>
        <span style={{ fontSize: 11, color: r ? INK : FAINT, whiteSpace: 'nowrap' }}>{r ? `#${r.rank}` : '—'}<span className="ls-of" style={{ color: DIM, fontSize: 10 }}>{r ? ` / ${r.of}` : ''}</span></span>
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

const swatch = style => <span style={{ width: 10, height: 6, flex: 'none', ...style }} />

export default function Lonestar({ profile: p }) {
  const ls = p.lonestar
  const [pick, setPick] = useState(0)
  const [mode, setMode] = useState('raw')
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

      {/* The shape: a column per stat at his league percentile without the stars, a tick
          where it reached with them; beside it, the stats that move most. RAW | PCTL sets
          what their numbers read in. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}><ModeSwitch mode={mode} setMode={setMode} /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '24px 40px', padding: '6px 0 4px', fontFamily: MONO }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 24px' }}>
          {GROUPS.map(g => (
            <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...label, color: '#c9c3bc' }}>{g.name}</span>
                <span style={{ flex: 1, height: 1, background: RULE }} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>{g.stats.map(stat => <Column key={stat.key} stat={stat} s={s} mode={mode} />)}</div>
            </div>
          ))}
        </div>
        <Shifts s={s} mode={mode} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{swatch({ width: 14, height: 2, background: TICK })}WITH HIS STARS</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{swatch({ background: HELD })}WITHOUT</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{swatch({ background: TONES.good })}{swatch({ background: TONES.bad })}{swatch({ background: VOLUME })}GAINED W/O STARS · BETTER, WORSE, VOLUME</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{swatch(cell('lost', TONES.bad))}{swatch({ width: 14, height: 2, background: TONES.bad })}GIVEN UP W/O STARS</span>
        <span>COLUMN · LEAGUE PERCENTILE · NUMBERS · WITHOUT, AND THE CHANGE</span>
      </div>

      {/* The numbers, in the shape's order. */}
      <div className="ls-table" style={{ fontFamily: MONO, marginTop: 8 }}>
        <div className="ls-row ls-head">
          <span style={{ gridArea: 'with', textAlign: 'right', ...label }}>With stars</span>
          <span style={{ gridArea: 'wo', textAlign: 'right', ...label }}>Without</span>
          <span style={{ gridArea: 'change', textAlign: 'right', ...label }}>Change</span>
          <span style={{ gridArea: 'rank', ...label }}>Rank</span>
        </div>
        {GROUPS.flatMap(g => g.stats).map(stat => <Row key={stat.key} stat={stat} s={s} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span>CHANGE · W/O − WITH</span>
        <span>#RANK · AMONG EVERY PLAYER&apos;S CHANGE ({ls.minRank}+ MIN EACH WAY), #1 THE BIGGEST INCREASE</span>
      </div>
    </section>
  )
}
