import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fetchLonestar, headshotUrl } from '../api.js'
import { seasonAges } from '../lib/age.js'
import { MONO } from '../lib/format.js'
import { STATS, change, lastName, namesText, posOf, seasonRanges, starsText, toneOf, value } from '../lib/lonestar.js'
import { seasonsBetween, spanId, spanText } from '../lib/seasons.js'
import JerseyOverlay from './JerseyOverlay.jsx'
import ModeSwitch from './ModeSwitch.jsx'
import Popover from './Popover.jsx'
import SeasonPicker from './SeasonPicker.jsx'
import SectionHeader from './SectionHeader.jsx'
import TeamInitials from './TeamInitials.jsx'

// The Lonestar tab: how he plays when his team's stars sit (thinking-bball
// lib/lonestar.js). Keys pick the stars: his top star teammate, or his top two. On the
// left, one continuous panel: Load against Net with the stars and without, who's on and
// off, then the two moves and the minutes each way in one row. On the right, every stat:
// with, a slider across the stat's league range (where he is with them, and an arrow to
// where he is without them in the change's colour), without, and the change (its rank
// among every player's in the row's tooltip). Positions are on each stat's league range,
// not its percentile, so a big change near the top still reads as big.
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#7a746e' }
const BG = '#262422'
const INK = '#ece8e3'
const SOFT = '#d9d3cc'
const MID = '#b8b2ab'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
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
// width, its frame square (ASPECT) at any width, so its text stays the same size. Each
// quadrant's name sits in its corner of the frame, in two lines; each axis has its ends'
// values and its name at the split, smaller, Net's name running up its axis. His move is
// a vector: a
// hollow square where he is with the stars, a thin shaft and a sharp head whose tip is
// where he is without them, in the colour of his Net change; a move too short to point
// anywhere (under MIN_ARROW px) is a filled square instead. On each pick the shaft draws
// and the head snaps on after it (index.css .ls-draw, .ls-pop). The quadrant under the
// pointer lights up, outlined, its name bright and the other three's dimmed.
const LOAD_AXIS = [0, 40, 80]
const NET_AXIS = [-25, 0, 25]
const ASPECT = 1
const MIN_ARROW = 12
const HEAD = { len: 9, half: 4.5 }
// Left to right, top to bottom.
const QUADRANTS = [['LESS LOAD', 'BETTER NET'], ['MORE LOAD', 'BETTER NET'], ['LESS LOAD', 'WORSE NET'], ['MORE LOAD', 'WORSE NET']]
// A quadrant name's distance from its corner, and its line spacing.
const INSET = 7
const LINE = 11
function Plot({ s, width: W, skey }) {
  const [lit, setLit] = useState(null)
  const box = { l: 22, r: 2, t: 6, b: 18 }
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
  const t = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', fill: DIM }
  const axis = { ...t, fontSize: 7.5 }
  const midX = (box.l + right) / 2
  const midY = (box.t + bottom) / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Load ${value(LOAD, a[0])} and Net ${value(NET, a[1])} with his stars, ${value(LOAD, b[0])} and ${value(NET, b[1])} without`} style={{ display: 'block', overflow: 'visible' }}>
      {QUADRANTS.map((name, i) => (
        <rect key={name.join()} x={i % 2 ? midX : box.l} y={i > 1 ? midY : box.t} width={midX - box.l} height={midY - box.t} fill={INK} fillOpacity={0.05} stroke={EDGE}
          style={{ opacity: lit === i ? 1 : 0, transition: 'opacity .15s' }} />
      ))}
      <rect x={box.l} y={box.t} width={right - box.l} height={bottom - box.t} fill="none" stroke={RULE} />
      <line x1={midX} x2={midX} y1={box.t} y2={bottom} stroke={EDGE} strokeDasharray="1 3" />
      <line x1={box.l} x2={right} y1={midY} y2={midY} stroke={EDGE} strokeDasharray="1 3" />
      {QUADRANTS.map((name, i) => {
        const tx = i % 2 ? right - INSET : box.l + INSET
        return (
          <text key={name.join()} x={tx} y={i > 1 ? bottom - INSET - LINE : box.t + INSET + 6.5} textAnchor={i % 2 ? 'end' : 'start'}
            style={{ ...t, fill: lit === null ? DIM : lit === i ? INK : FAINT, fontWeight: lit === i ? 700 : 400, transition: 'fill .15s' }}>
            {name.map((line, k) => <tspan key={line} x={tx} dy={k ? LINE : 0}>{line}</tspan>)}
          </text>
        )
      })}
      <text x={box.l - 5} y={box.t + 5.5} textAnchor="end" style={axis}>{rounded(Y[2])}</text>
      <text transform={`translate(${box.l - 5} ${midY}) rotate(-90)`} textAnchor="middle" style={axis}>NET</text>
      <text x={box.l - 5} y={bottom} textAnchor="end" style={axis}>{rounded(Y[0])}</text>
      <text x={box.l} y={bottom + 13} style={axis}>{Math.round(X[0])}</text>
      <text x={midX} y={bottom + 13} textAnchor="middle" style={axis}>LOAD</text>
      <text x={right} y={bottom + 13} textAnchor="end" style={axis}>{Math.round(X[2])}</text>
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
      {/* On top, so the arrow and lines under the pointer don't break the hover. */}
      <rect x={box.l} y={box.t} width={right - box.l} height={bottom - box.t} fill="transparent" onPointerLeave={() => setLit(null)}
        onPointerMove={e => {
          const r = e.currentTarget.getBoundingClientRect()
          setLit((e.clientY - r.top > r.height / 2 ? 2 : 0) + (e.clientX - r.left > r.width / 2 ? 1 : 0))
        }} />
    </svg>
  )
}

// The cast, centred in the panel whether two or three: names along the top, cut-out
// portraits standing on the rule below (the one over the numbers), each centred in its
// column. He's in colour (on); the stars who sit are smaller, greyscale, dim (off), and on
// each pick fade from colour to that, as if heading to the bench (index.css .ls-bench).
// Each wears the jersey of the stretch's team where his portrait has jersey layers. The
// art runs off its square's sides where shoulders are wide, so the bust's lower half fades
// out toward the sides (FADE, as the bio card's portrait fades) instead of ending in a
// straight slice; the middle stays solid down to the rule. Drawn small (the list of a long
// span's stretches), it loads the 100px images.
const FADE = 'linear-gradient(#000 0 50%, transparent 85%), linear-gradient(90deg, transparent 0, #000 24%, #000 76%, transparent 100%)'
export function Portrait({ who, team, on, size, layers, jersey, order = 0 }) {
  const [failed, setFailed] = useState(false)
  const dim = on ? {} : { filter: 'grayscale(1) contrast(1.2)', opacity: 0.6 }
  const place = { display: 'block', alignSelf: 'end', justifySelf: 'center', '--i': order, ...dim }
  const bench = on ? undefined : 'ls-bench'
  const px = size > 50 ? 400 : 100
  return who.headshot && !failed
    ? (
        <span className={bench} style={{ position: 'relative', width: size, height: size, WebkitMaskImage: FADE, maskImage: FADE, ...place }}>
          <img src={headshotUrl(who.slug || who.face, px, who.headshotVersion, who.headshot)} alt="" onError={() => setFailed(true)}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', objectPosition: '50% 100%' }} />
          {who.headshot === 'jersey' && <JerseyOverlay slug={who.slug} size={px} layers={layers} id={jersey} />}
        </span>
      )
    : <span className={bench} style={{ width: size * 0.7, height: size * 0.7, ...place }}><TeamInitials name={who.name || '?'} team={team} fontSize={12} /></span>
}

function Cast({ p, s }) {
  const sat = benched(s)
  const layersOf = who => (p.jerseys ? p.jerseys[who.slug] : null)
  // A name is at least 76px wide (one like WESTBROOK on one line), a long one wrapping (at
  // a hyphen, else anywhere), so the cast always fits the panel: GILGEOUS-ALEXANDER and
  // two stars included. ALL's stars stand together as one cluster, overlapping (CLUSTER at
  // most), under one tag: their names, or the first and how many more. The names' row has a
  // fixed height that holds a wrapped name, the names sitting at its foot, so the panel is
  // the same height for every pick.
  // The sitting stars' tag types itself in, a letter a step (index.css .ls-type).
  const tag = (text, on, width = 76) => (
    <span className={on ? undefined : 'ls-type'} style={{ display: 'block', width, textAlign: 'center', ...label, color: on ? INK : MID, overflowWrap: 'anywhere', lineHeight: 1.35, '--n': text.length }}>{text}</span>
  )
  const cols = [{ tag: tag(lastName(p.name), true), face: <Portrait who={p} team={s.team} on size={68} layers={layersOf(p)} jersey={s.jersey} /> }]
  if (s.all) {
    cols.push({
      tag: tag(sat.length <= 3 ? sat.map(b => lastName(b.who.name)).join(' · ') : `${lastName(sat[0].who.name)} +${sat.length - 1}`, false, 150),
      face: (
        <span style={{ display: 'flex', alignItems: 'flex-end', alignSelf: 'end', justifySelf: 'center' }}>
          {sat.slice(0, CLUSTER).map((b, k) => (
            <span key={b.who.id} style={{ display: 'grid', width: 46, height: 46, marginLeft: k ? -16 : 0 }}>
              <Portrait who={b.who} team={b.team} on={false} size={46} layers={layersOf(b.who)} jersey={b.jersey} order={k} />
            </span>
          ))}
        </span>
      )
    })
  } else {
    sat.forEach((b, k) => cols.push({ tag: tag(lastName(b.who.name), false), face: <Portrait who={b.who} team={b.team} on={false} size={52} layers={layersOf(b.who)} jersey={b.jersey} order={k} /> }))
  }
  return (
    <div aria-label={`${p.name} on, without ${starsText(s.stars)}`}
      style={{ display: 'grid', gridTemplateRows: '26px 68px', gridAutoFlow: 'column', justifyContent: 'center', alignItems: 'start', columnGap: 12, rowGap: 4, padding: `12px ${PAD}px 0`, borderTop: `1px solid ${RULE}` }}>
      {cols.flatMap((c, i) => [
        ...(i === 1 ? [<span key="wo-tag" />, <span key="wo" className="ls-wo" style={{ ...label, color: FAINT, alignSelf: 'center' }}>W/O</span>] : []),
        <span key={`t${i}`} style={{ alignSelf: 'end', justifySelf: 'center' }}>{c.tag}</span>,
        <span key={`p${i}`} style={{ display: 'contents' }}>{c.face}</span>
      ])}
    </div>
  )
}
const CLUSTER = 4

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

// A row's slider, the plot's vector in one dimension: a hairline ruler across the stat's
// league range (ticks at the quarters, longer at the ends), a hollow square where he is
// with the stars and a sharp head where he is without them, joined by a shaft in the
// change's colour (grey when it shows as 0.0); with `trail`, the square is outlined in that
// colour and the shaft fades in from it (Footprint's REMOVE BEST line). Placed in percentages, so it fits any
// column width. On each pick the shaft grows from the square and the head snaps on, the
// rows a beat apart (index.css .ls-grow, .ls-pop; none with reduced motion).
const SQUARE = 9
const TICKS = [0, 25, 50, 75, 100]
const head = (dir, color) => ({ width: HEAD.len, height: HEAD.half * 2, flex: 'none', background: color, clipPath: dir > 0 ? 'polygon(0 0, 100% 50%, 0 100%)' : 'polygon(100% 0, 0 50%, 100% 100%)' })
const at = (left, size) => ({ position: 'absolute', left, top: `calc(50% - ${size / 2}px)` })
const pct = x => `${+(x * 100).toFixed(2)}%`

export function Slider({ on, off, scale, color, index, trail }) {
  const a = posOf(scale, on)
  const b = posOf(scale, off)
  const dir = a !== null && b !== null && b < a ? -1 : 1
  const delay = s => ({ animationDelay: `${(s + index * 0.028).toFixed(3)}s` })
  // From the square's edge to the head's base, never negative.
  const gap = SQUARE / 2 + HEAD.len
  // The head's tip at where he is without them; a move too short to clear the square puts
  // the head against the square's side instead of over it, still pointing the way he went.
  const headLeft = a === null ? `calc(${pct(b)} - ${HEAD.len / 2}px)`
    : dir > 0 ? `max(calc(${pct(b)} - ${HEAD.len}px), calc(${pct(a)} + ${SQUARE / 2}px))`
      : `min(${pct(b)}, calc(${pct(a)} - ${gap}px))`
  return (
    <span className="ls-slider" aria-hidden="true" style={{ gridArea: 'strip' }}>
      <span style={{ ...at(0, 1), right: 0, height: 1, background: EDGE }} />
      {TICKS.map(t => {
        const end = t === 0 || t === 100
        return <span key={t} style={{ ...at(`calc(${t}% - 0.5px)`, end ? 9 : 5), width: 1, height: end ? 9 : 5, background: EDGE }} />
      })}
      {a !== null && b !== null && (
        <span className="ls-grow" style={{
          ...at(dir > 0 ? `calc(${pct(a)} + ${SQUARE / 2}px)` : `calc(${pct(b)} + ${HEAD.len}px)`, 2),
          width: `max(0px, calc(${pct(Math.abs(b - a))} - ${gap}px))`, height: 2, background: trail ? `linear-gradient(to ${dir > 0 ? 'right' : 'left'}, ${trail}, ${color})` : color,
          transformOrigin: dir > 0 ? 'left' : 'right', ...delay(0.1)
        }} />
      )}
      {a !== null && <span style={{ ...at(`calc(${pct(a)} - ${SQUARE / 2}px)`, SQUARE), width: SQUARE, height: SQUARE, boxSizing: 'border-box', border: `1.5px solid ${trail || MID}`, background: BG }} />}
      {b !== null && <span className="ls-pop" style={{ ...at(headLeft, HEAD.half * 2), ...head(dir, color), ...delay(0.45) }} />}
    </span>
  )
}

function Row({ stat, s, scale, mode, skey, index }) {
  const k = stat.key
  const d = s.change[k]
  const tone = toneOf(stat, d)
  const r = s.ranks && s.ranks[k]
  const pOn = s.pctl.on[k]
  const pOff = s.pctl.off[k]
  const pctl = mode === 'pctl'
  const rank = r ? `; his change ranks #${r.rank} of ${r.of} players' (#1 the biggest increase)` : '; too few minutes to rank'
  return (
    <div className="ls-row" title={`${stat.label}: ${value(stat, s.on[k])} with his stars (${pctlText(pOn)} pctl), ${value(stat, s.off[k])} without (${pctlText(pOff)} pctl)${rank}`}>
      <span style={{ gridArea: 'stat', ...label, color: '#c9c3bc' }}>{stat.label}</span>
      <span className="ls-with" style={{ gridArea: 'with', textAlign: 'right', color: DIM }}>{pctl ? pctlText(pOn) : value(stat, s.on[k])}</span>
      <Slider key={skey} on={s.on[k]} off={s.off[k]} scale={scale} color={tone === 'neutral' ? MID : TONES[tone]} index={index} />
      <span style={{ gridArea: 'wo', textAlign: 'right', color: INK, fontWeight: 600 }}>{pctl ? pctlText(pOff) : value(stat, s.off[k])}</span>
      <span style={{ gridArea: 'change', textAlign: 'right', fontSize: 14, fontWeight: 600, color: TONES[tone] }}>{pctl ? signed(pOn === null || pOff === null ? null : pOff - pOn) : change(stat, d)}</span>
    </div>
  )
}

const legendItem = { display: 'inline-flex', gap: 6, alignItems: 'center' }
// Better points right and worse left, as most stats move.
const legendArrow = (color, dir) => {
  const shaft = <span style={{ width: 12, height: 2, background: color }} />
  return <span style={{ display: 'inline-flex', alignItems: 'center' }}>{dir < 0 && <span style={head(-1, color)} />}{shaft}{dir > 0 && <span style={head(1, color)} />}</span>
}

const starsKey = x => (x.all ? `all-${x.kind}` : `${x.team}-${x.stars.map(t => t.id).join()}`)
// Who sits in a stretch, each in his own stretch's team and jersey: ALL's from its parts,
// a star once.
const benched = x => {
  const seen = new Set()
  return (x.parts || [x]).flatMap(part => part.stars.map(t => ({ who: t, team: part.team, jersey: part.jersey })))
    .filter(b => !seen.has(b.who.id) && seen.add(b.who.id))
}

// More than one stretch: one box, as the season picker's, naming who sits (ALL: the stars
// it combines, joined by +), opening a list of them in two sections, without top star and
// without top two stars: most minutes without first (his sample in it), then ALL as the
// section's total, under a heavier rule, saying what it combines (cut short, in full on
// hover, so the panel keeps its width); its minutes are the rows' above summed. Each row
// has its stars' faces in the stretch's jersey, standing on the row's rule as the cast
// stands on its own, in colour but on the picked row, greyed as the cast's stars who sit
// are; its team and seasons under the names; a bar for his minutes without; and his
// minutes with and without, the two samples it compares. On a phone the names get the
// room: two faces, no bar, narrower minutes (index.css .ls-stretch). The
// picked row is lit as the year strip's pick is. A click picks and closes; the arrow keys
// move the pick with the panel open, the module following behind it; Enter closes.
const SECTIONS = [['one', 'Without top star'], ['two', 'Without top two stars']]
function StretchList({ scenarios, s, pick, names, meta, text, layersOf }) {
  const at = scenarios.indexOf(s)
  const sections = SECTIONS.map(([kind, title]) => ({
    kind, title,
    rows: scenarios.map((x, i) => i).filter(i => scenarios[i].kind === kind)
      .sort((a, b) => (scenarios[a].all ? 1 : 0) - (scenarios[b].all ? 1 : 0) || scenarios[b].off.minutes - scenarios[a].off.minutes)
  })).filter(sec => sec.rows.length)
  const order = sections.flatMap(sec => sec.rows)
  return (
    <Popover name={`Without: ${text(s)}`} minWidth={300} trigger={text(s)}>
      {close => <Stretches scenarios={scenarios} sections={sections} order={order} at={at} pick={pick} close={close} names={names} meta={meta} layersOf={layersOf} />}
    </Popover>
  )
}

// The list in the open panel: it takes the arrow keys as it opens, the pick kept in view.
// A row shows up to FACES faces (ALL's: three and how many more), the column as wide as
// the most any row shows.
const FACE = 34
const FACES = 4
// The minutes columns, with and without, wide enough for their heads.
const MIN_COL = 56
function Stretches({ scenarios, sections, order, at, pick, close, names, meta, layersOf }) {
  const list = useRef(null)
  useEffect(() => {
    list.current.focus({ preventScroll: true })
    list.current.querySelector('[aria-selected="true"]').scrollIntoView({ block: 'nearest' })
  }, [at])
  const most = Math.max(...scenarios.map(x => x.off.minutes))
  const slots = Math.min(FACES, Math.max(...scenarios.map(x => benched(x).length)))
  const row = i => {
    const x = scenarios[i]
    const on = i === at
    const sat = benched(x)
    return (
      <div key={starsKey(x)} role="option" aria-selected={on} className="ls-stretch" onClick={() => { pick(i); close() }}
        style={{ display: 'flex', alignItems: 'center', gap: 14, height: 42, padding: '0 10px 0 12px', borderTop: x.all ? `1px solid ${FAINT}` : undefined, borderBottom: `1px solid ${RULE}`, background: on ? '#3d3a37' : undefined, boxShadow: on ? 'inset 2px 0 0 var(--accent)' : 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        <span aria-hidden="true" className="ls-stretch-faces" style={{ flex: 'none', alignSelf: 'flex-end', display: 'flex', alignItems: 'flex-end', width: FACE + (slots - 1) * (FACE - 10), filter: on ? 'grayscale(1) contrast(1.2)' : 'none', opacity: on ? 0.62 : 1 }}>
          {(sat.length > FACES ? sat.slice(0, FACES - 1) : sat).map((b, k) => (
            <span key={b.who.id} style={{ display: 'grid', width: FACE, height: FACE, marginLeft: k ? -10 : 0 }}>
              <Portrait who={b.who} team={b.team} on size={FACE} layers={layersOf(b.who)} jersey={b.jersey} />
            </span>
          ))}
          {sat.length > FACES && <span style={{ ...label, color: MID, alignSelf: 'center', marginLeft: 4 }}>+{sat.length - FACES + 1}</span>}
        </span>
        <span style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: on ? INK : MID, fontWeight: on || x.all ? 700 : 500 }}>{x.all ? 'All combined' : names(x)}</span>
          {meta(x) && <span title={meta(x)} style={{ fontSize: 8.5, color: DIM, overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta(x)}</span>}
        </span>
        <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span className="ls-stretch-bar" style={{ width: 56, height: 2, background: RULE }}><span style={{ display: 'block', height: 2, width: `${(100 * x.off.minutes) / most}%`, background: on ? 'var(--accent)' : FAINT }} /></span>
          <span className="ls-min" style={{ width: MIN_COL, textAlign: 'right', color: DIM }}>{Math.round(x.on.minutes).toLocaleString()}</span>
          <span className="ls-min" style={{ width: MIN_COL, textAlign: 'right', color: on ? INK : MID }}>{Math.round(x.off.minutes).toLocaleString()}</span>
        </span>
      </div>
    )
  }
  return (
    <div ref={list} role="listbox" aria-label="Stars without" tabIndex={0} style={{ outline: 'none', display: 'flex', flexDirection: 'column', width: 'min(560px, calc(100vw - 58px))' }}
      onKeyDown={e => {
        const step = { ArrowDown: 1, ArrowUp: -1 }[e.key]
        if (e.key === 'Enter') return close()
        if (!step) return
        e.preventDefault()
        pick(order[Math.min(order.length - 1, Math.max(0, order.indexOf(at) + step))])
      }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 10px 6px 12px' }}>
        <span className="ls-min" style={{ ...label, width: MIN_COL, textAlign: 'right' }}>With<span className="ls-min-unit"> min</span></span>
        <span className="ls-min" style={{ ...label, width: MIN_COL, textAlign: 'right' }}>W/O<span className="ls-min-unit"> min</span></span>
      </div>
      <div style={{ maxHeight: 'min(440px, 62vh)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${EDGE} transparent` }}>
        {sections.map(sec => (
          <div key={sec.kind} role="group" aria-label={sec.title}>
            <div style={{ ...label, color: SOFT, padding: '12px 12px 6px', borderBottom: `1px solid ${EDGE}` }}>{sec.title}</div>
            {sec.rows.map(row)}
          </div>
        ))}
      </div>
    </div>
  )
}

// The tab fetches its views (every season and span) when opened; the profile has only
// his seasons, for the header.
export default function Lonestar({ profile: p }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    let live = true
    fetchLonestar(p.slug).then(d => live && setDoc(d), () => live && setDoc(false))
    return () => { live = false }
  }, [p.slug])
  const seasons = p.lonestar.seasons
  return (
    <section id="sec-lonestar" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader title="Lonestar">
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: '.08em', textTransform: 'uppercase' }}>{p.name} · {spanText(seasons[0], seasons[seasons.length - 1])} REG</span>
      </SectionHeader>
      {doc
        ? <Frame p={p} ls={doc} />
        : <div className="ls-frame" style={{ border: `1px solid ${RULE}`, minHeight: 680, display: 'grid', placeItems: 'center', fontFamily: MONO }}><span style={label}>{doc === false ? 'Unavailable' : 'Loading'}</span></div>}
    </section>
  )
}

function Frame({ p, ls }) {
  // The span first (his last two seasons, or the first with something to offer), then the
  // scenario within it. A season or span with nothing to offer has no view: the module says
  // so in place of its body.
  const viewOf = (from, to) => ls.views.find(v => v.id === spanId(from, to))
  const [span, setSpan] = useState(() => {
    const [a, b] = ls.seasons.slice(-2)
    if (b && viewOf(a, b)) return { from: a, to: b }
    const first = ls.views[0].seasons
    return { from: first[0], to: first[first.length - 1] }
  })
  const [pick, setPick] = useState(0)
  const [mode, setMode] = useState('raw')
  // The picker by age (his age in each season) or by year.
  const [byAge, setByAge] = useState(false)
  const ageOf = seasonAges(p)
  const [plotRef, plotWidth] = useWidth(304)
  const view = viewOf(span.from, span.to)
  const scenarios = view ? view.scenarios : []
  const s = scenarios[Math.min(pick, scenarios.length - 1)]
  const teams = new Set(scenarios.map(x => x.team).filter(Boolean))
  // Another span opens on its top star combined (ALL) where it has one, else on the same
  // stars where it has them, else its first stretch; a view opens the same way, the
  // server putting ALL first.
  const choose = (from, to) => {
    if (from === span.from && to === span.to) return
    setSpan({ from, to })
    const next = viewOf(from, to)
    if (!next) return setPick(0)
    const all = next.scenarios.findIndex(x => x.all && x.kind === 'one')
    setPick(all >= 0 ? all : Math.max(0, s ? next.scenarios.findIndex(x => starsKey(x) === starsKey(s)) : 0))
  }
  // The picked span and scenario: the animated parts remount on it, so each pick replays.
  const skey = view ? `${view.id}-${starsKey(s)}` : 'none'
  const n = view ? view.seasons.length : seasonsBetween(span.from, span.to).filter(x => ls.seasons.includes(x)).length
  // A stretch's team (a span with several) and seasons (fewer than the span's). ALL: the
  // stars it combines, joined by + (its parts, a pair as "Paul & Gordon").
  const combined = x => x.parts.map(part => starsText(part.stars))
  const meta = x => (x.all
    ? x.parts.map(part => `${starsText(part.stars)} ${seasonRanges(part.seasons)}`).join(' · ')
    : [teams.size > 1 && x.team, x.seasons.length < n && seasonRanges(x.seasons)].filter(Boolean).join(' · '))
  const names = x => namesText(x.stars)
  // A season under the minutes floor has no row but still his team (bio).
  const teamsOf = season => (p.seasons.find(s => s.season === season) || {}).teams || (p.bio.teamsBySeason || {})[season]
  // The box: who sits. ALL past three parts: the first two and how many more.
  const text = x => {
    if (!x.all) return [names(x), meta(x)].filter(Boolean).join(' · ')
    const parts = combined(x)
    return parts.length > 3 ? `${parts.slice(0, 2).join(' + ')} + ${parts.length - 2} more` : parts.join(' + ')
  }
  return (
    <div className="ls-frame" style={{ border: `1px solid ${RULE}`, fontFamily: MONO }}>
      {/* One row of fixed height, so the module's never changes: the span (its strip in a
          panel), the stars (a box opening the list of them, or the one stretch there is),
          RAW | PCTL. A stretch from fewer of the span's seasons carries its seasons.
          Narrow, the stars take a row of their own (index.css .ls-bar). */}
      <div className="ls-bar" style={{ padding: `12px ${PAD}px`, borderBottom: `1px solid ${RULE}` }}>
        <SeasonPicker seasons={ls.seasons} from={span.from} to={span.to} n={n} pick={choose} ages={ageOf && { on: byAge, set: setByAge, of: ageOf }} teamsOf={teamsOf}
          dimTitle={season => ((teamsOf(season) || []).length ? 'No qualifying high-load teammates' : null)} />
        <div className="ls-without">
          <span style={{ ...label, margin: '0 6px 0 10px' }}>Without</span>
          {scenarios.length > 1
            ? <StretchList scenarios={scenarios} s={s} pick={setPick} names={names} meta={meta} text={text} layersOf={t => (p.jerseys ? p.jerseys[t.slug] : null)} />
            : s ? <Key on>{text(s)}</Key> : <span style={{ ...label, color: FAINT }}>—</span>}
        </div>
        <span style={{ marginLeft: 'auto', flex: 'none' }}><ModeSwitch mode={mode} setMode={setMode} /></span>
      </div>

      {!s ? (
        <div style={{ minHeight: 560, display: 'grid', placeItems: 'center', padding: 24 }}>
          <p style={{ ...label, margin: 0, maxWidth: '52ch', textAlign: 'center', lineHeight: 1.8, color: MID }}>
            No star sat enough here to compare. Each option needs at least 200 minutes with the star and 200 without. Add seasons to the span.
          </p>
        </div>
      ) : (
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
              <span style={legendItem}><span style={{ width: SQUARE, height: SQUARE, flex: 'none', boxSizing: 'border-box', border: `1.5px solid ${MID}` }} />WITH</span>
              <span style={legendItem}><span style={head(1, MID)} />WITHOUT</span>
              <span style={legendItem}>{legendArrow(TONES.good, 1)}BETTER W/O</span>
              <span style={legendItem}>{legendArrow(TONES.bad, -1)}WORSE W/O</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
