import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFootprint, fetchLonestar, fetchPlayers, fetchProfile, headshotUrl } from '../api.js'
import { swingText, toneOf, topPlaceOf, unitOf, worstText } from '../lib/footprint.js'
import { rowAge } from '../lib/age.js'
import { MONO, col, fmt } from '../lib/format.js'
import { pctlOf, valueOf } from '../lib/leaderboard.js'
import { rollingStat } from '../lib/span.js'
import { starsText } from '../lib/lonestar.js'
import { jerseysOver, splitIds } from '../lib/jersey.js'
import { asset } from '../lib/static.js'
import { initials } from '../lib/teams.js'
import { useSeasonType } from '../useSeasonType.js'
import FootprintGlyph from './FootprintGlyph.jsx'
import JerseyOverlay from './JerseyOverlay.jsx'
import SplitJersey from './SplitJersey.jsx'

// A player's card on the Leaderboard, in the scatter's place: a snapshot of his profile
// for the season or span on show. Its head is a panel: his portrait,
// name, team, position, age, games and minutes; his footprint as a line of the Footprint
// tab's icons (those whose swing clears the noise, in its colour, with the tab's place
// ribbon; hover one for its swing); and three numbers (the stat the table is sorted by,
// then BPM, Load and rTS% as room allows) with their percentiles. Then his percentiles across the
// profile's headline stats; two charts, his career (the stat the table is sorted by, else
// BPM, as a moving average against the league's, as his profile charts it) and Lonestar's that season (Load and Net with both
// his stars on and off); and his best and most-used two- and three-man units that
// season. The career and units come from his profile, Lonestar and Footprint from their
// own documents, all fetched on opening. Its charts move: the percentile bars wipe in, the career dots
// pop in and Lonestar's arrow draws (index.css).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const BLUE = '#8fb0e6'
const ORANGE = '#fa962a'
// The Footprint tab's ribbon colors: gold for #1, silver for #2 to #10; its mark for the
// 10 worst, a reddish orange.
const GOLD = '#d4af37'
const SILVER = '#c3c9cf'
const WORST = '#ef5b30'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
// The headline stats, as on his profile's percentile card: impact, offense, defense.
const CARD_STATS = ['BPM', 'Net On/Off', 'Load', 'Box Creation', 'Pts / 75', 'rTS%', 'Passer Rating', 'cTOV%', 'DRTG On', 'Def FGA Diff%']
// Lonestar's small chart: its frame (a viewBox; it scales to the card's half-width) and
// its tab's axes (Load 0–80 split at 40, Net −25 to +25 split at 0). The career chart is
// the profile's season chart's (lib/chart.js).
const CW = 236
const CH = 188
const CM = { l: 20, r: 6, t: 8, b: 16 }
const LOAD = [0, 80]
const NET_AXIS = [-25, 25]
// The career line's window: a 3-season moving average, as the profile's ROLLING 3-YR, when
// it gives at least ROLL points; plain seasons otherwise. Its up axis spans at least
// MIN_BPM for BPM (a fifth of the largest value for another stat), and the profile's
// shading marks the gap to the league (lib/chart.js).
const ROLL = 3
const MIN_BPM = 6
const BETTER = 'rgba(89,126,193,.16)'
const WORSE = 'rgba(250,150,42,.16)'
const fit = (vs, least) => {
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const pad = Math.max((least - (hi - lo)) / 2, (hi - lo) * 0.12)
  return [lo - pad, hi + pad]
}
const careerWindow = (p, l) => (rollingStat(p, l, ROLL).vals.filter(Boolean).length >= ROLL ? ROLL : 1)
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name

function Section({ title, children, right }) {
  return (
    <div style={{ padding: '9px 14px', borderTop: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ ...label, color: '#b8b2ab' }}>{title}</span>
        {right && <span style={{ ...label, color: FAINT }}>{right}</span>}
      </div>
      {children}
    </div>
  )
}

// A view in a document with one per season and span (Lonestar's, Footprint's): the
// season's, or over a span the one from his own first to last season in it.
const viewIn = (d, season, span) => {
  if (!d) return null
  const ss = span ? d.seasons.filter(s => s >= span.from && s <= span.to) : [season]
  const id = ss.length > 1 ? `${ss[0]}..${ss[ss.length - 1]}` : ss[0]
  return d.views.find(v => v.id === id) || null
}
// His footprint that season or span: the Footprint tab's icons for the swings that clear
// the noise, in the swing's colour (blue a lift, orange a cost, ink a style effect; red
// when among the league's 10 worst), with the tab's ribbon on a top-10 place.
const TONES = { good: BLUE, bad: ORANGE, neutral: INK }
const footprintOf = view => (view ? view.effects.filter(e => e.status === 'notable') : []).map(e => {
  const place = topPlaceOf(e)
  return { l: e.effect, e, tone: place && place.worst ? WORST : TONES[toneOf(e)], place }
})

// The card's head: his portrait beside, in small type, his numbers (team, position, age,
// games, minutes) over his name; under them his footprint, the Footprint tab's icons for
// the swings that clear the noise, on one line as large as ICON_MAX while they fit (hovering
// one reads it out in the bio line's place); and three numbers in a light grid, each with
// its percentile on a ten-step meter. It comes in on opening: the portrait settles out of
// grey, the name wipes in, the icons light one after another (their ribbons dropping on),
// and the numbers count up as their meters fill (index.css .pc-*).
const ICON_MAX = 32
const small = { ...label, fontSize: 8.5, letterSpacing: '.14em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// A number counting up to its value, eased out over COUNT_MS after `delay` ms (the effect
// writes its text, so the count runs between renders); straight to it with reduced motion.
const COUNT_MS = 700
function CountUp({ stat, value, delay }) {
  const el = useRef(null)
  useLayoutEffect(() => {
    const node = el.current
    if (value === null || value === undefined || still()) {
      node.textContent = fmt(stat, value)
      return undefined
    }
    node.textContent = fmt(stat, 0)
    let raf = 0
    const start = performance.now() + delay
    const tick = now => {
      const t = Math.min(1, Math.max(0, (now - start) / COUNT_MS))
      node.textContent = fmt(stat, t < 1 ? value * (1 - (1 - t) ** 3) : value)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stat, value, delay])
  return <span ref={el} />
}

// A percentile on ten steps, lit in its color one after another from `delay` ms.
function Meter({ pc, delay }) {
  const lit = pc === null ? 0 : Math.max(1, Math.round(pc / 10))
  return (
    <span aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < lit ? 'pc-step' : undefined} style={{ height: 4, background: i < lit ? col(pc) : '#34312e', '--d': `${delay + i * 40}ms` }} />)}
    </span>
  )
}

// The icons, the one under the pointer (`at`) bright as the rest dim. A few (up to LEGEND)
// share the line, each with its name and swing beside it; more, the icons alone, as large
// as ICON_MAX while they fit (their swings in the readout).
const LEGEND = 4
function Icons({ items, at, setAt }) {
  const legend = items.length <= LEGEND
  return (
    <div style={{ display: 'grid', gridTemplateColumns: legend ? `repeat(${items.length}, minmax(0, 1fr))` : `repeat(${items.length}, minmax(0, ${ICON_MAX}px))`, columnGap: legend ? 16 : 10, alignItems: 'center' }} onMouseLeave={() => setAt(null)}>
      {items.map((i, k) => {
        const dim = { opacity: at && at !== i.l ? 0.3 : 1, transition: 'opacity .15s' }
        return (
          <span key={i.l} className="pc-icon" onMouseEnter={() => setAt(i.l)} aria-label={`${i.l}: ${swingText(i.e.diff)}${i.place ? `, #${i.place.place} ${i.place.worst ? 'from the bottom of' : 'in'} the league` : ''}`}
            style={{ '--d': `${240 + k * 55}ms`, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, color: i.tone }}>
            <span style={{ ...dim, position: 'relative', flex: 'none', width: legend ? 30 : '100%', aspectRatio: '1 / 1' }}>
              <FootprintGlyph stat={i.e.key} size="100%" />
              {i.place && !i.place.worst && (
                // The tab's place ribbon, hung over the icon's top-right corner.
                <span className="pc-ribbon" style={{ position: 'absolute', top: -5, right: -6, width: 12, height: 14, paddingTop: 2, boxSizing: 'border-box', background: i.place.place === 1 ? GOLD : SILVER, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)', color: '#1f1d1c', textAlign: 'center', fontSize: 7.5, fontWeight: 700, lineHeight: 1 }}>{i.place.place}</span>
              )}
            </span>
            {legend && (
              <span style={{ ...dim, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span style={{ ...label, fontSize: 8.5, letterSpacing: '.1em', lineHeight: 1.2, color: '#b8b2ab', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{i.l}</span>
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{swingText(i.e.diff)}</span>
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
// The icon under the pointer in words: its name, its swing in its colour and units, and
// its place among the league's when it has one.
function Readout({ x }) {
  return (
    <span style={{ fontSize: 10, letterSpacing: '.04em', color: DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <span style={{ color: INK, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{x.l}</span>
      {'  '}<span style={{ color: x.tone, fontWeight: 700 }}>{swingText(x.e.diff)}</span> {unitOf(x.e.key, x.e.unit).toLowerCase()} on vs off
      {x.place && <span style={{ color: x.place.worst ? WORST : INK }}>{x.place.worst ? `  ▼ ${worstText(x.place.place).toLowerCase()}` : `  #${x.place.place} in the league`}</span>}
    </span>
  )
}

// A small chart's frame: its box, its split lines (where given and in view), the across
// axis's labels (its ends and name), and the up axis's name and ends' values.
const frac = (axis, v) => Math.max(0, Math.min(1, (v - axis[0]) / (axis[1] - axis[0])))
// `w`: the frame's width in its own units, CW, or twice that for the career chart alone in
// the card (the playoffs, without Lonestar), so it stretches sideways at the same height.
const px = (axis, v, w = CW) => CM.l + frac(axis, v) * (w - CM.l - CM.r)
const py = (axis, v) => CM.t + (1 - frac(axis, v)) * (CH - CM.t - CM.b)
const tiny = { fontFamily: MONO, fontSize: 7, letterSpacing: '.08em', fill: FAINT }
const end = v => `${v > 0 ? '+' : ''}${Math.round(v)}`.replace('-', '−')
function Frame({ x, y, splitX, splitY, xLabels, yName, w = CW, children }) {
  const inside = (axis, v) => v !== undefined && v > axis[0] && v < axis[1]
  return (
    <svg viewBox={`0 0 ${w} ${CH}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <rect x={CM.l} y={CM.t} width={w - CM.l - CM.r} height={CH - CM.t - CM.b} fill="none" stroke={RULE} />
      {inside(x, splitX) && <line x1={px(x, splitX)} x2={px(x, splitX)} y1={CM.t} y2={CH - CM.b} stroke={EDGE} strokeDasharray="1 3" />}
      {inside(y, splitY) && <line x1={CM.l} x2={w - CM.r} y1={py(y, splitY)} y2={py(y, splitY)} stroke={EDGE} strokeDasharray="1 3" />}
      <text x={CM.l} y={CH - 5} style={tiny}>{xLabels[0]}</text>
      <text x={(CM.l + w - CM.r) / 2} y={CH - 5} textAnchor="middle" style={tiny}>{xLabels[1]}</text>
      <text x={w - CM.r} y={CH - 5} textAnchor="end" style={tiny}>{xLabels[2]}</text>
      <text x={CM.l - 4} y={CM.t + 6} textAnchor="end" style={tiny}>{end(y[1])}</text>
      <text transform={`translate(${CM.l - 6} ${(CM.t + CH - CM.b) / 2}) rotate(-90)`} textAnchor="middle" style={tiny}>{yName}</text>
      <text x={CM.l - 4} y={CH - CM.b} textAnchor="end" style={tiny}>{end(y[0])}</text>
      {children}
    </svg>
  )
}

// His career, in the same frame as Lonestar's beside it: the board's sort stat (`l`; BPM
// where his profile lacks it), a moving average of `n` seasons or each season, across the
// seasons that have one, the line spanning the chart; the league's average dashed, the gap
// shaded blue where he's better than it and orange worse (as his profile charts it); dots
// in their percentile's colour, the season on show ringed with its value. A span's card
// (`span`: its first and last season and its value) shades the span's seasons, dims the
// rest and draws the span's average across it, as the profile's stat tables do. The dots
// pop in season by season.
function Career({ profile: p, l, season, span, n, wide = false }) {
  const W = wide ? 2 * CW : CW
  const stat = n > 1 ? rollingStat(p, l, n) : p.stats[l]
  const pts = p.seasons.map((x, i) => ({ season: x.season, v: stat.vals[i], lg: stat.lg[i] })).filter(q => q.v)
  if (!pts.length) return <span style={{ ...label, color: FAINT }}>—</span>
  const xs = [-0.5, pts.length - 0.5]
  const mean = span && span.mean !== null ? [span.mean] : []
  const vs = [...pts.map(q => q.v.n), ...pts.map(q => q.lg).filter(v => v !== null && v !== undefined), ...mean]
  const ys = fit(vs, l === 'BPM' ? MIN_BPM : Math.max(...vs.map(Math.abs)) / 5 || 1)
  const at = pts.map((q, i) => ({ ...q, x: px(xs, i, W), y: py(ys, q.v.n), ly: q.lg === null || q.lg === undefined ? null : py(ys, q.lg) }))
  const line = key => at.filter(q => q[key] !== null).map(q => `${q.x.toFixed(1)},${q[key].toFixed(1)}`).join(' ')
  const yy = q => `’${q.season.slice(5)}`
  const shown = !span && at.find(q => q.season === season)
  const inSpan = q => span && q.season >= span.from && q.season <= span.to
  const within = at.filter(inSpan)
  const slot = at.length > 1 ? at[1].x - at[0].x : W - CM.l - CM.r
  const band = within.length > 0 && { x0: Math.max(CM.l, within[0].x - slot / 2), x1: Math.min(W - CM.r, within[within.length - 1].x + slot / 2) }
  return (
    <Frame x={xs} y={ys} xLabels={[yy(at[0]), n > 1 ? `${n}-YR AVG →` : 'SEASON →', yy(at[at.length - 1])]} yName={l} w={W}>
      {band && <rect x={band.x0} y={CM.t} width={band.x1 - band.x0} height={CH - CM.t - CM.b} fill="rgba(236,232,227,.07)" />}
      {at.slice(1).map((b, i) => {
        const a = at[i]
        if (a.ly === null || b.ly === null) return null
        return <path key={b.season} d={`M${a.x} ${a.y} L${b.x} ${b.y} L${b.x} ${b.ly} L${a.x} ${a.ly} Z`} fill={((a.y + b.y) / 2 <= (a.ly + b.ly) / 2) !== !!stat.lowerBetter ? BETTER : WORSE} />
      })}
      {at.length > 1
        ? <polyline points={line('ly')} fill="none" stroke={DIM} strokeDasharray="3 3" />
        : at[0].ly !== null && <line x1={CM.l} x2={W - CM.r} y1={at[0].ly} y2={at[0].ly} stroke={DIM} strokeDasharray="3 3" />}
      {at.length > 1 && <polyline points={line('y')} fill="none" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />}
      {at.map((q, i) => (
        <circle key={q.season} className="ls-pop" cx={q.x} cy={q.y} r={q === shown ? 4 : inSpan(q) ? 3 : 2.5} fill={q.v.p === null ? FAINT : col(q.v.p)}
          stroke={q === shown ? INK : 'none'} strokeWidth={1.5} fillOpacity={span && !inSpan(q) ? 0.3 : 1} style={{ animationDelay: `${i * 40}ms` }} />
      ))}
      {shown && <text x={shown.x} y={shown.y - 8} textAnchor={shown.x > W - 30 ? 'end' : 'middle'} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, fill: INK }}>{fmt(stat, shown.v.n)}</text>}
      {band && mean.length > 0 && (
        <>
          <line x1={band.x0} x2={band.x1} y1={py(ys, span.mean)} y2={py(ys, span.mean)} stroke={INK} strokeWidth={1.5} />
          <text x={band.x1 > W - 40 ? band.x0 - 3 : band.x1 + 3} y={py(ys, span.mean) + 3} textAnchor={band.x1 > W - 40 ? 'end' : 'start'} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, fill: INK }}>{fmt(stat, span.mean)}</text>
        </>
      )}
    </Frame>
  )
}

// Lonestar's that season: a hollow square where he is with his stars on, an arrow to
// where he is with them off, in the colour of his Net change (blue up, orange down).
function Alone({ scenario: s }) {
  const ok = v => v !== null && v !== undefined
  if (!ok(s.on.load) || !ok(s.on.net) || !ok(s.off.load) || !ok(s.off.net)) return <span style={{ ...label, color: FAINT }}>—</span>
  const [ax, ay, bx, by] = [px(LOAD, s.on.load), py(NET_AXIS, s.on.net), px(LOAD, s.off.load), py(NET_AXIS, s.off.net)]
  const color = s.off.net > s.on.net ? BLUE : s.off.net < s.on.net ? ORANGE : DIM
  const length = Math.hypot(bx - ax, by - ay)
  const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
  return (
    <Frame x={LOAD} y={NET_AXIS} splitX={40} splitY={0} xLabels={['0', 'LOAD →', '80']} yName="NET">
      {length > 6 && (
        <>
          <line className="ls-draw" x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={1.25} style={{ strokeDasharray: length, strokeDashoffset: length }} />
          {/* Placed by its group: the pop's scale (a CSS transform) would undo a transform on the head itself. */}
          <g transform={`translate(${bx} ${by}) rotate(${angle})`}>
            <polygon className="ls-pop" points="0,0 -7,-3.5 -7,3.5" fill={color} />
          </g>
        </>
      )}
      <rect x={ax - 3.5} y={ay - 3.5} width={7} height={7} fill="#262422" stroke={INK} strokeWidth={1.25} />
    </Frame>
  )
}

// One unit: his teammates in it (faces and surnames), its net rating, minutes and rank
// among the league's units of its size.
function Unit({ unit, title }) {
  if (!unit) return <span style={{ ...label, color: FAINT }}>{title} · —</span>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ ...label, fontSize: 8 }}>{title}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ display: 'flex', flex: 'none' }}>
          {unit.mates.map((m, i) => (
            <span key={m.slug || m.name} style={{ width: 20, height: 20, marginLeft: i ? -6 : 0, borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: '1px solid #544f4b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 7, color: DIM }}>
              {m.headshot ? <img src={headshotUrl(m.slug, 100, m.headshotVersion, m.headshot)} alt="" width={20} height={20} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(m.name || '?')}
            </span>
          ))}
        </span>
        <span style={{ fontSize: 10.5, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.mates.map(m => lastName(m.name)).join(' · ')}</span>
      </span>
      <span style={{ fontSize: 10, color: DIM, whiteSpace: 'nowrap' }}>
        <span style={{ color: unit.net >= 0 ? BLUE : ORANGE, fontWeight: 600 }}>{unit.net >= 0 ? '+' : '−'}{Math.abs(unit.net).toFixed(1)}</span> net · {unit.minutes.toLocaleString()} min{unit.rank ? ` · #${unit.rank.rank}/${unit.rank.of}` : ''}
      </span>
    </div>
  )
}

// `doc` is the board (lib/board.js): its row's numbers and percentiles are its season's,
// or, for a combined row, its span's (`spanText`); the career chart marks the season, or
// shades the span with its average, and Lonestar is that season's or the span's stretch;
// the units are the row's season's, the span's last for a combined row, and say so.
export default function PlayerCard({ doc, player: pl, rank, sortLabel, onClose, spanText = null, intro: opening = false }) {
  const { playoffs, playerPath } = useSeasonType()
  // His name and bio wipe in when the card opens (`opening`), not when it moves to another
  // player; the class goes once they have, so the bio line coming back after an icon's
  // readout doesn't wipe in again.
  const [intro, setIntro] = useState(opening)
  useEffect(() => {
    if (!intro) return
    const t = setTimeout(() => setIntro(false), 900)
    return () => clearTimeout(t)
  }, [intro])
  const [profile, setProfile] = useState(null)
  const [lonestar, setLonestar] = useState(null)
  const [footprint, setFootprint] = useState(null)
  const [fpAt, setFpAt] = useState(null)
  // Whether he's on a roster now: the players index's `active` (he played in the latest
  // season); null until it's read.
  const [active, setActive] = useState(null)
  useEffect(() => {
    let live = true
    fetchPlayers().then(list => live && setActive(!!((list || []).find(x => x.slug === pl.slug) || {}).active), () => {})
    fetchProfile(pl.slug, playoffs).then(d => live && setProfile(d || false), () => live && setProfile(false))
    if (!playoffs) fetchLonestar(pl.slug).then(d => live && setLonestar(d || false), () => live && setLonestar(false))
    if (!playoffs) fetchFootprint(pl.slug).then(d => live && setFootprint(d || false), () => live && setFootprint(false))
    return () => { live = false }
  }, [pl.slug, playoffs])
  useEffect(() => {
    const escape = e => { if (e.key === 'Escape' && !document.querySelector('[role=dialog]')) onClose() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])

  const season = pl.season
  const yy = `’${season.slice(5)}`
  // A combined row's span (its seasons on the board): its career chart shades it and charts
  // each season (a rolling average would blur the span's edges), its percentiles are the
  // span's among the board's, and Lonestar reads the span's stretch.
  // The career chart follows the board's sort, where his profile has the stat.
  const charted = profile && profile.stats[sortLabel] && profile.stats[sortLabel].available ? sortLabel : 'BPM'
  const span = doc.combined && pl.seasons && pl.seasons.length > 1 ? { from: pl.seasons[0], to: pl.seasons[pl.seasons.length - 1], mean: doc.labels.includes(charted) ? valueOf(doc, pl, charted) : null } : null
  const spanYy = span && `’${span.from.slice(5)}–’${span.to.slice(5)}`
  const careerN = profile && (span ? 1 : careerWindow(profile, charted))
  const at = profile ? profile.seasons.findIndex(s => s.season === season) : -1
  const heroes = [...new Set([sortLabel, 'BPM', 'Load', 'rTS%'])].filter(l => doc.labels.includes(l)).slice(0, 3)
  const rows = CARD_STATS.filter(l => doc.labels.includes(l))
  // The Footprint tab is the regular season's, over whole seasons (not the last 30 days).
  // His jerseys that season or over the span, in the order he wore them (his profile's).
  const layers = profile && profile.jerseys ? profile.jerseys[pl.slug] : null
  const worn = profile ? jerseysOver(profile.seasons, span ? span.from : season, span ? span.to : season) : []
  const split = splitIds(layers, worn)
  const fpView = doc.type === 'regular' ? viewIn(footprint, season, span) : null
  const fpItems = footprintOf(fpView)
  const fpShown = fpAt && fpItems.find(x => x.l === fpAt)
  // His units that season: its bio card's, or for the depth chart's season (which has no
  // card) the profile's own.
  const lineups = at < 0 ? null : profile.seasons[at].card ? profile.seasons[at].card.lineups : profile.lineups && profile.lineups.season === season ? profile.lineups : null
  const units = lineups && lineups.units
  // Lonestar's stretch that season (or over the span: its view by his own first and last
  // season in it) without both his stars, or his top one alone.
  const view = viewIn(lonestar, season, span)
  const star = view && (view.scenarios.find(x => x.kind === 'two') || view.scenarios.find(x => x.kind === 'one'))

  return (
    <div className={intro ? 'pc-card pc-intro' : 'pc-card'} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        {/* His status where the card named itself: green and ACTIVE on a roster now, grey
            and INACTIVE otherwise (held to its width while it's read). */}
        <span aria-hidden="true" style={{ width: 7, height: 7, background: active ? 'var(--accent)' : '#5a5550', transition: 'background .2s' }} />
        <span style={{ ...label, minWidth: 62, color: active ? INK : DIM }}>{active === null ? '' : active ? 'Active' : 'Inactive'}</span>
        <span style={{ ...label, color: DIM }}>{doc.type === 'recent' ? 'last 30 days' : doc.combined && spanText ? `${spanText} combined` : season.replace('-', '–')}{doc.type === 'delta' ? ' playoffs − reg' : playoffs ? ' playoffs' : ''}</span>
        <Link to={playerPath(pl.slug)} state={{ season }} style={{ ...label, marginLeft: 'auto', color: INK, border: `1px solid ${EDGE}`, padding: '5px 8px' }}>Full profile →</Link>
        <button type="button" aria-label="Close the card" onClick={onClose} style={{ width: 26, height: 26, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr)', columnGap: 14, padding: '2px 14px 14px' }}>
        {/* Square, so his jersey's bands sit on the portrait: dressed in the season's or the
            span's jersey, split between its teams' in order when he wore more than one. Behind
            him, faintly, the profile banner's bokeh. */}
        <div style={{ position: 'relative', width: 104, height: 104, background: '#1f1d1c', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DIM }}>
          <img src={asset('banner-bokeh.png')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '30% 0%', opacity: 0.75, display: 'block' }} />
          {pl.headshot
            ? (
              <div className="pc-face" style={{ position: 'absolute', inset: 0 }}>
                <img src={headshotUrl(pl.slug, 400, pl.headshotVersion, pl.headshot)} alt="" width={104} height={104} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {pl.headshot === 'jersey' && layers && (split ? <SplitJersey slug={pl.slug} size={400} layers={layers} ids={split} /> : <JerseyOverlay slug={pl.slug} size={400} layers={layers} id={worn[worn.length - 1]} />)}
              </div>
            )
            : initials(pl.name)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 12, minWidth: 0 }}>
            {fpShown
              ? <Readout x={fpShown} />
              : <span className="pc-type" style={small}>{[pl.teams ? pl.teams.join('/') : pl.team, pl.pos, rowAge(pl) && `${rowAge(pl)} yrs`, pl.gp !== null && `${pl.gp} gp`, pl.mp !== null && `${pl.mp.toLocaleString()} min`].filter(Boolean).join(' · ')}</span>}
          </div>
          <span className="pc-name" style={{ marginTop: 3, fontFamily: 'Montserrat, sans-serif', fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-.01em', lineHeight: 1, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</span>
          {/* The line is held while the footprint loads (and when it has none), so nothing moves. */}
          {doc.type === 'regular' && <div style={{ marginTop: 11, minHeight: ICON_MAX }}>{fpItems.length > 0 && <Icons items={fpItems} at={fpAt} setAt={setFpAt} />}</div>}
          <div style={{ marginTop: 'auto', paddingTop: 12, display: 'grid', gridTemplateColumns: `repeat(${heroes.length}, minmax(0, 1fr))` }}>
            {heroes.map((l, k) => {
              const v = valueOf(doc, pl, l)
              const pc = pctlOf(doc, pl, l)
              const delay = 400 + k * 90
              return (
                <div key={l} style={{ padding: k ? '0 0 0 12px' : '0 12px 0 0', borderLeft: k ? `1px solid ${RULE}` : 'none', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                    <span style={small}>{l}{doc.type === 'delta' ? ' Δ' : ''}</span>
                    {l === sortLabel && rank ? <span style={{ ...small, flex: 'none', color: INK, letterSpacing: '.06em' }}>#{rank}</span> : null}
                  </span>
                  <span style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}><CountUp stat={doc.stats[l]} value={v} delay={delay} /></span>
                    <Meter pc={pc} delay={delay} />
                    <span style={{ fontSize: 9, color: pc === null ? FAINT : col(pc), fontVariantNumeric: 'tabular-nums' }}>{pc ?? '—'}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>


      <Section title={doc.type === 'delta' ? 'Δ percentiles' : 'Percentiles'} right={doc.type === 'delta' ? 'among playoff players' : doc.type === 'recent' ? 'last 30 days' : span ? `${spanText || spanYy} ${doc.eras ? `· among ${doc.eras}-yr runs` : 'combined'}` : season.replace('-', '–')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 16, rowGap: 5 }}>
          {rows.map((l, i) => {
            const pc = pctlOf(doc, pl, l)
            return (
              <div key={l} style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr) 26px', gap: 6, alignItems: 'center' }}>
                <span style={{ ...label, fontSize: 8, color: '#b8b2ab', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
                <span style={{ position: 'relative', height: 8, background: '#34312e' }}>
                  {pc !== null && <span className="lb-bar-in" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(pc, 2)}%`, background: col(pc), animationDelay: `${80 + i * 30}ms` }} />}
                  <span style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#837d76' }} />
                </span>
                <span style={{ fontSize: 10, textAlign: 'right', color: pc === null ? FAINT : INK }}>{pc ?? '—'}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: playoffs ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', borderTop: `1px solid ${RULE}` }}>
        <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ ...label, color: '#b8b2ab' }}>{charted} <span style={{ color: FAINT }}>· {careerN > 1 ? `${ROLL}-yr avg` : 'by season'} vs lg{span ? ` · ${spanYy} avg` : ''}</span></span>
          {profile ? <Career profile={profile} l={charted} season={season} span={span} n={careerN} wide={playoffs} /> : <span style={{ ...label, color: FAINT, height: 168 }}>{profile === false ? 'Unavailable' : 'Loading'}</span>}
        </div>
        {!playoffs && (
          <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, borderLeft: `1px solid ${RULE}` }}>
            <span style={{ ...label, color: '#b8b2ab', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Lonestar <span style={{ color: FAINT }}>{span ? `· ${spanYy} ` : doc.combined ? `· ${yy} ` : ''}· w/o {star ? starsText(star.stars) : '—'}</span></span>
            {star ? <Alone scenario={star} /> : <span style={{ ...label, color: FAINT, height: 168 }}>{lonestar === null ? 'Loading' : `No star stretch ${span ? 'over the span' : 'this season'}`}</span>}
          </div>
        )}
      </div>

      <Section title="Units" right={lineups ? `${lineups.team}${doc.combined ? ` · ${yy}` : ''} · with him` : null}>
        {units
          ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 16, rowGap: 10 }}>
              <Unit title="Best 2-man" unit={units['2'] && units['2'].best} />
              <Unit title="Most-used 2-man" unit={units['2'] && units['2'].mostUsed} />
              <Unit title="Best 3-man" unit={units['3'] && units['3'].best} />
              <Unit title="Most-used 3-man" unit={units['3'] && units['3'].mostUsed} />
            </div>
          )
          : <span style={{ ...label, color: FAINT }}>{profile === null ? 'Loading' : 'No units on file this season'}</span>}
      </Section>
    </div>
  )
}
