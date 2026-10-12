import { useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import { STATS, change, lastName, litOf, seasonsText, starsText, stripOf, toneOf, value } from '../lib/lonestar.js'
import SectionHeader from './SectionHeader.jsx'
import TeamInitials from './TeamInitials.jsx'

// The Lonestar tab: how he plays when his team's stars sit (thinking-bball
// lib/lonestar.js). Keys pick the stars: his top-Load teammate, or his top two. On the
// left, the shape of the change: Load against Net (league percentiles) with the stars and
// without, the two moves in numbers, who's on and off, and the minutes each way. On the
// right, every stat: with, a strip of league percentile (where he is with them, without
// them, and the stretch between in the change's colour), without, the change, and its
// rank among every player's (#1 the biggest increase).
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#5f5a55' }
const BG = '#262422'
const INK = '#ece8e3'
const SOFT = '#d9d3cc'
const MID = '#b8b2ab'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const CELL = '#34312e'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
const LOAD = STATS.find(x => x.key === 'load')
const NET = STATS.find(x => x.key === 'net')
const pctlText = p => (p === null || p === undefined ? '—' : String(p))
const signed = n => (n === null ? '—' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`)

function Key({ on, onClick, children }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="ls-key"
      style={{ height: 30, padding: '0 12px', background: on ? '#3a3734' : 'transparent', color: on ? INK : MID, border: `1px solid ${on ? DIM : EDGE}`, fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

// RAW | PCTL: what the table's numbers read in.
function ModeSwitch({ mode, setMode }) {
  return (
    <div role="group" aria-label="Show values as" style={{ display: 'flex', border: `1px solid ${EDGE}` }}>
      {[['raw', 'Raw'], ['pctl', 'Pctl']].map(([m, name]) => (
        <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className="ls-mode"
          style={{ height: 28, padding: '0 12px', background: mode === m ? '#3a3734' : 'transparent', color: mode === m ? INK : DIM, border: 'none', fontFamily: MONO, fontSize: 9, fontWeight: mode === m ? 700 : 500, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>{name}</button>
      ))}
    </div>
  )
}

// Load against Net, both as league percentiles: a hollow square where he is with the
// stars, a filled one without them, joined in the colour of his Net change.
function Plot({ s }) {
  const W = 264
  const H = 236
  const box = { l: 18, r: 4, t: 16, b: 30 }
  const x = p => box.l + (p / 100) * (W - box.l - box.r)
  const y = p => box.t + (1 - p / 100) * (H - box.t - box.b)
  const a = [s.pctl.on.load, s.pctl.on.net]
  const b = [s.pctl.off.load, s.pctl.off.net]
  const has = pt => pt.every(v => v !== null && v !== undefined)
  const tone = toneOf(NET, s.change.net)
  const corner = { fontFamily: MONO, fontSize: 7, letterSpacing: '.08em', fill: FAINT }
  const right = x(100)
  const bottom = y(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={label}>Load × Net · with → without</span>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Load and Net percentiles: ${pctlText(a[0])} and ${pctlText(a[1])} with his stars, ${pctlText(b[0])} and ${pctlText(b[1])} without`} style={{ display: 'block', overflow: 'visible' }}>
        <rect x={box.l} y={box.t} width={right - box.l} height={bottom - box.t} fill="none" stroke={RULE} />
        <line x1={x(50)} x2={x(50)} y1={box.t} y2={bottom} stroke={EDGE} strokeDasharray="1 3" />
        <line x1={box.l} x2={right} y1={y(50)} y2={y(50)} stroke={EDGE} strokeDasharray="1 3" />
        <text x={box.l + 5} y={box.t + 11} style={corner}>LESS LOAD · BETTER</text>
        <text x={right - 5} y={box.t + 11} textAnchor="end" style={corner}>MORE LOAD · BETTER</text>
        <text x={box.l + 5} y={bottom - 6} style={corner}>LESS LOAD · WORSE</text>
        <text x={right - 5} y={bottom - 6} textAnchor="end" style={corner}>MORE LOAD · WORSE</text>
        <text x={box.l - 5} y={box.t + 3} textAnchor="end" style={{ ...corner, fill: DIM }}>100</text>
        <text x={box.l - 5} y={bottom + 3} textAnchor="end" style={{ ...corner, fill: DIM }}>0</text>
        <text x={right} y={bottom + 12} textAnchor="end" style={{ ...corner, fill: DIM }}>100</text>
        <text transform={`translate(${box.l - 11} ${(box.t + bottom) / 2}) rotate(-90)`} textAnchor="middle" style={{ ...corner, fill: DIM }}>NET PCTL</text>
        <text x={(box.l + right) / 2} y={bottom + 24} textAnchor="middle" style={{ ...corner, fill: DIM }}>LOAD PCTL</text>
        {has(a) && has(b) && <line x1={x(a[0])} y1={y(a[1])} x2={x(b[0])} y2={y(b[1])} stroke={TONES[tone] || DIM} strokeWidth="2" />}
        {has(a) && <rect x={x(a[0]) - 4.5} y={y(a[1]) - 4.5} width="9" height="9" fill={BG} stroke={MID} strokeWidth="1.5" />}
        {has(b) && <rect x={x(b[0]) - 5.5} y={y(b[1]) - 5.5} width="11" height="11" fill={SOFT} />}
      </svg>
    </div>
  )
}

// A move in numbers: the change in its colour, and from → to.
function Move({ stat, name, s }) {
  const tone = toneOf(stat, s.change[stat.key])
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px' }}>
      <span style={label}>{name}</span>
      <span style={{ fontSize: 18, fontWeight: 600, color: TONES[tone] === FAINT ? MID : TONES[tone], fontVariantNumeric: 'tabular-nums' }}>{change(stat, s.change[stat.key])}</span>
      <span style={{ fontSize: 10, color: DIM, fontVariantNumeric: 'tabular-nums' }}>{value(stat, s.on[stat.key])} → <span style={{ color: INK }}>{value(stat, s.off[stat.key])}</span></span>
    </div>
  )
}

// One of the cast: his cut-out portrait standing on the shared rule, his name and
// whether he's on or off under it. The stars who sit are smaller, greyscale and dim.
function Figure({ who, team, on, size }) {
  const [failed, setFailed] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
      <div style={{ height: 82, display: 'flex', alignItems: 'flex-end', paddingRight: 12 }}>
        {who.headshot && !failed
          ? <img src={headshotUrl(who.slug, 400, who.headshotVersion, who.headshot)} alt="" onError={() => setFailed(true)}
              style={{ width: size, height: size, objectFit: 'contain', objectPosition: '50% 100%', display: 'block', ...(on ? {} : { filter: 'grayscale(1)', opacity: 0.45 }) }} />
          : <span style={{ width: size * 0.7, height: size * 0.7, display: 'block', opacity: on ? 1 : 0.45 }}><TeamInitials name={who.name || '?'} team={team} fontSize={12} /></span>}
      </div>
      <div style={{ alignSelf: 'stretch', borderTop: `1px solid ${EDGE}`, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ ...label, color: on ? INK : MID, whiteSpace: 'nowrap' }}>{lastName(who.name)}</span>
        <span style={{ ...label, color: on ? DIM : FAINT }}>{on ? 'On' : 'Off'}</span>
      </div>
    </div>
  )
}

function Cast({ p, s }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }} aria-label={`${p.name} without ${starsText(s.stars)}`}>
      <Figure who={p} team={s.team} on size={82} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...label, height: 82, display: 'flex', alignItems: 'center', paddingRight: 12, color: FAINT }}>W/O</span>
        <div style={{ borderTop: `1px solid ${EDGE}` }} />
      </div>
      {s.stars.map(t => <Figure key={t.id} who={t} team={s.team} size={60} />)}
    </div>
  )
}

// Minutes with the stars and without (a side too short to rank shows orange), and the
// team and seasons behind them.
function Minutes({ s, minRank }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', border: `1px solid ${EDGE}` }}>
        {[['With · min', s.on.minutes], ['W/O · min', s.off.minutes]].map(([k, m], i) => {
          const short = !s.ranked && m < minRank
          return (
            <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderLeft: i ? `1px solid ${EDGE}` : 'none' }}>
              <span style={label}>{k}</span>
              <span title={short ? `Under ${minRank} minutes: too few to rank` : undefined} style={{ fontSize: 22, fontWeight: 600, color: short ? TONES.bad : INK, fontVariantNumeric: 'tabular-nums' }}>{Math.round(m).toLocaleString()}</span>
            </div>
          )
        })}
      </div>
      <span style={{ ...label, color: FAINT }}>{s.team} · {seasonsText(s.seasons)}{s.ranked ? '' : ` · under ${minRank} min a side, not ranked`}</span>
    </div>
  )
}

// A row's strip cells: empty, where he is with the stars (hollow), without (filled), the
// same either way, and the stretch between in the change's colour.
const stripCell = (state, color) => (
  state === 'with' ? { boxShadow: `inset 0 0 0 1.5px ${MID}` }
    : state === 'without' ? { background: SOFT }
      : state === 'both' ? { background: SOFT, boxShadow: `inset 0 0 0 1.5px ${DIM}` }
        : state === 'between' ? { background: color }
          : { background: CELL }
)

function Meter({ n }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ width: 4, height: 9, background: i < n ? MID : CELL }} />)}
    </span>
  )
}

function Row({ stat, s, mode }) {
  const k = stat.key
  const d = s.change[k]
  const tone = toneOf(stat, d)
  const r = s.ranks && s.ranks[k]
  const pOn = s.pctl.on[k]
  const pOff = s.pctl.off[k]
  const pctl = mode === 'pctl'
  return (
    <div className="ls-row" title={`${stat.label}: ${value(stat, s.on[k])} with his stars (${pctlText(pOn)} pctl), ${value(stat, s.off[k])} without (${pctlText(pOff)} pctl)`}>
      <span style={{ gridArea: 'stat', ...label, color: '#c9c3bc' }}>{stat.label}</span>
      <span className="ls-with" style={{ gridArea: 'with', textAlign: 'right', color: DIM }}>{pctl ? pctlText(pOn) : value(stat, s.on[k])}</span>
      <span aria-hidden="true" style={{ gridArea: 'strip', display: 'flex', gap: 2 }}>
        {stripOf(pOn, pOff).map((state, i) => <span key={i} style={{ flex: 1, height: 13, ...stripCell(state, TONES[tone]) }} />)}
      </span>
      <span style={{ gridArea: 'wo', textAlign: 'right', color: INK, fontWeight: 600 }}>{pctl ? pctlText(pOff) : value(stat, s.off[k])}</span>
      <span style={{ gridArea: 'change', textAlign: 'right', fontSize: 15, fontWeight: 600, color: TONES[tone] }}>{pctl ? signed(pOn === null || pOff === null ? null : pOff - pOn) : change(stat, d)}</span>
      <span className="ls-rank" style={{ gridArea: 'rank', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }} title={r ? `His change ranks #${r.rank} of ${r.of} players' (#1 the biggest increase)` : 'Too few minutes to rank'}>
        <span style={{ fontSize: 10, color: r ? MID : FAINT }}>{r ? `#${r.rank}` : '—'}</span>
        <Meter n={litOf(r)} />
      </span>
    </div>
  )
}

const swatch = style => <span style={{ width: 10, height: 10, flex: 'none', ...style }} />
const legendItem = { display: 'inline-flex', gap: 6, alignItems: 'center' }

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

      <div className="ls-frame" style={{ border: `1px solid ${RULE}`, fontFamily: MONO }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: `1px solid ${RULE}` }}>
          <span style={{ ...label, marginRight: 6 }}>Without</span>
          {ls.scenarios.map((x, i) => (
            <Key key={`${x.team}-${x.stars.map(t => t.id).join()}`} on={x === s} onClick={() => setPick(i)}>
              W/O {starsText(x.stars)}{teams.size > 1 ? ` · ${x.team}` : ''}
            </Key>
          ))}
          <span style={{ marginLeft: 'auto' }}><ModeSwitch mode={mode} setMode={setMode} /></span>
        </div>

        <div className="ls-body">
          <div className="ls-side" style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: 18 }}>
            <Plot s={s} />
            <div style={{ display: 'flex', border: `1px solid ${EDGE}` }}>
              <Move stat={LOAD} name="Load" s={s} />
              <div style={{ width: 1, background: EDGE }} />
              <Move stat={NET} name="Net rtg" s={s} />
            </div>
            <Cast p={p} s={s} />
            <Minutes s={s} minRank={ls.minRank} />
          </div>

          <div className="ls-main">
            <div className="ls-row ls-head">
              <span style={{ gridArea: 'stat', ...label }}>Stat</span>
              <span className="ls-with" style={{ gridArea: 'with', textAlign: 'right', ...label }}>With</span>
              <span style={{ gridArea: 'strip', display: 'flex', justifyContent: 'space-between', ...label, color: FAINT }}><span>0</span><span className="ls-pctl-word" style={{ color: DIM }}>League pctl</span><span>100</span></span>
              <span style={{ gridArea: 'wo', textAlign: 'right', ...label }}>W/O</span>
              <span style={{ gridArea: 'change', textAlign: 'right', ...label }}>Change</span>
              <span className="ls-rank" style={{ gridArea: 'rank', textAlign: 'right', ...label }}>Rank</span>
            </div>
            {STATS.map(stat => <Row key={stat.key} stat={stat} s={s} mode={mode} />)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: '14px 18px', fontSize: 9, letterSpacing: '.1em', color: DIM }}>
              <span style={legendItem}>{swatch(stripCell('with'))}WITH</span>
              <span style={legendItem}>{swatch(stripCell('without'))}WITHOUT</span>
              <span style={legendItem}>{swatch({ background: TONES.good })}BETTER W/O</span>
              <span style={legendItem}>{swatch({ background: TONES.bad })}WORSE W/O</span>
              <span>VOLUME STATS: BLUE MORE, ORANGE LESS</span>
              <span>1 CELL = 5 PCTL</span>
              <span>#RANK · AMONG EVERY PLAYER&apos;S CHANGE ({ls.minRank}+ MIN EACH WAY)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
