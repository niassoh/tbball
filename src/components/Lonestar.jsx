import { useState } from 'react'
import { MONO } from '../lib/format.js'
import { STATS, change, litOf, seasonsText, starsText, toneOf, value } from '../lib/lonestar.js'
import SectionHeader from './SectionHeader.jsx'

// The Lonestar tab: how he plays when his team's stars sit (thinking-bball
// lib/lonestar.js). Keys pick the stars: his top-Load teammate, or his top two. Each cell
// is one stat: the change with them OFF against ON as the readout, the two raw values
// under it, and where the change ranks among every player's (#1 the biggest increase) on
// a 10-segment meter.
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#ece8e3' }
const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }

function Key({ on, onClick, children }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="ls-key"
      style={{ height: 34, padding: '0 12px', background: on ? INK : 'transparent', color: on ? '#1f1d1c' : '#b8b2ab', border: `1px solid ${on ? INK : EDGE}`, fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

function Meter({ n }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: 2, minWidth: 0 }}>
      {/* Segments give way (5px → 3px) before a three-digit values line wraps. */}
      {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ flex: '0 1 5px', minWidth: 3, height: 8, background: i < n ? INK : RULE }} />)}
    </span>
  )
}

function Cell({ stat, s }) {
  const d = s.change[stat.key]
  const tone = toneOf(stat, d)
  const r = s.ranks && s.ranks[stat.key]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 14px 12px', border: `1px solid ${RULE}`, margin: '0 -1px -1px 0', background: '#262422', minWidth: 0, fontFamily: MONO }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ ...label, color: '#c9c3bc' }}>{stat.label}</span>
        <span style={{ fontSize: 10, color: r ? INK : FAINT, letterSpacing: '.04em', fontVariantNumeric: 'tabular-nums' }} title={r ? `His change ranks #${r.rank} of ${r.of} players' (#1 the biggest increase)` : 'Too few minutes to rank'}>{r ? `#${r.rank}` : '—'}<span style={{ color: DIM }}>{r ? ` / ${r.of}` : ''}</span></span>
      </div>
      <span style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, letterSpacing: '-.02em', color: TONES[tone], fontVariantNumeric: 'tabular-nums' }}>{change(stat, d)}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10, color: DIM, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ whiteSpace: 'nowrap' }}>{value(stat, s.on[stat.key])} <span style={{ color: FAINT }}>WITH</span> → {value(stat, s.off[stat.key])} <span style={{ color: FAINT }}>W/O</span></span>
        <Meter n={litOf(r)} />
      </div>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ls.scenarios.map((x, i) => (
          <Key key={`${x.team}-${x.stars.map(t => t.id).join()}`} on={x === s} onClick={() => setPick(i)}>
            W/O {starsText(x.stars)}{teams.size > 1 ? ` · ${x.team}` : ''}
          </Key>
        ))}
      </div>

      {/* The readout: minutes on each side, and the seasons and team behind them. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', border: `1px solid ${EDGE}`, fontFamily: MONO }}>
        {[['Without', s.off.minutes], ['With', s.on.minutes]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 16px', borderRight: `1px solid ${EDGE}` }}>
            <span style={label}>{k} · min</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: INK, fontVariantNumeric: 'tabular-nums' }}>{Math.round(v).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, padding: '10px 16px', minWidth: 200 }}>
          <span style={label}>{s.team} · {seasonsText(s.seasons)}</span>
          <span style={{ fontSize: 11, color: s.ranked ? '#c9c3bc' : '#fa962a', letterSpacing: '.04em' }}>{s.ranked ? `RANKED AMONG PLAYERS WITH ${ls.minRank}+ MIN EACH WAY` : `UNDER ${ls.minRank} MIN ON A SIDE · NOT RANKED`}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', paddingRight: 1, paddingBottom: 1 }}>
        {STATS.map(stat => <Cell key={stat.key} stat={stat} s={s} />)}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 14, height: 3, background: TONES.good }} />BETTER</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 14, height: 3, background: TONES.bad }} />WORSE</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ width: 14, height: 3, background: TONES.neutral }} />VOLUME</span>
        <span>BIG NUMBER · CHANGE W/O − WITH</span>
        <span>#RANK · AMONG EVERY PLAYER&apos;S CHANGE, #1 THE BIGGEST INCREASE</span>
      </div>
    </section>
  )
}
