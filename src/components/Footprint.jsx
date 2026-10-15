import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fetchFootprint, fetchPlayers, headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import { MEDAL_SHARES, anchorName, bar, medalOf, pctlText, shade, strengthOf, swingText, toneOf, topPlaceOf, unitOf, valueText, worstText } from '../lib/footprint.js'
import { spanId, spanText } from '../lib/seasons.js'
import FootprintGlyph from './FootprintGlyph.jsx'
import SeasonPicker from './SeasonPicker.jsx'
import SectionHeader from './SectionHeader.jsx'

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
          ? <img className="fp-face-img" src={headshotUrl(who.slug || who.face.key, 100, who.headshotVersion, who.headshot)} alt={who.name || ''} onError={() => setFailed(true)} style={{ '--i': order, width: '132%', height: '132%', flex: 'none', objectFit: 'cover', objectPosition: '50% 0', filter: 'grayscale(1) contrast(1.05)', opacity: 0.8 }} />
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

// A tile's details, on hover (a tap on a phone), as a sheet: his team's value off and on,
// the swing (its unit, its percentile among players' swings with higher better, or for a
// style its size, and its medal), the on value's
// league and percentile; in LONE, his minutes on and off too; and, for a tile lit by a teammate
// effect, what its swing comes to in LONE. Opens leftward from a tile on the right of its
// row.
// `color`: a lit tile's; an unlit one's swing is ink.
function Details({ e, anchors, color, right }) {
  const medal = medalOf(e)
  const sits = `WHEN ${anchorName(anchors)} ${anchors.length > 1 ? 'SIT' : 'SITS'}`
  const head = { fontSize: 9, letterSpacing: '.14em', color: DIM }
  const big = { fontSize: 18, lineHeight: 1.15, color: INK }
  const sub = { fontSize: 9.5, letterSpacing: '.06em', color: DIM, whiteSpace: 'nowrap' }
  const rule = `1px solid ${RULE}`
  const has = e.on !== null && e.on !== undefined
  return (
    <div role="tooltip" style={{ position: 'absolute', top: 'calc(100% + 4px)', ...(right ? { right: 0 } : { left: 0 }), zIndex: 30, width: 340, maxWidth: 'calc(100vw - 32px)', background: '#1f1d1c', border: '1px solid #837d76', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: MONO, fontSize: 10.5, lineHeight: 1.4, letterSpacing: '.04em', color: '#d8d2cb', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
      <span style={{ color: INK, textTransform: 'uppercase', letterSpacing: '.08em' }}>{e.label}{e.isLone && <span style={{ color: 'var(--accent)' }}> · REMOVE BEST</span>}</span>
      {has ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.45fr', columnGap: 12, rowGap: 2, paddingTop: 9, borderTop: rule }}>
          <span style={head}>OFF</span>
          <span style={head}>ON</span>
          <span style={head}>SWING</span>
          <span style={big}>{valueText(e, e.off)}</span>
          <span style={big}>{valueText(e, e.on)}</span>
          <span style={{ ...big, color: color || INK }}>{swingText(e.diff)}</span>
          <span />
          <span style={sub}>LG {valueText(e, e.lg)}</span>
          <span style={sub}>{unitOf(e.key, e.unit)}</span>
          <span />
          <span style={sub}>{pctlText(e.onPctl)}</span>
          <span style={{ ...sub, display: 'inline-flex', alignItems: 'center', gap: 5, color: medal ? MEDALS[medal - 1] : DIM }}>{medal && <Medal tier={medal} />}{(e.swingPctl ?? e.pctl) !== null && (e.swingPctl ?? e.pctl) !== undefined ? pctlText(e.swingPctl ?? e.pctl) : MISSING[e.status]}</span>
          {e.isLone && <><span style={sub}>{e.min[1].toLocaleString()} MIN</span><span style={sub}>{e.min[0].toLocaleString()} MIN</span><span /></>}
        </div>
      ) : MISSING[e.status] && <span style={sub}>{MISSING[e.status]}</span>}
      {e.mate && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 10, borderTop: rule, color: INK, letterSpacing: '.06em' }}>
          <MateMark size={16} />
          <span><span style={{ color: WARN }}>TEAMMATE EFFECT</span> <span style={{ color: DIM }}>·</span> {swingText(e.diff)} <span style={{ color: DIM }}>{Math.sign(e.lone.diff) === Math.sign(e.diff) ? 'FALLS' : 'TURNS'} TO</span> {swingText(e.lone.diff)} <span style={{ color: DIM }}>{sits} (REMOVE BEST)</span></span>
        </span>
      )}
    </div>
  )
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
const TILE_MIN_H = 158
function FootprintTile({ e, anchors, right, delay = 0 }) {
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
    <div tabIndex={0} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onPointerUp={ev => { if (ev.pointerType !== 'mouse') setOpen(o => !o) }}
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
            {mate && <span title="Teammate effect: most of this swing is his best teammate's minutes, not his" aria-label="teammate effect"
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
      {open && <Details e={e} anchors={anchors} color={lit ? color : null} right={right} />}
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
            <li>A tile lights when its swing clears its own noise (z of 2.5 or more) and is bigger than three quarters of players&apos; swings in that stat over the same seasons. Over several seasons, those players are the top half by minutes across them. An unlit swing stays grey, brighter the bigger it is among players&apos;.</li>
            <li>REMOVE BEST shows the MATES and OFFENSE tiles again over only the minutes his best-OBPM teammate sits (off the floor on both sides), measured and lit the same way, except that a tile lit on all his minutes stays lit while its swing keeps at least half of itself there; DEFENSE stays on all his minutes.</li>
            <li>A lit tile is marked as a teammate effect when its swing keeps less than half of itself, or turns round, with REMOVE BEST: most of it is that teammate&apos;s minutes.</li>
            <li>In a tile&apos;s details, the percentile under SWING is the swing&apos;s size among players&apos; swings in that stat; LG and the percentile under ON place his team&apos;s on value against the league&apos;s that season.</li>
            <li>A lit swing among the league&apos;s 10 best gets a badge with its place, gold for #1 and silver for #2 to #10; otherwise one in the top 3% gets a medal: gold for the top 1%, silver the top 2%, bronze the top 3%. One among the 10 worst gets a red badge with its place from the bottom.</li>
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
      <SectionHeader title="Footprint" />
      {doc
        ? <Views p={p} doc={doc} faces={faces} />
        : <div style={{ border: `1px solid ${RULE}`, minHeight: 600, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }}>{doc === false ? 'Unavailable' : 'Loading'}</div>}
    </section>
  )
}

// A tile as LONE has it: the stat over only the minutes his anchor sits, with no badge (a
// place is among players' whole on/off) and no teammate mark. A tile lit on all his minutes
// stays lit while its swing holds up there (at least half of it, the same way: not a
// teammate effect), as strong as the smaller sample makes it: fewer minutes rarely clear
// the noise bar alone, and a swing that grew going grey read as a loss.
const loneTile = e => {
  const l = e.lone || { status: 'na', on: null, off: null, diff: null, pctl: null, swingPctl: null, onPctl: null }
  const holds = e.status === 'notable' && !e.mate && l.status !== 'na' && l.status !== 'thin'
  return { ...e, ...l, status: holds ? 'notable' : l.status, rank: null, mate: false, isLone: true }
}
// What hovering an anchor's face says: who, which seasons, why him (his OBPM, or its
// estimate from play-by-play where the sheet has none; how much he played), and this
// player's minutes on and off with him sitting.
const anchorTip = (a, p) => [
  `${lastName(a.name).toUpperCase()}  ${seasonsText(a.seasons)}`,
  [a.rating && `${a.rating.by.toUpperCase()} ${swingText(a.rating.value)}`, a.share && `ON THE FLOOR ${a.share}% OF THE MINUTES`].filter(Boolean).join(' · '),
  a.min ? `${lastName(p.name).toUpperCase()} WITHOUT HIM: ${a.min[0].toLocaleString()} ON · ${a.min[1].toLocaleString()} OFF` : null
].filter(Boolean)
// His anchor's seasons as a span, "2019–20 → 2021–22".
const seasonsText = seasons => spanText(seasons[0], seasons[seasons.length - 1])

// REMOVE BEST (LONE in the code and data): the MATES and OFFENSE tiles over only the
// minutes his best-OBPM teammate sits.
function LoneSwitch({ on, set, disabled }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={() => set(!on)}
      title={disabled ? 'No teammate to set aside in these seasons' : on ? 'Back to all his minutes' : 'Only the minutes his best teammate sits'}
      style={{ height: 30, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 12px', border: `1px solid ${on ? 'var(--accent)' : '#544f4b'}`, background: on ? '#3a3734' : 'transparent', color: on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 10.5, fontWeight: on ? 700 : 500, letterSpacing: '.16em', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, border: `1px solid ${on ? 'var(--accent)' : '#837d76'}`, background: on ? 'var(--accent)' : 'transparent', transition: 'background .15s' }} />
      REMOVE BEST
    </button>
  )
}

// The span on show (his last two seasons at first, or his only one) and its tiles.
function Views({ p, doc, faces }) {
  const viewOf = (from, to) => doc.views.find(v => v.id === spanId(from, to))
  const [span, setSpan] = useState(() => {
    const [a, b] = doc.seasons.slice(-2)
    return b && viewOf(a, b) ? { from: a, to: b } : { from: doc.views[0].id, to: doc.views[0].id }
  })
  const fp = viewOf(span.from, span.to)
  const pick = (from, to) => { if (viewOf(from, to)) setSpan({ from, to }) }
  const [lone, setLone] = useState(false)
  // A teammate with no profile (an older one) brings his own face (`face`, by NBA id).
  const anchors = (fp.anchors || []).map(a => {
    const f = a.slug ? faces.get(a.slug) : a.face
    return { ...a, headshot: f && f.headshot, headshotVersion: f && f.headshotVersion }
  })
  const sections = [
    { id: 'mates', title: 'MATES', tiles: fp.effects.filter(e => e.mates) },
    { id: 'off', title: 'OFFENSE', tiles: fp.effects.filter(e => e.side === 'off' && !e.mates) },
    { id: 'def', title: 'DEFENSE', tiles: fp.effects.filter(e => e.side === 'def') }
  ].filter(sec => sec.tiles.length)
  const loneOn = lone && anchors.length > 0
  const loneMin = (fp.effects.find(e => e.lone) || {}).lone
  // His team's points per 100 scored and allowed with him on against the league's (rORTG,
  // rDRTG), and from him off to on; blue where it helps (more scored, fewer allowed). With
  // REMOVE BEST, rORTG is its OFFENSE tile's over the minutes his best teammate sits;
  // rDRTG stays on all his minutes, dimmed as the DEFENSE row is.
  const ortg = (loneOn && (fp.effects.find(e => e.key === 'ortg') || {}).lone) || fp.ortg
  const rating = (name, x, good) => (
    <span>
      <span style={{ color: DIM }}>ON {name}</span> <span style={{ color: tone(x.r, good) }}>{swingText(x.r)}</span>{' '}
      <span style={{ color: DIM }}>(</span><span style={{ color: tone(x.on - x.off, good) }}>{swingText(x.on - x.off)}</span><span style={{ color: DIM }}> ON/OFF)</span>
    </span>
  )
  const legendKey = { display: 'inline-flex', gap: 6, alignItems: 'center' }
  // A row: TEAM and its word on the left, its tiles side by side, every row on the widest
  // one's columns so the tiles are the same boxes throughout.
  const cols = Math.max(...sections.map(sec => sec.tiles.length))
  // With REMOVE BEST, MATES and OFFENSE show LONE's tiles, marked by a rule in the switch's
  // green down their left edge (the tiles keep their own colors, so the switch doesn't read
  // as a lift); DEFENSE stays on all his minutes, dimmed (the only row greyed).
  const row = sec => {
    const changes = sec.id !== 'def'
    const kept = loneOn && !changes
    return (
      <div key={sec.id} className="fp-row" style={{ display: 'grid', gridTemplateColumns: '128px minmax(0, 1fr)', columnGap: 14, padding: '14px 0', borderTop: `1px solid ${RULE}`, fontFamily: MONO, opacity: kept ? 0.45 : 1, transition: 'opacity .3s' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2, minWidth: 0 }}>
          <span style={{ fontSize: 10, letterSpacing: '.22em', color: loneOn && changes ? 'var(--accent)' : DIM }}>{loneOn && changes ? 'REMOVE BEST' : 'TEAM'}</span>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '.1em', lineHeight: 1.1, color: INK }}>{sec.title}</span>
          {kept && <span style={{ fontSize: 9, letterSpacing: '.12em', color: DIM, marginTop: 4 }}>ALL MINUTES</span>}
        </div>
        <div className="fp-row-tiles" style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 1, padding: 1, alignSelf: 'start' }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: -8, top: 1, bottom: 1, width: 2, background: 'var(--accent)', opacity: loneOn && changes ? 1 : 0, transition: 'opacity .3s' }} />
          {sec.tiles.map((e, i) => (
            <FootprintTile key={e.key} e={loneOn && changes ? loneTile(e) : e} anchors={anchors} right={i >= cols / 2}
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
          <SeasonPicker seasons={doc.seasons} from={span.from} to={span.to} n={fp.seasons.length} pick={pick} />
          <LoneSwitch on={loneOn} set={setLone} disabled={!anchors.length} />
          {loneOn ? (
            // In LONE the same line says who sits, so nothing below moves: one teammate by name,
            // his seasons and the minutes left (cut short rather than wrapping); several, their
            // faces alone, each naming himself on hover. The faces stand on the rule under the
            // line (index.css .fp-lone-faces); the line keeps the switch's height.
            <p style={{ margin: 0, height: 30, flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, lineHeight: 1.6, color: '#b3ada6' }}>
              <span className="fp-lone-faces" style={{ position: 'relative', display: 'flex', gap: 12, flex: 'none', alignSelf: 'flex-end' }}>
                {anchors.length > 1 && (
                  // Several: a bracket over their faces, WITHOUT on it, as the Leaderboard
                  // brackets its rolling windows; each face says who he is on hover.
                  <>
                    <span aria-hidden="true" className="fp-bracket" style={{ position: 'absolute', top: -8, left: 4, right: 4, height: 5, borderTop: '1px solid #837d76', borderLeft: '1px solid #837d76', borderRight: '1px solid #837d76' }} />
                    <span className="fp-bracket-label" style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', padding: '0 5px', background: '#262422', fontSize: 8.5, lineHeight: '12px', letterSpacing: '.16em', color: '#c9c3bc' }}>WITHOUT</span>
                  </>
                )}
                {anchors.map((a, i) => <Face key={a.slug || i} who={a} size={46} tip={anchorTip(a, p)} order={i} />)}
              </span>
              {anchors.length === 1 && (
                <span className="fp-lone-text" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  without <span style={{ color: INK, fontWeight: 700, letterSpacing: '.06em' }}>{lastName(anchors[0].name).toUpperCase()}</span> <span style={{ color: DIM }}>{seasonsText(anchors[0].seasons)}</span>
                  {' '}· {lastName(p.name)}&apos;s {loneMin ? loneMin.min[0].toLocaleString() : '—'} ON vs {loneMin ? loneMin.min[1].toLocaleString() : '—'} OFF
                </span>
              )}
            </p>
          ) : (
            <p style={{ margin: 0, maxWidth: '72ch', fontSize: 12, lineHeight: 1.6, color: '#b3ada6', textWrap: 'pretty' }}>in {lastName(p.name)}&apos;s {fp.minutes.on.toLocaleString()} ON court vs {fp.minutes.off.toLocaleString()} OFF</p>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 11, letterSpacing: '.08em', whiteSpace: 'nowrap' }} title={`His team's points per 100 possessions scored (rORTG) and allowed (rDRTG) with him on, against the league's, and the change from him off to on${loneOn ? '; rORTG over the minutes his best teammate sits, rDRTG over all his minutes' : ''}`}>
          {rating('rORTG', ortg, 1)}
          <span style={{ color: DIM }}>·</span>
          <span style={{ opacity: loneOn ? 0.45 : 1, transition: 'opacity .3s' }}>{rating('rDRTG', fp.drtg, -1)}</span>
        </div>
      </div>
      {/* TEAM MATES, then TEAM OFFENSE, then TEAM DEFENSE, a row each. */}
      <div style={{ borderBottom: `1px solid ${RULE}` }}>{sections.map(row)}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', paddingTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.good }} />LIFT</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.bad }} />COST</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.neutral }} />STYLE</span>
        <span style={legendKey}>DIM · WITHIN NOISE OR COMMON</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: `repeating-linear-gradient(135deg, ${TONES.good} 0 4px, transparent 4px 7px)` }} />TEAMMATE EFFECT</span>
        <span style={legendKey}>BAR · SIZE AMONG PLAYERS&apos; SWINGS</span>
        <span style={legendKey}>HOVER A TILE FOR ITS DETAILS</span>
      </div>
      <Method fp={fp} from={span.from} to={span.to} />
    </>
  )
}
