import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fetchFootprint, fetchPlayers, headshotUrl } from '../api.js'
import { seasonAges } from '../lib/age.js'
import { MONO } from '../lib/format.js'
import { MEDAL_SHARES, anchorName, bar, medalOf, shade, strengthOf, swingText, toneOf, topPlaceOf, tourExample, unitOf, valueText, worstText } from '../lib/footprint.js'
import { namesText, posOf, seasonRanges, starsText } from '../lib/lonestar.js'
import { openingSeasons, spanId, spanText } from '../lib/seasons.js'
import FootprintGlyph from './FootprintGlyph.jsx'
import { Portrait, Slider } from './Lonestar.jsx'
import Popover from './Popover.jsx'
import SeasonPicker from './SeasonPicker.jsx'
import SectionHeader from './SectionHeader.jsx'
import Tour, { TourButton } from './Tour.jsx'

// The Footprint tab: how his team's play changes with him on the floor vs. off it, from
// his teams' five-man lineup totals in a regular season or a span of them, picked as in
// the Lonestar tab (thinking-bball lib/footprint.js), laid out as the Claude Design
// "Footprint" module. Each tile is a stat with him on minus off: his teammates' alone in
// the TEAM MATES row (his own shots left out), his team's otherwise. Those that clear the
// noise and stand out against the league's swings are lit (blue for a lift, orange for a
// cost, ink for a style stat, as strong as the evidence); the rest are grey, brighter the
// bigger the swing. Each tile has its on value against the league's, a badge or medal when
// its lit swing is among the league's best (a red badge, its place from the bottom, when
// among the worst), and a teammate stat its swing with and without his best-OBPM teammate.
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#c9c3bc' }
const INK = '#ece8e3'
const DIM = '#a09a93'
const RULE = '#3d3a37'
// REMOVE BEST's colors: the switch's green for MATES and OFFENSE without Lonestar's stars,
// lavender for DEFENSE without a defensive monster (for one himself, his next-best
// defender).
const DEF_LONE = '#b8a1e8'
const MID = '#b3ada6'
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name
const tone = (v, good) => (v === null || v === undefined ? DIM : v * good >= 0 ? TONES.good : TONES.bad)
const initialsOf = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
// The medals' colors: gold, silver and bronze for the league's top 1, 2 and 3%.
const MEDALS = ['#d4af37', '#c3c9cf', '#b8794a']
// A swing among the league's 10 worst: a reddish orange, apart from the cost's.
const WORST = '#ef5b30'
// What a tile without a swing to show says, in its details.
const MISSING = { thin: 'TOO FEW MINUTES ON A SIDE TO JUDGE', na: "NOT IN THIS SEASON'S DATA YET" }

// A medal's mark: a small solid square of its color.
function Medal({ tier }) {
  return <span title={`In the league's top ${Math.round(MEDAL_SHARES[tier - 1] * 100)}%`} style={{ display: 'inline-block', width: 7, height: 7, background: MEDALS[tier - 1], flex: 'none' }} />
}

// A top-10 place in the league: a flat tab hanging from the tile's top edge, notched like
// a bookmark, the place on it in the tile's dark; gold for #1, silver for #2 to #10, and
// red for one among the 10 worst (`worst`: its place from the bottom).
function Ribbon({ place, worst }) {
  return (
    <span title={worst ? (place === 1 ? "The league's worst" : `${worstText(place).toLowerCase()} in the league`) : place === 1 ? "The league's best" : `${place} in the league`} style={{ position: 'absolute', top: 0, right: 12, zIndex: 1, width: place < 10 ? 22 : 28, height: 28, boxSizing: 'border-box', paddingTop: 6, background: worst ? WORST : MEDALS[place === 1 ? 0 : 1], clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)', color: '#1f1d1c', textAlign: 'center', fontFamily: MONO, fontSize: 10, fontWeight: 700, lineHeight: 1 }}>
      #{place}
    </span>
  )
}

// A teammate's face: his portrait (the players index's), else his initials.
// The portrait cut out, unboxed, and greyed: in LONE these are the ones off the floor. It's
// drawn a third larger from the top, so the bottom is cropped and the head reads bigger.
// `tip`: what hovering it says, a line apiece. `order`: its place in the line, for the rise
// it comes in with (index.css .fp-face-img).
function Face({ who, size, tip, order = 0 }) {
  const [failed, setFailed] = useState(false)
  const [hover, setHover] = useState(false)
  return (
    <span onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', width: size, height: size, flex: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', fontSize: 10, color: DIM }}>
      <span style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        {who.headshot && !failed
          ? <img className="fp-face-img" src={headshotUrl(who.slug || who.face.key, 100, who.headshotVersion, who.headshot)} alt={who.name || ''} onError={() => setFailed(true)} style={{ '--i': order, width: '132%', height: '132%', flex: 'none', objectFit: 'cover', objectPosition: '50% 0', filter: 'var(--sitting)' }} />
          : initialsOf(who.name)}
      </span>
      {tip && hover && (
        // A callout: a pointer on its top edge aimed at the face it speaks for.
        <span role="tooltip" style={{ position: 'absolute', top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)', zIndex: 30, padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 3, background: '#1f1d1c', border: '1px solid #837d76', boxShadow: '0 10px 28px rgba(0,0,0,.55)', color: DIM, fontSize: 10, lineHeight: 1.4, letterSpacing: '.08em', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          <span aria-hidden="true" style={{ position: 'absolute', top: -6, left: 'calc(50% - 5px)', width: 10, height: 10, background: '#1f1d1c', borderLeft: '1px solid #837d76', borderTop: '1px solid #837d76', transform: 'rotate(45deg)' }} />
          {tip.map((line, i) => <span key={i} style={{ color: i ? DIM : INK }}>{line}</span>)}
        </span>
      )}
    </span>
  )
}

// A swing that counts to a new value like a mechanical counter, in tenths, eased out over
// TICKS steps after `delay` ms. The effect writes its text (React doesn't), so the count
// runs between renders; with reduced motion it goes straight to the value.
const TICK_MS = 520
const TICKS = 14
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
function Ticker({ value, delay, style }) {
  const el = useRef(null)
  const shown = useRef(null)
  useLayoutEffect(() => {
    const node = el.current
    const from = shown.current
    shown.current = value
    if (from === null || value === null || from === value || still()) {
      node.textContent = swingText(value)
      return undefined
    }
    node.textContent = swingText(from)
    let raf = 0
    const start = performance.now() + delay
    const tick = now => {
      const t = Math.min(1, Math.max(0, (now - start) / TICK_MS))
      node.textContent = swingText(from + (value - from) * (Math.round((1 - (1 - t) ** 3) * TICKS) / TICKS))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, delay])
  return <span ref={el} style={style} />
}

// A warning mark for a tile lit by a teammate effect: a solid warning-yellow triangle with
// a dark "!" (apart from the cost orange and the badges' gold).
const WARN = '#f2c230'
function MateMark({ size = 15 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" style={{ flex: 'none', display: 'block' }}>
      <path d="M7 1 13.4 12.6H.6Z" fill={WARN} stroke={WARN} strokeWidth="1" strokeLinejoin="round" />
      <path d="M7 4.9V8.7" stroke="#1f1d1c" strokeWidth="1.6" />
      <circle cx="7" cy="10.6" r=".95" fill="#1f1d1c" />
    </svg>
  )
}

// A percentile as a small badge raised on its value, in its medal's color when it has one.
function PctlBadge({ p, medal, title }) {
  if (p === null || p === undefined) return null
  const c = medal ? MEDALS[medal - 1] : DIM
  return <span title={medal ? `${title}; in the league's top ${Math.round(MEDAL_SHARES[medal - 1] * 100)}%` : title} style={{ display: 'inline-block', verticalAlign: 'top', marginLeft: 5, marginTop: 1, padding: '1px 3px', border: `1px solid ${c}`, color: c, fontSize: 8.5, lineHeight: 1, letterSpacing: '.04em' }}>{p}</span>
}

// A tile's details, on hover (a tap on a phone, see HOVER), as a sheet: his team's value on and off,
// the on value's percentile against the league's raised on it, the swing with its percentile
// among players' swings (higher better, or for a style its size) in its medal's color; in
// LONE, his minutes on and off too; and, for a tile lit by a teammate effect, what its swing
// comes to in LONE. The unit is the tile's, the league's value the chart's. Opens leftward
// from a tile on the right of its row, and above the tile when it would run past the
// screen's foot and there is more room above (the bottom row, not scrolled to).
// `color`: a lit tile's; an unlit one's swing is ink.
function Details({ e, anchors, color, right, scale }) {
  const ref = useRef(null)
  const [up, setUp] = useState(false)
  useLayoutEffect(() => {
    const sheet = ref.current.getBoundingClientRect()
    const tile = ref.current.parentElement.getBoundingClientRect()
    const foot = document.documentElement.clientHeight
    setUp(sheet.bottom > foot && tile.top > foot - tile.bottom)
  }, [])
  const medal = medalOf(e)
  const sits = `WHEN ${anchorName(anchors)} ${anchors.length > 1 ? 'SIT' : 'SITS'}`
  const head = { fontSize: 9, letterSpacing: '.14em', color: DIM }
  const big = { fontSize: 18, lineHeight: 1.15, color: INK, whiteSpace: 'nowrap' }
  const sub = { fontSize: 9.5, letterSpacing: '.06em', color: DIM, whiteSpace: 'nowrap' }
  const rule = `1px solid ${RULE}`
  const has = e.on !== null && e.on !== undefined
  const swingPctl = e.swingPctl ?? e.pctl
  return (
    <div ref={ref} role="tooltip" style={{ position: 'absolute', ...(up ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }), ...(right ? { right: 0 } : { left: 0 }), zIndex: 30, width: 340, maxWidth: 'calc(100vw - 32px)', background: '#1f1d1c', border: '1px solid #837d76', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: MONO, fontSize: 10.5, lineHeight: 1.4, letterSpacing: '.04em', color: '#d8d2cb', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
      <span style={{ color: INK, textTransform: 'uppercase', letterSpacing: '.08em' }}>{e.label}{e.isLone && <span style={{ color: e.side === 'def' ? DEF_LONE : 'var(--accent)' }}> · REMOVE BEST</span>}</span>
      {has ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.45fr', columnGap: 12, rowGap: 2, paddingTop: 9, borderTop: rule }}>
          <span style={head}>ON</span>
          <span style={head}>OFF</span>
          <span style={head}>CHANGE</span>
          <span style={big}>{valueText(e, e.on)}<PctlBadge p={e.onPctl} title="Percentile of his team's on value against the league's" /></span>
          <span style={big}>{valueText(e, e.off)}</span>
          <span style={{ ...big, color: color || INK }}>{swingText(e.diff)}<PctlBadge p={swingPctl} medal={medal} title="Percentile of the change among players' changes in this stat" /></span>
          {(swingPctl === null || swingPctl === undefined) && MISSING[e.status] && <span style={{ ...sub, gridColumn: '1 / -1' }}>{MISSING[e.status]}</span>}
          {e.isLone && <><span style={sub}>{e.min[0].toLocaleString()} MIN</span><span style={sub}>{e.min[1].toLocaleString()} MIN</span><span /></>}
        </div>
      ) : MISSING[e.status] && <span style={sub}>{MISSING[e.status]}</span>}
      {has && scale && <Against e={e} scale={scale} color={color} />}
      {e.mate && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 10, borderTop: rule, color: INK, letterSpacing: '.06em' }}>
          <MateMark size={16} />
          <span><span style={{ color: WARN }}>TEAMMATE EFFECT</span> <span style={{ color: DIM }}>·</span> {swingText(e.diff)} <span style={{ color: DIM }}>{Math.sign(e.lone.diff) === Math.sign(e.diff) ? 'FALLS' : 'TURNS'} TO</span> {swingText(e.lone.diff)} <span style={{ color: DIM }}>{sits} (REMOVE BEST)</span></span>
        </span>
      )}
    </div>
  )
}

// The swing against the league, as Lonestar's rows draw a change (Lonestar.jsx Slider):
// the stat's league range of on values (`scale`, about the league's value: its 1st, 50th
// and 99th percentiles), a hollow square at his team's value with him off and a head at
// it with him on, joined in the swing's color (grey unlit); in REMOVE BEST a second line,
// in its swing's color fading in from its side's, labeled in its side's, for the minutes
// those teammates sit. Each draws in, a beat apart.
// The range's ends round out to a round step (roundOut), the league's value marked where
// it falls.
function Against({ e, scale, color }) {
  const whole = e.whole || e
  const { range: raw, text } = roundOut(scale.map(v => v + whole.lg))
  const lines = [
    { label: e.isLone ? 'ALL MIN' : 'OFF → ON', off: whole.off, on: whole.on, color: e.isLone ? (whole.lit ? TONES[toneOf(whole)] : MID) : color || MID },
    ...(e.isLone ? [{ label: 'REMOVE BEST', tag: e.side === 'def' ? DEF_LONE : 'var(--accent)', off: e.off, on: e.on, color: color || MID }] : [])
  ]
  const tick = { fontSize: 9, letterSpacing: '.06em', color: DIM }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: `1px solid ${RULE}` }}>
      <span style={{ fontSize: 9, letterSpacing: '.14em', color: DIM }}>AGAINST THE LEAGUE</span>
      {lines.map((x, i) => (
        <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...tick, width: 74, flex: 'none', color: x.tag || DIM }}>{x.label}</span>
          <div style={{ flex: 1, minWidth: 0 }}><Slider on={x.off} off={x.on} scale={raw} color={x.color} trail={x.tag} index={i * 4} /></div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{ width: 74, flex: 'none' }} />
        <span style={{ position: 'relative', flex: 1, height: 12, ...tick }}>
          <span style={{ position: 'absolute', left: 0 }}>{text(raw[0])}</span>
          <span style={{ position: 'absolute', left: `${100 * posOf(raw, whole.lg)}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>LG {valueText(e, whole.lg)}</span>
          <span style={{ position: 'absolute', right: 0 }}>{text(raw[2])}</span>
        </span>
      </div>
    </div>
  )
}

// A range's ends rounded out to a round step, 1, 2 or 5 times a power of ten, the finest
// that leaves at most six steps across it: 29.3 to 58.8 reads 25 to 60, 107.3 to 122.8
// reads 105 to 125. `text` writes an end to its step's precision.
const roundOut = ([lo, mid, hi]) => {
  const span = hi - lo
  if (!(span > 0)) return { range: [lo, mid, hi], text: v => v.toFixed(1) }
  const p = 10 ** Math.floor(Math.log10(span))
  const step = [0.1, 0.2, 0.5, 1, 2, 5, 10].map(m => m * p).find(x => span / x <= 6)
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9))
  return { range: [Math.floor(lo / step + 1e-9) * step, mid, Math.ceil(hi / step - 1e-9) * step], text: v => v.toFixed(digits) }
}

// A stat at a glance, in a box: its glyph and name at the top, its swing at the foot
// over the bar of how big the swing is among players'; its top-10 badge, else its medal,
// when it has one. Lit by a teammate effect, its top edge is hatched rather than solid and
// its unit says so, quietly. The rest is in its details.
// When its numbers change (LONE, another span), the tile stays put and its data moves: the
// swing counts to its new value and the bar slides, `delay` ms after the tile before it;
// colors and the lit edge fade.
// A tile is square and never under TILE_MIN_H, the height of its fullest content (a title on
// three lines beside a place ribbon): its size never depends on what it says.
// Its details open on hover or focus where the screen can hover; on a phone only a tap (a
// click, which a scroll never makes) opens or closes them, so scrolling past never does.
const HOVER = window.matchMedia('(hover: hover)').matches
const TILE_MIN_H = 158
function FootprintTile({ e, anchors, right, delay = 0, scale }) {
  const [open, setOpen] = useState(false)
  const lit = e.status === 'notable'
  // An unlit swing stays grey, brighter the bigger it is among players' swings, never as
  // bright as a lit one.
  const size = lit ? 1 : (e.pctl || 0) / 100
  const color = lit ? shade(TONES[toneOf(e)], strengthOf(e)) : DIM
  const b = bar(e)
  const medal = medalOf(e)
  const place = topPlaceOf(e)
  const mate = lit && e.mate
  return (
    // A lit tile carries a bar of its color across the top edge (hatched for a teammate
    // effect); an unlit one is dimmed. It is its column's width and square (stretching to
    // a row's tallest tile let a long title make a whole row taller and wider than its
    // columns, so tiles changed size with the player or span); minWidth 0: a long unit line
    // would otherwise widen it over the next.
    <div tabIndex={0} data-stat={e.key} onBlur={() => setOpen(false)}
      {...(HOVER ? { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false), onFocus: () => setOpen(true) } : { onClick: () => setOpen(o => !o) })}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', aspectRatio: '1 / 1', minHeight: TILE_MIN_H, alignSelf: 'start', minWidth: 0, background: open ? '#302d2b' : lit ? '#2a2826' : '#2c2a28', boxShadow: `${lit && !mate ? `inset 0 3px 0 ${color}, ` : ''}0 0 0 1px ${RULE}`, outline: 'none', cursor: 'default', zIndex: open ? 2 : 'auto', transition: `box-shadow .35s ${delay}ms, background-color .2s` }}>
      {mate && <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: `repeating-linear-gradient(135deg, ${color} 0 4px, transparent 4px 7px)` }} />}
      {place && <Ribbon place={place.place} worst={place.worst} />}
      <div style={{ flex: 1, minWidth: 0, padding: '15px 14px 13px', display: 'flex', flexDirection: 'column', gap: 10, opacity: lit ? 1 : 0.62 + 0.3 * size, transition: `opacity .35s ${delay}ms`, fontFamily: MONO }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingRight: place ? 32 : 0 }}>
          <div style={{ flex: 'none', width: 22, height: 22, color: lit ? INK : DIM }}><FootprintGlyph stat={e.key} size={22} /></div>
          <span style={{ minWidth: 0, paddingTop: 3, fontSize: 12.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', lineHeight: 1.25, color: INK }}>{e.effect}</span>
          {medal && !place && <span style={{ marginLeft: 'auto', paddingTop: 6, display: 'flex' }}><Medal tier={medal} /></span>}
        </div>
        <span style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Ticker value={e.diff} delay={delay} style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, letterSpacing: '-.02em', color, fontVariantNumeric: 'tabular-nums', transition: `color .35s ${delay}ms` }} />
          <span style={{ fontSize: 9.5, color: DIM, letterSpacing: '.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {unitOf(e.key, e.unit)}
            {/* A teammate effect: the legend's hatched mark, in the tile's color. */}
            {mate && <span title={`Teammate effect: most of this change is ${e.side === 'def' ? 'his top defender' : 'his best teammate'}'s minutes, not his`} aria-label="teammate effect"
              style={{ display: 'inline-block', width: 14, height: 3, marginLeft: 7, verticalAlign: 'middle', background: `repeating-linear-gradient(135deg, ${color} 0 4px, transparent 4px 7px)` }} />}
          </span>
        </span>
        {/* How big the swing is among players' swings in this stat: right a lift, left a cost. */}
        <div style={{ position: 'relative', height: 8 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 1, background: '#4a4642' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 8, background: DIM }} />
          <div style={{ position: 'absolute', top: 3, height: 3, left: `${b.left}%`, width: `${b.width}%`, background: lit ? color : '#837d76', transition: `left .55s cubic-bezier(.3,0,.1,1) ${delay}ms, width .55s cubic-bezier(.3,0,.1,1) ${delay}ms, background-color .35s ${delay}ms` }} />
        </div>
      </div>
      {open && <Details e={e} anchors={anchors} color={lit ? color : null} right={right} scale={scale} />}
    </div>
  )
}

function Method({ fp, from, to }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 10, fontFamily: MONO }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ background: 'transparent', border: 0, padding: 0, color: DIM, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', cursor: 'pointer' }}>
        {open ? '▾' : '▸'} HOW THIS WORKS
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, paddingTop: 12, fontSize: 11, lineHeight: 1.6, color: '#c9c3bc' }}>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Raw on/off: each stat is his team&apos;s with him on the floor minus with him off, summed over every five-man lineup his teams used in {spanText(from, to)} (regular season).</li>
            <li>Teammate stats leave his own shots out: with him on, only his teammates&apos; shots count; with him off, everyone&apos;s. Their rim scoring is per 100 of their own shots, so a high-usage player doesn&apos;t drag it down by shooting more himself.</li>
            <li>Rim points are 2 per rim make plus free throws from two-shot shooting fouls and and-ones after a rim make. Paint extended adds short mid-range makes.</li>
            <li>Each team-season is measured against that team, then the seasons are combined; a player traded mid-season counts only over his time there.</li>
            <li>A tile lights when its change clears its own noise (z of 2.5 or more) and is bigger than three quarters of players&apos; changes in that stat over the same seasons. Over several seasons, those players are the top half by minutes across them. An unlit change stays grey, brighter the bigger it is among players&apos;.</li>
            <li>REMOVE BEST shows the MATES and OFFENSE tiles again over only the minutes some of his teammates sit (off the floor on both sides), measured and lit the same way, except that a tile lit on all his minutes stays lit while its change keeps at least half of itself there. Offense (the green box) offers the stars the Lonestar tab does for these seasons: each star, each top two, and all combined, each season without its own. Defense (the lavender box) goes without a defensive monster: a teammate on the floor for a quarter of the minutes whose defensive EPM (Dunks &amp; Threes, 2001-02 on) is in the top 10% of the league&apos;s rotation players that season; for a player who is one himself, his next-best defender by it. A row with no such teammate stays on all his minutes.</li>
            <li>A lit tile is marked as a teammate effect when its change keeps less than half of itself, or turns round, with REMOVE BEST&apos;s first pick (all combined where there is one): most of it is those teammates&apos; minutes.</li>
            <li>In a tile&apos;s details, the small badge on CHANGE is the change&apos;s percentile among players&apos; changes in that stat; the one on ON and the chart&apos;s LG place his team&apos;s on value against the league&apos;s that season.</li>
            <li>A lit change among the league&apos;s 10 best gets a badge with its place, gold for #1 and silver for #2 to #10; otherwise one in the top 3% gets a medal: gold for the top 1%, silver the top 2%, bronze the top 3%. One among the 10 worst gets a red badge with its place from the bottom.</li>
          </ul>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: DIM, fontSize: 10, letterSpacing: '.08em' }}>MINUTES ON AND OFF</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '2px 16px', fontVariantNumeric: 'tabular-nums' }}>
              {fp.spans.map(s => (
                <span key={`${s.season}-${s.team}`} style={{ display: 'contents' }}>
                  <span>{s.season.replace('-', '–')} {s.team}</span>
                  <span style={{ textAlign: 'right' }}>{s.minutes.on.toLocaleString()} ON</span>
                  <span style={{ textAlign: 'right', color: DIM }}>{s.minutes.off.toLocaleString()} OFF</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// The tab fetches its views (every season and span) when opened, and the players index
// for the faces of the teammates its checks are against.
export default function Footprint({ profile: p }) {
  const [doc, setDoc] = useState(null)
  const [faces, setFaces] = useState(() => new Map())
  const [touring, setTouring] = useState(false)
  useEffect(() => {
    let live = true
    fetchFootprint(p.slug).then(d => live && setDoc(d), () => live && setDoc(false))
    return () => { live = false }
  }, [p.slug])
  useEffect(() => {
    let live = true
    fetchPlayers().then(list => live && setFaces(new Map((list || []).map(x => [x.slug, x]))), () => {})
    return () => { live = false }
  }, [])
  return (
    <section id="sec-footprint" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader title="Footprint">{doc && <TourButton height={26} onClick={() => setTouring(true)} />}</SectionHeader>
      {doc
        ? <Views p={p} doc={doc} faces={faces} touring={touring} endTour={() => setTouring(false)} />
        : <div style={{ border: `1px solid ${RULE}`, minHeight: 600, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }}>{doc === false ? 'Unavailable' : 'Loading'}</div>}
    </section>
  )
}

// A tile as LONE has it: the stat over only the minutes his anchor sits, with no badge (a
// place is among players' whole on/off) and no teammate mark. A tile lit on all his minutes
// stays lit while its swing holds up there (at least half of it, the same way: not a
// teammate effect), as strong as the smaller sample makes it: fewer minutes rarely clear
// the noise bar alone, and a swing that grew going grey read as a loss.
const loneTile = (e, o) => {
  const l = o.tiles[e.key] || { status: 'na', on: null, off: null, diff: null, pctl: null, swingPctl: null, onPctl: null, mate: false }
  const holds = e.status === 'notable' && !l.mate && l.status !== 'na' && l.status !== 'thin'
  // `whole`: the tile on all his minutes, for its details' chart.
  const whole = { on: e.on, off: e.off, diff: e.diff, lg: e.lg, good: e.good, lit: e.status === 'notable' }
  return { ...e, ...l, min: o.min, status: holds ? 'notable' : l.status, rank: null, mate: false, isLone: true, whole }
}

// REMOVE BEST (LONE in the code and data): the MATES and OFFENSE tiles over only the
// minutes the stars Lonestar sets aside sit, the DEFENSE tiles over only those a defensive
// monster sits (for one himself, his next-best defender), each side's pick in its box. On,
// the switch glows a light grey-white of its own: green and lavender are the sides'.
const GLOW = '#e4dfd9'
function LoneSwitch({ on, set, disabled }) {
  return (
    <button type="button" data-tour="fp-lone" aria-pressed={on} disabled={disabled} onClick={() => set(!on)}
      title={disabled ? 'No teammate to set aside in these seasons' : on ? 'Back to all his minutes' : 'Only the minutes his best teammates sit'}
      style={{ height: 30, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 12px', border: `1px solid ${on ? GLOW : '#544f4b'}`, background: on ? '#3a3734' : 'transparent', boxShadow: on ? '0 0 10px rgba(228, 223, 217, .22), inset 0 0 6px rgba(228, 223, 217, .08)' : 'none', color: on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 10.5, fontWeight: on ? 700 : 500, letterSpacing: '.16em', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'box-shadow .2s, border-color .2s' }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, border: `1px solid ${on ? GLOW : '#837d76'}`, background: on ? GLOW : 'transparent', boxShadow: on ? '0 0 6px rgba(228, 223, 217, .6)' : 'none', transition: 'background .15s, box-shadow .15s' }} />
      REMOVE BEST
    </button>
  )
}

// Who an option sets aside, each in his own part's team, seasons and jersey (ALL's from its
// parts), a teammate once.
const benched = o => {
  const seen = new Set()
  return (o.parts || [o]).flatMap(part => part.stars.map(t => ({ ...t, team: part.team, seasons: part.seasons, jersey: part.jersey })))
    .filter(t => !seen.has(t.id) && seen.add(t.id))
}
const optionKey = o => (o.all ? `all-${o.kind}` : `${o.team}-${o.stars.map(t => t.id).join()}`)
// A side's first pick: its top stars combined (ALL) where it has them, else its first
// single, else its first (lib/footprint.js reads the teammate effect against the same).
const firstOf = options => {
  const all = options.findIndex(o => o.all && o.kind === 'one')
  const one = options.findIndex(o => o.kind === 'one')
  return all >= 0 ? all : Math.max(0, one)
}

// A box's faces: its teammates greyed and overlapping, standing on a rule of the side's
// color, up to three (its words say how many more; two on a phone, index.css).
function Bench({ who, color }) {
  return (
    <span aria-hidden="true" className="fp-pick-faces" style={{ flex: 'none', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', boxShadow: `inset 0 -2px 0 ${color}` }}>
      {who.slice(0, 3).map((t, k) => <span key={t.id} style={{ display: 'flex', marginLeft: k ? -7 : 0 }}><Face who={t} size={24} order={k} /></span>)}
    </span>
  )
}
// A list row's faces as Lonestar's stretch list has them: each in his part's jersey, in
// colour, greyed on the picked row; up to FACES, then how many more. `layersOf`: a
// teammate's jersey layers (the profile's).
const FACES = 4
function Sat({ who, on, slots, layersOf }) {
  const shown = who.length > FACES ? who.slice(0, FACES - 1) : who
  return (
    <span aria-hidden="true" className="fp-option-faces" style={{ flex: 'none', alignSelf: 'flex-end', display: 'flex', alignItems: 'flex-end', width: 34 + (slots - 1) * 24, overflow: 'hidden', filter: on ? 'var(--sitting)' : 'none' }}>
      {shown.map((t, k) => (
        <span key={t.id} style={{ display: 'grid', width: 34, height: 34, flex: 'none', marginLeft: k ? -10 : 0 }}>
          <Portrait who={{ ...t, face: t.face && t.face.key }} team={t.team} on size={34} layers={layersOf(t)} jersey={t.jersey} />
        </span>
      ))}
      {who.length > FACES && <span style={{ fontSize: 9, color: MID, alignSelf: 'center', marginLeft: 4 }}>+{who.length - FACES + 1}</span>}
    </span>
  )
}

// A side's REMOVE BEST pick: a box in its color (green for offense, lavender for defense)
// with its teammates' faces and names; with more than one option it opens their list, as
// Lonestar's stretch list (Lonestar.jsx StretchList): in sections, most minutes off first,
// ALL last under a heavier rule; each row its faces, names, team and seasons where the span
// has others (a lone defender with his defensive EPM), a bar for his minutes off, and his
// minutes on and off the floor while they sit. A click picks and closes; the arrow keys
// move the pick with the list open; Enter closes. `faceOf` brings each face's portrait;
// two boxes keep to one line, their words cut short (`shrink`).
// A defense pair is picked by hand (lib/footprint.js): two teammates at once, or one a season.
const SECTIONS = { off: [['one', 'Without top star'], ['two', 'Without top two stars']], def: [['one', 'Without top defender'], ['two', 'Without both']] }
const MIN_COL = 56
function Picker({ side, options, at, pick, color, view, faceOf, layersOf }) {
  const o = options[at]
  const teams = new Set(options.map(x => x.team).filter(Boolean))
  const meta = x => (x.all
    ? x.parts.map(part => `${starsText(part.stars)} ${seasonRanges(part.seasons)}`).join(' · ')
    : [teams.size > 1 && x.team, x.seasons.length < view.seasons.length && seasonRanges(x.seasons), side === 'def' && x.stars.length === 1 && x.stars[0].depm !== null && x.stars[0].depm !== undefined && `DEPM ${swingText(x.stars[0].depm)}`].filter(Boolean).join(' · '))
  const text = x => {
    if (!x.all) return starsText(x.stars)
    const parts = x.parts.map(part => starsText(part.stars))
    return parts.length > 2 ? `${parts[0]} + ${parts.length - 1} more` : parts.join(' + ')
  }
  const trigger = (
    <>
      <Bench who={benched(o).map(faceOf)} color={color} />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{text(o)}</span>
    </>
  )
  const name = `${side === 'def' ? 'Defense' : 'Offense'} without: ${text(o)}`
  if (options.length < 2) {
    return (
      <span aria-label={name} style={{ height: 30, boxSizing: 'border-box', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 10, flex: '0 1 auto', minWidth: 0, border: `1px solid ${color}`, color: INK, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden' }}>{trigger}</span>
    )
  }
  const sections = SECTIONS[side].map(([kind, title]) => ({
    kind, title,
    rows: options.map((x, i) => i).filter(i => options[i].kind === kind)
      .sort((a, b) => (options[a].all ? 1 : 0) - (options[b].all ? 1 : 0) || options[b].min[1] - options[a].min[1])
  })).filter(sec => sec.rows.length)
  return (
    <Popover name={name} accent={color} shrink minWidth={300} trigger={trigger}>
      {close => <Options options={options} sections={sections} at={at} pick={pick} close={close} color={color} meta={meta} faceOf={faceOf} layersOf={layersOf} />}
    </Popover>
  )
}
function Options({ options, sections, at, pick, close, color, meta, faceOf, layersOf }) {
  const list = useRef(null)
  const order = sections.flatMap(sec => sec.rows)
  useEffect(() => {
    list.current.focus({ preventScroll: true })
    list.current.querySelector('[aria-selected="true"]').scrollIntoView({ block: 'nearest' })
  }, [at])
  const most = Math.max(1, ...options.map(x => x.min[1]))
  const slots = Math.min(FACES, Math.max(...options.map(x => benched(x).length)))
  const head = { fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: DIM }
  const row = i => {
    const x = options[i]
    const on = i === at
    return (
      <div key={optionKey(x)} role="option" aria-selected={on} onClick={() => { pick(i); close() }}
        style={{ display: 'flex', alignItems: 'center', gap: 14, height: 42, padding: '0 10px 0 12px', borderTop: x.all ? '1px solid #7a746e' : undefined, borderBottom: `1px solid ${RULE}`, background: on ? '#3d3a37' : undefined, boxShadow: on ? `inset 2px 0 0 ${color}` : 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        <Sat who={benched(x).map(faceOf)} on={on} slots={slots} layersOf={layersOf} />
        <span style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: on ? INK : MID, fontWeight: on || x.all ? 700 : 500 }}>{x.all ? 'All combined' : namesText(x.stars)}</span>
          {meta(x) && <span title={meta(x)} style={{ fontSize: 8.5, color: DIM, overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta(x)}</span>}
        </span>
        <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="fp-option-bar" style={{ width: 56, height: 2, background: RULE }}><span style={{ display: 'block', height: 2, width: `${(100 * x.min[1]) / most}%`, background: on ? color : '#7a746e' }} /></span>
          <span style={{ width: MIN_COL, textAlign: 'right', color: DIM }}>{x.min[0].toLocaleString()}</span>
          <span style={{ width: MIN_COL, textAlign: 'right', color: on ? INK : MID }}>{x.min[1].toLocaleString()}</span>
        </span>
      </div>
    )
  }
  return (
    <div ref={list} role="listbox" aria-label="Teammates without" tabIndex={0} style={{ outline: 'none', display: 'flex', flexDirection: 'column', width: 'min(520px, calc(100vw - 58px))', fontFamily: MONO }}
      onKeyDown={e => {
        const step = { ArrowDown: 1, ArrowUp: -1 }[e.key]
        if (e.key === 'Enter') return close()
        if (!step) return
        e.preventDefault()
        pick(order[Math.min(order.length - 1, Math.max(0, order.indexOf(at) + step))])
      }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 10px 6px 12px' }}>
        <span style={{ ...head, width: MIN_COL, textAlign: 'right' }}>On min</span>
        <span style={{ ...head, width: MIN_COL, textAlign: 'right' }}>Off min</span>
      </div>
      <div style={{ maxHeight: 'min(440px, 62vh)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#544f4b transparent' }}>
        {sections.map(sec => (
          <div key={sec.kind} role="group" aria-label={sec.title}>
            <div style={{ ...head, color: '#d9d3cc', padding: '12px 12px 6px', borderBottom: '1px solid #544f4b' }}>{sec.title}</div>
            {sec.rows.map(row)}
          </div>
        ))}
      </div>
    </div>
  )
}

// The span on show and its tiles. At first: his opening seasons (lib/seasons.js), or his
// only one.
function Views({ p, doc, faces, touring, endTour }) {
  const viewOf = (from, to) => doc.views.find(v => v.id === spanId(from, to))
  const [span, setSpan] = useState(() => {
    const open = openingSeasons(p, doc.seasons)
    const [a, b] = [open[0], open[open.length - 1]]
    return open.length > 1 && viewOf(a, b) ? { from: a, to: b } : { from: doc.views[0].id, to: doc.views[0].id }
  })
  const fp = viewOf(span.from, span.to)
  // The picker by age (his age in each season) or by year.
  const [byAge, setByAge] = useState(false)
  const ageOf = seasonAges(p)
  const [lone, setLone] = useState(false)
  // Each side's pick in REMOVE BEST, by its place in the view's options (none yet: its
  // first). Another span opens on its top stars combined (ALL) where it has them, else on
  // the same teammates where it has them, else its first, as Lonestar's does.
  const [picks, setPicks] = useState({})
  const atOf = (v, side) => (picks[side] === undefined ? firstOf(v.remove[side]) : Math.min(picks[side], v.remove[side].length - 1))
  const pick = (from, to) => {
    const next = viewOf(from, to)
    if (!next) return
    const carry = side => {
      const all = next.remove[side].findIndex(o => o.all && o.kind === 'one')
      const now = fp.remove[side][atOf(fp, side)]
      const same = now ? next.remove[side].findIndex(o => optionKey(o) === optionKey(now)) : -1
      return all >= 0 ? all : same >= 0 ? same : firstOf(next.remove[side])
    }
    setPicks({ off: carry('off'), def: carry('def') })
    setSpan({ from, to })
  }
  // A teammate with no profile (an older one) brings his own face (`face`, by NBA id).
  const faceOf = a => {
    const f = a.slug ? faces.get(a.slug) : a.face
    return { ...a, headshot: f && f.headshot, headshotVersion: f && f.headshotVersion }
  }
  const layersOf = t => (p.jerseys && t.slug ? p.jerseys[t.slug] : null)
  const options = { off: fp.remove.off, def: fp.remove.def }
  const picked = { off: options.off[atOf(fp, 'off')], def: options.def[atOf(fp, 'def')] }
  const first = { off: options.off[firstOf(options.off)], def: options.def[firstOf(options.def)] }
  const sections = [
    { id: 'mates', title: 'MATES', tiles: fp.effects.filter(e => e.mates) },
    { id: 'off', title: 'OFFENSE', tiles: fp.effects.filter(e => e.side === 'off' && !e.mates) },
    { id: 'def', title: 'DEFENSE', tiles: fp.effects.filter(e => e.side === 'def') }
  ].filter(sec => sec.tiles.length)
  // REMOVE BEST sets aside each side the span has options for.
  const offOn = lone && !!picked.off
  const defOn = lone && !!picked.def
  const loneOn = offOn || defOn
  // His team's points per 100 scored and allowed with him on against the league's (rORTG,
  // rDRTG), and from him off to on; blue where it helps (more scored, fewer allowed). With
  // REMOVE BEST, rORTG is its OFFENSE tile's over the minutes the picked stars sit and rDRTG
  // its DEFENSE tile's over those the picked defender sits; a side with none stays on all
  // his minutes, dimmed as its row is.
  const ortg = (offOn && picked.off.tiles.ortg) || fp.ortg
  const drtg = (defOn && picked.def.tiles.drtg) || fp.drtg
  const rating = (name, x, good) => (
    <span>
      <span style={{ color: DIM }}>ON {name}</span> <span style={{ color: tone(x.r, good) }}>{swingText(x.r)}</span>{' '}
      <span style={{ color: DIM }}>(</span><span style={{ color: tone(x.on - x.off, good) }}>{swingText(x.on - x.off)}</span><span style={{ color: DIM }}> ON/OFF)</span>
    </span>
  )
  const legendKey = { display: 'inline-flex', gap: 6, alignItems: 'center' }
  // The tour, on all his minutes (REMOVE BEST off), its example his most telling tile.
  const tourSteps = () => {
    const last = lastName(p.name)
    const ex = tourExample(fp.effects, last)
    return [
      { title: 'Team on / off', target: '#sec-footprint .fp-rows', small: '#sec-footprint .fp-row', action: () => setLone(false),
        text: `Team stats with ${last} **on the floor minus off**.` },
      { title: 'Tiles', target: '#sec-footprint .fp-row',
        text: "One tile per stat. **MATES** is his teammates' own shooting." },
      ...(ex ? [{ title: ex.title, target: `#sec-footprint [data-stat="${ex.key}"]`, text: ex.text }] : []),
      { title: 'Lit / dim', target: '#sec-footprint [data-tour="fp-legend"]',
        text: 'A **lit** tile clears the noise and beats most players.' },
      { title: 'Seasons', target: '#sec-footprint button[aria-label^="Seasons"]',
        text: '**Seasons** sets which years the tiles cover.' },
      ...(options.off.length || options.def.length ? [{ title: 'Remove best', target: '#sec-footprint [data-tour="fp-lone"]',
        text: '**REMOVE BEST** keeps only the minutes his best teammates sit.' }] : [])
    ]
  }
  // A row: TEAM and its word on the left, its tiles side by side, every row on the widest
  // one's columns so the tiles are the same boxes throughout.
  const cols = Math.max(...sections.map(sec => sec.tiles.length))
  // With REMOVE BEST, a row with its side's pick shows that pick's tiles, marked by a rule in
  // its color down its left edge (the switch's green for MATES and OFFENSE, lavender for
  // DEFENSE; the tiles keep their own colors, so the switch doesn't read as a lift); a row
  // with none stays on all his minutes, dimmed. Otherwise a tile's teammate effect is read
  // against its side's first pick.
  const row = sec => {
    const side = sec.id === 'def' ? 'def' : 'off'
    const changes = side === 'def' ? defOn : offOn
    const kept = loneOn && !changes
    const color = side === 'def' ? DEF_LONE : 'var(--accent)'
    const o = changes ? picked[side] : first[side]
    return (
      <div key={sec.id} className="fp-row" style={{ display: 'grid', gridTemplateColumns: '128px minmax(0, 1fr)', columnGap: 14, padding: '14px 0', borderTop: `1px solid ${RULE}`, fontFamily: MONO, opacity: kept ? 0.45 : 1, transition: 'opacity .3s' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2, minWidth: 0 }}>
          <span style={{ fontSize: 10, letterSpacing: '.22em', color: changes ? color : DIM }}>{changes ? 'REMOVE BEST' : 'TEAM'}</span>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '.1em', lineHeight: 1.1, color: INK }}>{sec.title}</span>
          {kept && <span style={{ fontSize: 9, letterSpacing: '.12em', color: DIM, marginTop: 4 }}>ALL MINUTES</span>}
        </div>
        <div className="fp-row-tiles" style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 1, padding: 1, alignSelf: 'start' }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: -8, top: 1, bottom: 1, width: 2, background: color, opacity: changes ? 1 : 0, transition: 'opacity .3s' }} />
          {sec.tiles.map((e, i) => (
            <FootprintTile key={e.key} e={changes ? loneTile(e, o) : { ...e, lone: o && o.tiles[e.key] }} anchors={o ? benched(o) : []} right={i >= cols / 2} scale={fp.scale && fp.scale[e.num - 1]}
              delay={45 * (sections.slice(0, sections.indexOf(sec)).reduce((n, x) => n + x.tiles.length, 0) + i)} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 24px', alignItems: 'center', fontFamily: MONO }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px', flex: '1 1 0', minWidth: 0 }}>
          <SeasonPicker seasons={doc.seasons} from={span.from} to={span.to} n={fp.seasons.length} pick={pick} ages={ageOf && { on: byAge, set: setByAge, of: ageOf }} teamsOf={season => (p.seasons.find(s => s.season === season) || {}).teams || (p.bio.teamsBySeason || {})[season]} />
          <LoneSwitch on={loneOn} set={setLone} disabled={!options.off.length && !options.def.length} />
          {loneOn ? (
            // In LONE the same line holds each side's pick, so nothing below moves (a row of
            // its own on a phone, index.css).
            <div className="fp-lone-line" style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              {offOn && <Picker side="off" options={options.off} at={atOf(fp, 'off')} pick={i => setPicks(x => ({ ...x, off: i }))} color="var(--accent)" view={fp} faceOf={faceOf} layersOf={layersOf} />}
              {defOn && <Picker side="def" options={options.def} at={atOf(fp, 'def')} pick={i => setPicks(x => ({ ...x, def: i }))} color={DEF_LONE} view={fp} faceOf={faceOf} layersOf={layersOf} />}
            </div>
          ) : (
            <p style={{ margin: 0, maxWidth: '72ch', fontSize: 12, lineHeight: 1.6, color: '#b3ada6', textWrap: 'pretty' }}>in {lastName(p.name)}&apos;s {fp.minutes.on.toLocaleString()} ON court vs {fp.minutes.off.toLocaleString()} OFF</p>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 11, letterSpacing: '.08em', whiteSpace: 'nowrap' }} title={`His team's points per 100 possessions scored (rORTG) and allowed (rDRTG) with him on, against the league's, and the change from him off to on${loneOn ? `; rORTG over ${offOn ? 'the minutes the picked stars sit' : 'all his minutes'}, rDRTG over ${defOn ? 'the minutes the picked defender sits' : 'all his minutes'}` : ''}`}>
          {rating('rORTG', ortg, 1)}
          <span style={{ color: DIM }}>·</span>
          <span style={{ opacity: loneOn && !defOn ? 0.45 : 1, transition: 'opacity .3s' }}>{rating('rDRTG', drtg, -1)}</span>
        </div>
      </div>
      {/* TEAM MATES, then TEAM OFFENSE, then TEAM DEFENSE, a row each. */}
      <div className="fp-rows" style={{ borderBottom: `1px solid ${RULE}` }}>{sections.map(row)}</div>
      <div data-tour="fp-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', paddingTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.good }} />LIFT</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.bad }} />COST</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.neutral }} />STYLE</span>
        <span style={legendKey}>DIM · WITHIN NOISE OR COMMON</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: `repeating-linear-gradient(135deg, ${TONES.good} 0 4px, transparent 4px 7px)` }} />TEAMMATE EFFECT</span>
        <span style={legendKey}>BAR · SIZE AMONG PLAYERS&apos; CHANGES</span>
        <span style={legendKey}>HOVER A TILE FOR ITS DETAILS</span>
      </div>
      <Method fp={fp} from={span.from} to={span.to} />
      {touring && <Tour steps={tourSteps()} onClose={endTour} />}
    </>
  )
}
