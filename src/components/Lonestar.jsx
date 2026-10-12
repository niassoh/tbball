import { useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import { STATS, centered, change, fadeOf, lastName, litOf, posOf, seasonsText, starsText, stripOf, toneOf, value } from '../lib/lonestar.js'
import SectionHeader from './SectionHeader.jsx'
import TeamInitials from './TeamInitials.jsx'

// The Lonestar tab: how he plays when his team's stars sit (thinking-bball
// lib/lonestar.js). Keys pick the stars: his top-Load teammate, or his top two. On the
// left, one continuous panel: Load against Net with the stars and without, the two moves
// in numbers, who's on and off, and the minutes each way. On the right, every stat: with,
// a strip across the stat's league range (where he is with them, without them, and the
// stretch between in the change's colour), without, the change, and its rank among every
// player's (#1 the biggest increase). Positions are on each stat's league range, not its
// percentile, so a big change near the top still reads as big.
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
const PAD = 18
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
const LOAD = STATS.find(x => x.key === 'load')
const NET = STATS.find(x => x.key === 'net')
const pctlText = p => (p === null || p === undefined ? '—' : String(p))
const signed = n => (n === null ? '—' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`)
const rounded = v => `${v > 0.5 ? '+' : ''}${Math.round(v)}`

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

// Load against Net on fixed axes, the same for every player: each centred on its league
// median with one linear scale (lib centered), a little headroom past the league's ends
// so its extremes stay off the frame, the median lines crossing in the middle. The
// quadrant names sit outside the frame, above and below it. A hollow square where he is
// with the stars, a filled one without them, joined in the colour of his Net change.
const HEADROOM = 1.08
const roomy = r => r && [r[1] - (r[1] - r[0]) * HEADROOM, r[1], r[1] + (r[2] - r[1]) * HEADROOM]
function Plot({ s, scale }) {
  const W = 264
  const H = 236
  const box = { l: 22, r: 2, t: 12, b: 38 }
  const right = W - box.r
  const bottom = H - box.b
  const X = roomy(centered(scale.load))
  const Y = roomy(centered(scale.net))
  const x = v => box.l + posOf(X, v) * (right - box.l)
  const y = v => box.t + (1 - posOf(Y, v)) * (bottom - box.t)
  const ok = v => v !== null && v !== undefined
  const a = [s.on.load, s.on.net]
  const b = [s.off.load, s.off.net]
  const tone = toneOf(NET, s.change.net)
  const t = { fontFamily: MONO, fontSize: 7, letterSpacing: '.08em', fill: FAINT }
  if (!X || !Y) return null
  const midX = (box.l + right) / 2
  const midY = (box.t + bottom) / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Load ${value(LOAD, a[0])} and Net ${value(NET, a[1])} with his stars, ${value(LOAD, b[0])} and ${value(NET, b[1])} without`} style={{ display: 'block', overflow: 'visible' }}>
      <rect x={box.l} y={box.t} width={right - box.l} height={bottom - box.t} fill="none" stroke={RULE} />
      <line x1={midX} x2={midX} y1={box.t} y2={bottom} stroke={EDGE} strokeDasharray="1 3" />
      <line x1={box.l} x2={right} y1={midY} y2={midY} stroke={EDGE} strokeDasharray="1 3" />
      <text x={box.l} y={box.t - 5} style={t}>LESS LOAD · BETTER NET</text>
      <text x={right} y={box.t - 5} textAnchor="end" style={t}>MORE LOAD · BETTER NET</text>
      <text x={box.l} y={bottom + 11} style={t}>LESS LOAD · WORSE NET</text>
      <text x={right} y={bottom + 11} textAnchor="end" style={t}>MORE LOAD · WORSE NET</text>
      <text x={box.l - 5} y={box.t + 6} textAnchor="end" style={{ ...t, fill: DIM }}>{rounded(Y[2])}</text>
      <text x={box.l - 5} y={midY + 2.5} textAnchor="end" style={{ ...t, fill: DIM }}>{Math.round(Y[1])}</text>
      <text x={box.l - 5} y={bottom} textAnchor="end" style={{ ...t, fill: DIM }}>{rounded(Y[0])}</text>
      <text transform={`translate(${box.l - 14} ${(box.t + midY) / 2}) rotate(-90)`} textAnchor="middle" style={{ ...t, fill: DIM }}>NET</text>
      <text x={box.l} y={bottom + 26} style={{ ...t, fill: DIM }}>{Math.round(X[0])}</text>
      <text x={midX} y={bottom + 26} textAnchor="middle" style={{ ...t, fill: DIM }}>{Math.round(X[1])}</text>
      <text x={(box.l + midX) / 2} y={bottom + 26} textAnchor="middle" style={{ ...t, fill: DIM }}>LOAD</text>
      <text x={right} y={bottom + 26} textAnchor="end" style={{ ...t, fill: DIM }}>{Math.round(X[2])}</text>
      {ok(a[0]) && ok(a[1]) && ok(b[0]) && ok(b[1]) && <line x1={x(a[0])} y1={y(a[1])} x2={x(b[0])} y2={y(b[1])} stroke={tone === 'neutral' ? DIM : TONES[tone]} strokeWidth="2" />}
      {ok(a[0]) && ok(a[1]) && <rect x={x(a[0]) - 4.5} y={y(a[1]) - 4.5} width="9" height="9" fill={BG} stroke={MID} strokeWidth="1.5" />}
      {ok(b[0]) && ok(b[1]) && <rect x={x(b[0]) - 5.5} y={y(b[1]) - 5.5} width="11" height="11" fill={SOFT} />}
    </svg>
  )
}

// A move in numbers: the change in its colour, and from → to.
function Move({ stat, name, s }) {
  const tone = toneOf(stat, s.change[stat.key])
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: `12px ${PAD}px` }}>
      <span style={label}>{name}</span>
      <span style={{ fontSize: 18, fontWeight: 600, color: tone === 'neutral' ? MID : TONES[tone], fontVariantNumeric: 'tabular-nums' }}>{change(stat, s.change[stat.key])}</span>
      <span style={{ fontSize: 10, color: DIM, fontVariantNumeric: 'tabular-nums' }}>{value(stat, s.on[stat.key])} → <span style={{ color: INK }}>{value(stat, s.off[stat.key])}</span></span>
    </div>
  )
}

// The cast: name tags along the top, cut-out portraits standing on the rule below (the
// one over the minutes). He's in colour; the stars who sit are smaller, greyscale, dim.
function Portrait({ who, team, on, size }) {
  const [failed, setFailed] = useState(false)
  const dim = on ? {} : { filter: 'grayscale(1)', opacity: 0.45 }
  return who.headshot && !failed
    ? <img src={headshotUrl(who.slug, 400, who.headshotVersion, who.headshot)} alt="" onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', objectPosition: '50% 100%', display: 'block', alignSelf: 'end', ...dim }} />
    : <span style={{ width: size * 0.7, height: size * 0.7, display: 'block', alignSelf: 'end', ...dim }}><TeamInitials name={who.name || '?'} team={team} fontSize={12} /></span>
}

function Cast({ p, s }) {
  const cast = [{ who: p, on: true, size: 78 }, ...s.stars.map(t => ({ who: t, on: false, size: 58 }))]
  // A tag is as wide as its portrait, a long name wrapping (at a hyphen, else anywhere),
  // so the cast always fits the panel: GILGEOUS-ALEXANDER and two stars included.
  const tag = (who, on, size) => (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, width: size }}>
      <span style={{ ...label, color: on ? INK : MID, overflowWrap: 'anywhere', lineHeight: 1.35 }}>{lastName(who.name)}</span>
      <span style={{ ...label, color: on ? DIM : FAINT }}>{on ? 'On' : 'Off'}</span>
    </span>
  )
  return (
    <div aria-label={`${p.name} without ${starsText(s.stars)}`}
      style={{ display: 'grid', gridTemplateRows: 'auto 80px', gridAutoFlow: 'column', justifyContent: 'start', alignItems: 'start', columnGap: 12, rowGap: 6, padding: `14px ${PAD}px 0`, borderTop: `1px solid ${RULE}` }}>
      {cast.flatMap((c, i) => [
        ...(i === 1 ? [<span key="wo-tag" />, <span key="wo" style={{ ...label, color: FAINT, alignSelf: 'center' }}>W/O</span>] : []),
        <span key={`t${i}`}>{tag(c.who, c.on, c.size)}</span>,
        <Portrait key={`p${i}`} who={c.who} team={s.team} on={c.on} size={c.size} />
      ])}
    </div>
  )
}

// Minutes with the stars and without (a side too short to rank shows orange) on the
// rule the cast stands on, then the team and seasons behind them.
function Minutes({ s, minRank }) {
  return (
    <>
      <div style={{ display: 'flex', borderTop: `1px solid ${EDGE}` }}>
        {[['With · min', s.on.minutes], ['W/O · min', s.off.minutes]].map(([k, m], i) => {
          const short = !s.ranked && m < minRank
          return (
            <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: `12px ${PAD}px`, borderLeft: i ? `1px solid ${RULE}` : 'none' }}>
              <span style={label}>{k}</span>
              <span title={short ? `Under ${minRank} minutes: too few to rank` : undefined} style={{ fontSize: 22, fontWeight: 600, color: short ? TONES.bad : INK, fontVariantNumeric: 'tabular-nums' }}>{Math.round(m).toLocaleString()}</span>
            </div>
          )
        })}
      </div>
      <span style={{ ...label, color: FAINT, padding: `10px ${PAD}px`, borderTop: `1px solid ${RULE}` }}>{s.team} · {seasonsText(s.seasons)}{s.ranked ? '' : ` · under ${minRank} min a side, not ranked`}</span>
    </>
  )
}

// A row's strip cells: empty, where he is with the stars (hollow), without (filled), the
// same either way, and the stretch between in the change's colour, fading in from faint
// beside the WITH cell to full beside the WITHOUT one (`fade`, 0–1 along the way), so the
// trail shows which way he went.
const trail = (color, fade) => `color-mix(in srgb, ${color} ${Math.round(22 + 78 * fade)}%, ${CELL})`
const stripCell = (state, color, fade = 1) => (
  state === 'with' ? { boxShadow: `inset 0 0 0 1.5px ${MID}` }
    : state === 'without' ? { background: SOFT }
      : state === 'both' ? { background: SOFT, boxShadow: `inset 0 0 0 1.5px ${DIM}` }
        : state === 'between' ? { background: trail(color, fade) }
          : { background: CELL }
)

function Meter({ n }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ width: 4, height: 9, background: i < n ? MID : CELL }} />)}
    </span>
  )
}

function Row({ stat, s, scale, mode }) {
  const k = stat.key
  const d = s.change[k]
  const tone = toneOf(stat, d)
  const r = s.ranks && s.ranks[k]
  const pOn = s.pctl.on[k]
  const pOff = s.pctl.off[k]
  const pctl = mode === 'pctl'
  const cells = stripOf(s.on[k], s.off[k], scale)
  const fades = fadeOf(cells)
  return (
    <div className="ls-row" title={`${stat.label}: ${value(stat, s.on[k])} with his stars (${pctlText(pOn)} pctl), ${value(stat, s.off[k])} without (${pctlText(pOff)} pctl)`}>
      <span style={{ gridArea: 'stat', ...label, color: '#c9c3bc' }}>{stat.label}</span>
      <span className="ls-with" style={{ gridArea: 'with', textAlign: 'right', color: DIM }}>{pctl ? pctlText(pOn) : value(stat, s.on[k])}</span>
      <span className="ls-strip" aria-hidden="true" style={{ gridArea: 'strip' }}>
        {cells.map((state, i) => <span key={i} style={stripCell(state, TONES[tone], fades[i])} />)}
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

const swatch = style => <span style={{ width: 7, height: 11, flex: 'none', ...style }} />
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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: `12px ${PAD}px`, borderBottom: `1px solid ${RULE}` }}>
          <span style={{ ...label, marginRight: 6 }}>Without</span>
          {ls.scenarios.map((x, i) => (
            <Key key={`${x.team}-${x.stars.map(t => t.id).join()}`} on={x === s} onClick={() => setPick(i)}>
              W/O {starsText(x.stars)}{teams.size > 1 ? ` · ${x.team}` : ''}
            </Key>
          ))}
          <span style={{ marginLeft: 'auto' }}><ModeSwitch mode={mode} setMode={setMode} /></span>
        </div>

        <div className="ls-body">
          <div className="ls-side" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ls-side-head" style={{ ...label, display: 'flex', alignItems: 'center', padding: `0 ${PAD}px`, borderBottom: `1px solid ${RULE}` }}>Load × Net · with → without</div>
            <div style={{ padding: `16px ${PAD}px 14px` }}><Plot s={s} scale={ls.scale} /></div>
            <div style={{ display: 'flex', borderTop: `1px solid ${RULE}` }}>
              <Move stat={LOAD} name="Load" s={s} />
              <div style={{ width: 1, background: RULE }} />
              <Move stat={NET} name="Net rtg" s={s} />
            </div>
            <Cast p={p} s={s} />
            <Minutes s={s} minRank={ls.minRank} />
          </div>

          <div className="ls-main">
            <div className="ls-row ls-head">
              <span style={{ gridArea: 'stat', ...label }}>Stat</span>
              <span className="ls-with" style={{ gridArea: 'with', textAlign: 'right', ...label }}>With</span>
              <span style={{ gridArea: 'strip', display: 'flex', justifyContent: 'space-between', ...label, color: FAINT }}><span>Low</span><span className="ls-range-word" style={{ color: DIM }}>League range</span><span>High</span></span>
              <span style={{ gridArea: 'wo', textAlign: 'right', ...label }}>W/O</span>
              <span style={{ gridArea: 'change', textAlign: 'right', ...label }}>Change</span>
              <span className="ls-rank" style={{ gridArea: 'rank', textAlign: 'right', ...label }}>Rank</span>
            </div>
            {STATS.map(stat => <Row key={stat.key} stat={stat} s={s} scale={ls.scale && ls.scale[stat.key]} mode={mode} />)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: `14px ${PAD}px`, fontSize: 9, letterSpacing: '.1em', color: DIM }}>
              <span style={legendItem}>{swatch(stripCell('with'))}WITH</span>
              <span style={legendItem}>{swatch(stripCell('without'))}WITHOUT</span>
              <span style={legendItem}>{swatch({ width: 22, background: `linear-gradient(90deg, ${trail(TONES.good, 0)}, ${TONES.good})` })}BETTER W/O</span>
              <span style={legendItem}>{swatch({ width: 22, background: `linear-gradient(90deg, ${trail(TONES.bad, 0)}, ${TONES.bad})` })}WORSE W/O</span>
              <span>TRAIL FADES IN TOWARD W/O</span>
              <span>VOLUME STATS: BLUE MORE, ORANGE LESS</span>
              <span>1 CELL = 2% OF THE STAT&apos;S LEAGUE RANGE</span>
              <span>#RANK · AMONG EVERY PLAYER&apos;S CHANGE ({ls.minRank}+ MIN EACH WAY)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
