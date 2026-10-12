import { useLayoutEffect, useRef, useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import { STATS, change, fadeOf, lastName, namesText, posOf, seasonsText, starsText, stripOf, toneOf, value } from '../lib/lonestar.js'
import JerseyOverlay from './JerseyOverlay.jsx'
import SectionHeader from './SectionHeader.jsx'
import TeamInitials from './TeamInitials.jsx'

// The Lonestar tab: how he plays when his team's stars sit (thinking-bball
// lib/lonestar.js). Keys pick the stars: his top-Load teammate, or his top two. On the
// left, one continuous panel: Load against Net with the stars and without, who's on and
// off, then the two moves and the minutes each way in one row. On the right, every stat:
// with, a strip across the stat's league range (where he is with them, without them, and
// the stretch between in the change's colour), without, and the change (its rank among
// every player's in the row's tooltip). Positions are on each stat's league range, not
// its percentile, so a big change near the top still reads as big.
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

// An element's width, kept current: the plot draws at the panel's real width.
function useWidth(fallback) {
  const ref = useRef(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// Load against Net on fixed axes, the same for every player, crossing in the middle:
// Load 0 to 80 split at 40 (about where a team's primary option starts; nothing below 0,
// and the league's heaviest stretches fit), Net −25 to +25 split at 0 (better and worse
// on one scale; the rare stretch past ±25 sits on the edge). Drawn 1:1 at the panel's
// width, its frame square (ASPECT) at any width, so its text stays the same size. The
// quadrant names sit outside the frame, above and below it; each axis has its ends'
// values and its name at the split. His move is a vector: a
// hollow square where he is with the stars, a thin shaft and a sharp head whose tip is
// where he is without them, in the colour of his Net change; a move too short to point
// anywhere (under MIN_ARROW px) is a filled square instead. On each pick the shaft draws
// and the head snaps on after it (index.css .ls-draw, .ls-pop).
const LOAD_AXIS = [0, 40, 80]
const NET_AXIS = [-25, 0, 25]
const ASPECT = 1
const MIN_ARROW = 12
const HEAD = { len: 9, half: 4.5 }
function Plot({ s, width: W, skey }) {
  const box = { l: 22, r: 2, t: 12, b: 38 }
  const H = Math.round((W - box.l - box.r) / ASPECT) + box.t + box.b
  const right = W - box.r
  const bottom = H - box.b
  const X = LOAD_AXIS
  const Y = NET_AXIS
  const x = v => box.l + posOf(X, v) * (right - box.l)
  const y = v => box.t + (1 - posOf(Y, v)) * (bottom - box.t)
  const ok = v => v !== null && v !== undefined
  const a = [s.on.load, s.on.net]
  const b = [s.off.load, s.off.net]
  const tone = toneOf(NET, s.change.net)
  const t = { fontFamily: MONO, fontSize: 7.5, letterSpacing: '.08em', fill: DIM }
  const midX = (box.l + right) / 2
  const midY = (box.t + bottom) / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Load ${value(LOAD, a[0])} and Net ${value(NET, a[1])} with his stars, ${value(LOAD, b[0])} and ${value(NET, b[1])} without`} style={{ display: 'block', overflow: 'visible' }}>
      <rect x={box.l} y={box.t} width={right - box.l} height={bottom - box.t} fill="none" stroke={RULE} />
      <line x1={midX} x2={midX} y1={box.t} y2={bottom} stroke={EDGE} strokeDasharray="1 3" />
      <line x1={box.l} x2={right} y1={midY} y2={midY} stroke={EDGE} strokeDasharray="1 3" />
      <text x={box.l} y={box.t - 5} style={t}>LESS LOAD · BETTER NET</text>
      <text x={right} y={box.t - 5} textAnchor="end" style={t}>MORE LOAD · BETTER NET</text>
      <text x={box.l} y={bottom + 11} style={t}>LESS LOAD · WORSE NET</text>
      <text x={right} y={bottom + 11} textAnchor="end" style={t}>MORE LOAD · WORSE NET</text>
      <text x={box.l - 5} y={box.t + 6} textAnchor="end" style={{ ...t, fill: DIM }}>{rounded(Y[2])}</text>
      <text x={box.l - 5} y={midY + 2.5} textAnchor="end" style={{ ...t, fill: DIM }}>NET</text>
      <text x={box.l - 5} y={bottom} textAnchor="end" style={{ ...t, fill: DIM }}>{rounded(Y[0])}</text>
      <text x={box.l} y={bottom + 26} style={{ ...t, fill: DIM }}>{Math.round(X[0])}</text>
      <text x={midX} y={bottom + 26} textAnchor="middle" style={{ ...t, fill: DIM }}>LOAD</text>
      <text x={right} y={bottom + 26} textAnchor="end" style={{ ...t, fill: DIM }}>{Math.round(X[2])}</text>
      {ok(a[0]) && ok(a[1]) && ok(b[0]) && ok(b[1]) && (() => {
        const [ax, ay, bx, by] = [x(a[0]), y(a[1]), x(b[0]), y(b[1])]
        const length = Math.hypot(bx - ax, by - ay)
        if (length < MIN_ARROW) return <rect key={`b-${skey}`} className="ls-pop" x={bx - 5.5} y={by - 5.5} width="11" height="11" fill={SOFT} />
        const color = tone === 'neutral' ? MID : TONES[tone]
        const [ux, uy] = [(bx - ax) / length, (by - ay) / length]
        // The shaft starts clear of the hollow square and stops at the head's base.
        const start = 6
        const shaft = Math.max(0, length - start - HEAD.len)
        return (
          <g key={skey}>
            <line className="ls-draw" x1={ax + ux * start} y1={ay + uy * start} x2={bx - ux * HEAD.len} y2={by - uy * HEAD.len} stroke={color} strokeWidth="1.5" style={{ strokeDasharray: shaft, strokeDashoffset: shaft }} />
            <g transform={`translate(${bx} ${by}) rotate(${(Math.atan2(by - ay, bx - ax) * 180) / Math.PI})`}>
              <polygon className="ls-pop" points={`0,0 ${-HEAD.len},${-HEAD.half} ${-HEAD.len},${HEAD.half}`} fill={color} />
            </g>
          </g>
        )
      })()}
      {ok(a[0]) && ok(a[1]) && <rect x={x(a[0]) - 4.5} y={y(a[1]) - 4.5} width="9" height="9" fill={BG} stroke={MID} strokeWidth="1.5" />}
    </svg>
  )
}

// The cast, centred in the panel whether two or three: names along the top, cut-out
// portraits standing on the rule below (the one over the numbers), each centred in its
// column. He's in colour (on); the stars who sit are smaller, greyscale, dim (off), and on
// each pick fade from colour to that, as if heading to the bench (index.css .ls-bench).
// Each wears the jersey of the stretch's team where his portrait has jersey layers.
function Portrait({ who, team, on, size, layers, jersey }) {
  const [failed, setFailed] = useState(false)
  const dim = on ? {} : { filter: 'grayscale(1)', opacity: 0.45 }
  const place = { display: 'block', alignSelf: 'end', justifySelf: 'center', ...dim }
  const bench = on ? undefined : 'ls-bench'
  return who.headshot && !failed
    ? (
        <span className={bench} style={{ position: 'relative', width: size, height: size, ...place }}>
          <img src={headshotUrl(who.slug, 400, who.headshotVersion, who.headshot)} alt="" onError={() => setFailed(true)}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%' }} />
          {who.headshot === 'jersey' && <JerseyOverlay slug={who.slug} size={400} layers={layers} id={jersey} />}
        </span>
      )
    : <span className={bench} style={{ width: size * 0.7, height: size * 0.7, ...place }}><TeamInitials name={who.name || '?'} team={team} fontSize={12} /></span>
}

function Cast({ p, s }) {
  const cast = [{ who: p, on: true, size: 68 }, ...s.stars.map(t => ({ who: t, on: false, size: 52 }))]
  const layersOf = who => (p.jerseys ? p.jerseys[who.slug] : null)
  // A name is at least 76px wide (one like WESTBROOK on one line), a long one wrapping (at
  // a hyphen, else anywhere), so the cast always fits the panel: GILGEOUS-ALEXANDER and
  // two stars included. The names' row has a fixed height that holds a wrapped name, the
  // names sitting at its foot, so the panel is the same height for every pick.
  const tag = (who, on, size) => (
    <span style={{ display: 'block', width: Math.max(size, 76), textAlign: 'center', ...label, color: on ? INK : MID, overflowWrap: 'anywhere', lineHeight: 1.35 }}>{lastName(who.name)}</span>
  )
  return (
    <div aria-label={`${p.name} on, without ${starsText(s.stars)}`}
      style={{ display: 'grid', gridTemplateRows: '26px 68px', gridAutoFlow: 'column', justifyContent: 'center', alignItems: 'start', columnGap: 12, rowGap: 4, padding: `12px ${PAD}px 0`, borderTop: `1px solid ${RULE}` }}>
      {cast.flatMap((c, i) => [
        ...(i === 1 ? [<span key="wo-tag" />, <span key="wo" style={{ ...label, color: FAINT, alignSelf: 'center' }}>W/O</span>] : []),
        <span key={`t${i}`} style={{ alignSelf: 'end', justifySelf: 'center' }}>{tag(c.who, c.on, c.size)}</span>,
        <Portrait key={`p${i}`} who={c.who} team={s.team} on={c.on} size={c.size} layers={layersOf(c.who)} jersey={s.jersey} />
      ])}
    </div>
  )
}

// The numbers in one row, on the rule the cast stands on: the Load and Net moves (the
// change in its colour, from → to) and the minutes with the stars and without (a side
// too short to rank in orange).
function Numbers({ s, minRank }) {
  const cell = { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 10px', background: BG, minWidth: 0 }
  const big = { fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
  return (
    <div className="ls-nums" style={{ borderTop: `1px solid ${EDGE}` }}>
      {[[LOAD, 'Load'], [NET, 'Net rtg']].map(([stat, name]) => {
        const tone = toneOf(stat, s.change[stat.key])
        return (
          <div key={name} style={cell}>
            <span style={label}>{name}</span>
            <span className="ls-light" style={{ ...big, color: tone === 'neutral' ? MID : TONES[tone] }}>{change(stat, s.change[stat.key])}</span>
            <span style={{ fontSize: 9, color: DIM, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value(stat, s.on[stat.key])} → <span style={{ color: INK }}>{value(stat, s.off[stat.key])}</span></span>
          </div>
        )
      })}
      {[['With min', s.on.minutes], ['W/O min', s.off.minutes]].map(([k, m]) => {
        const short = !s.ranked && m < minRank
        return (
          <div key={k} style={cell}>
            <span style={label}>{k}</span>
            <span className="ls-light" title={short ? `Under ${minRank} minutes: too few to rank` : undefined} style={{ ...big, color: short ? TONES.bad : INK }}>{Math.round(m).toLocaleString()}</span>
          </div>
        )
      })}
    </div>
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

// On each pick the trail lights up cell by cell from where he was with the stars to
// where he is without them, the rows a beat apart (index.css .ls-light; none with
// reduced motion).
const lightUp = (state, i, from, row) => (state === 'empty' || state === 'with'
  ? {}
  : { className: 'ls-light', style: { animationDelay: `${row * 28 + Math.abs(i - Math.max(from, 0)) * 16}ms` } })

function Row({ stat, s, scale, mode, skey, index }) {
  const k = stat.key
  const d = s.change[k]
  const tone = toneOf(stat, d)
  const r = s.ranks && s.ranks[k]
  const pOn = s.pctl.on[k]
  const pOff = s.pctl.off[k]
  const pctl = mode === 'pctl'
  const cells = stripOf(s.on[k], s.off[k], scale)
  const fades = fadeOf(cells)
  const from = cells.indexOf('with')
  const rank = r ? `; his change ranks #${r.rank} of ${r.of} players' (#1 the biggest increase)` : '; too few minutes to rank'
  return (
    <div className="ls-row" title={`${stat.label}: ${value(stat, s.on[k])} with his stars (${pctlText(pOn)} pctl), ${value(stat, s.off[k])} without (${pctlText(pOff)} pctl)${rank}`}>
      <span style={{ gridArea: 'stat', ...label, color: '#c9c3bc' }}>{stat.label}</span>
      <span className="ls-with" style={{ gridArea: 'with', textAlign: 'right', color: DIM }}>{pctl ? pctlText(pOn) : value(stat, s.on[k])}</span>
      <span key={skey} className="ls-strip" aria-hidden="true" style={{ gridArea: 'strip' }}>
        {cells.map((state, i) => {
          const light = lightUp(state, i, from, index)
          return <span key={i} className={light.className} style={{ ...stripCell(state, TONES[tone], fades[i]), ...light.style }} />
        })}
      </span>
      <span style={{ gridArea: 'wo', textAlign: 'right', color: INK, fontWeight: 600 }}>{pctl ? pctlText(pOff) : value(stat, s.off[k])}</span>
      <span style={{ gridArea: 'change', textAlign: 'right', fontSize: 14, fontWeight: 600, color: TONES[tone] }}>{pctl ? signed(pOn === null || pOff === null ? null : pOff - pOn) : change(stat, d)}</span>
    </div>
  )
}

const swatch = style => <span style={{ width: 7, height: 11, flex: 'none', ...style }} />
const legendItem = { display: 'inline-flex', gap: 6, alignItems: 'center' }

// The seasons he has stretches in, oldest first, side by side like RAW | PCTL, each with a
// lamp lit while it counts: the stretches pool over whichever are lit. One always stays
// lit, so the last lit one doesn't switch off.
function Seasons({ seasons, on, toggle }) {
  return (
    <div role="group" aria-label="Seasons" style={{ display: 'flex', border: `1px solid ${EDGE}` }}>
      {seasons.map((season, i) => {
        const lit = on.includes(season)
        const last = lit && on.length === 1
        return (
          <button key={season} type="button" aria-pressed={lit} onClick={() => toggle(season)}
            style={{ height: 28, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 8, background: lit ? '#3a3734' : 'transparent', color: lit ? INK : DIM, border: 'none', borderLeft: i ? `1px solid ${EDGE}` : 'none', fontFamily: MONO, fontSize: 10, fontWeight: lit ? 700 : 500, letterSpacing: '.08em', cursor: last ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
            <span aria-hidden="true" style={{ width: 6, height: 6, flex: 'none', background: lit ? SOFT : 'transparent', boxShadow: `inset 0 0 0 1px ${lit ? SOFT : FAINT}`, transition: 'background .12s' }} />
            {season.replace('-', '–')}
          </button>
        )
      })}
    </div>
  )
}

const starsKey = x => `${x.team}-${x.stars.map(t => t.id).join()}`

export default function Lonestar({ profile: p }) {
  const ls = p.lonestar
  // The seasons first (his latest alone), then the scenario within them: the API's view
  // for each mix of his seasons.
  const seasons = ls.views.filter(v => v.seasons.length === 1).map(v => v.seasons[0]).sort()
  const viewOf = on => ls.views.find(v => v.seasons.length === on.length && v.seasons.every(x => on.includes(x)))
  const [on, setOn] = useState(ls.views[0].seasons)
  const [pick, setPick] = useState(0)
  const [mode, setMode] = useState('raw')
  const [plotRef, plotWidth] = useWidth(304)
  const view = viewOf(on)
  const scenarios = view.scenarios
  const s = scenarios[Math.min(pick, scenarios.length - 1)]
  // Another mix keeps the same stars picked when it has them.
  const toggle = season => {
    const next = on.includes(season) ? on.filter(x => x !== season) : [...on, season]
    if (!next.length) return
    setOn(next)
    setPick(Math.max(0, viewOf(next).scenarios.findIndex(x => starsKey(x) === starsKey(s))))
  }
  // The picked season and scenario: the animated parts remount on it, so each pick replays.
  const skey = `${view.id}-${starsKey(s)}`
  return (
    <section id="sec-lonestar" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader title="Lonestar">
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: '.08em', textTransform: 'uppercase' }}>{p.name} · {seasonsText(ls.seasons)} REG</span>
      </SectionHeader>

      <div className="ls-frame" style={{ border: `1px solid ${RULE}`, fontFamily: MONO }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8, padding: `12px ${PAD}px`, borderBottom: `1px solid ${RULE}` }}>
          <span style={{ ...label, lineHeight: '30px', marginRight: 6 }}>Seasons</span>
          <Seasons seasons={seasons} on={on} toggle={toggle} />
          <span style={{ ...label, lineHeight: '30px', margin: '0 6px 0 14px' }}>Without</span>
          {/* Every mix's keys in one cell, only the lit mix's showing (index.css
              .ls-keys-off). */}
          <div style={{ display: 'grid', flex: '1 1 260px', minWidth: 0 }}>
            {ls.views.map(v => {
              const teams = new Set(v.scenarios.map(x => x.team))
              return (
                <div key={v.id} aria-hidden={v !== view} className={v === view ? undefined : 'ls-keys-off'} style={{ gridArea: '1 / 1', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: 8 }}>
                  {v.scenarios.map((x, i) => (
                    <Key key={starsKey(x)} on={x === s} onClick={() => setPick(i)}>
                      {namesText(x.stars)}{teams.size > 1 ? ` · ${x.team}` : ''}
                    </Key>
                  ))}
                </div>
              )
            })}
          </div>
          <span style={{ marginLeft: 'auto' }}><ModeSwitch mode={mode} setMode={setMode} /></span>
        </div>

        <div className="ls-body">
          <div className="ls-side" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="ls-plot" style={{ padding: `20px ${PAD}px 12px` }}><div ref={plotRef}><Plot s={s} width={plotWidth} skey={skey} /></div></div>
            <Cast key={skey} p={p} s={s} />
            <Numbers key={`n-${skey}`} s={s} minRank={ls.minRank} />
          </div>

          <div className="ls-main">
            <div className="ls-row ls-head">
              <span style={{ gridArea: 'stat', ...label }}>Stat</span>
              <span className="ls-with" style={{ gridArea: 'with', textAlign: 'right', ...label }}>With</span>
              <span style={{ gridArea: 'strip', display: 'flex', justifyContent: 'space-between', ...label, color: FAINT }}><span>Low</span><span className="ls-range-word" style={{ color: DIM }}>League range</span><span>High</span></span>
              <span style={{ gridArea: 'wo', textAlign: 'right', ...label }}>W/O</span>
              <span style={{ gridArea: 'change', textAlign: 'right', ...label }}>Change</span>
            </div>
            {STATS.map((stat, i) => <Row key={stat.key} stat={stat} s={s} scale={ls.scale && ls.scale[stat.key]} mode={mode} skey={skey} index={i} />)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: `12px ${PAD}px`, fontSize: 9, letterSpacing: '.1em', color: DIM }}>
              <span style={legendItem}>{swatch(stripCell('with'))}WITH</span>
              <span style={legendItem}>{swatch(stripCell('without'))}WITHOUT</span>
              <span style={legendItem}>{swatch({ width: 22, background: `linear-gradient(90deg, ${trail(TONES.good, 0)}, ${TONES.good})` })}BETTER W/O</span>
              <span style={legendItem}>{swatch({ width: 22, background: `linear-gradient(90deg, ${trail(TONES.bad, 0)}, ${TONES.bad})` })}WORSE W/O</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
