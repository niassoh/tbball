import { useEffect, useState } from 'react'
import { fetchFootprint, fetchPlayers, headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import { MEDAL_SHARES, anchorName, bar, medalOf, pctlText, shade, strengthOf, swingText, toneOf, unitOf, valueText, wowyVerdict } from '../lib/footprint.js'
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
// cost, ink for a style stat, as strong as the evidence). Each tile has its on value
// against the league's, a medal when that's in the league's top 3% at the end that helps
// his team, and a teammate stat its swing with and without his best-OBPM teammate.
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#c9c3bc' }
const INK = '#ece8e3'
const DIM = '#a09a93'
const RULE = '#3d3a37'
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name
const tone = (v, good) => (v === null || v === undefined ? DIM : v * good >= 0 ? TONES.good : TONES.bad)
const initialsOf = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
// Same charcoal the portraits sit on elsewhere.
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
// The medals' colors: gold, silver and bronze for the league's top 1, 2 and 3%.
const MEDALS = ['#d4af37', '#c3c9cf', '#b8794a']
// What a tile without a swing to show says, in its details.
const MISSING = { thin: 'TOO FEW MINUTES ON A SIDE TO JUDGE', na: "NOT IN THIS SEASON'S DATA YET" }

// A medal's mark: a small solid square of its color.
function Medal({ tier }) {
  return <span title={`In the league's top ${Math.round(MEDAL_SHARES[tier - 1] * 100)}%`} style={{ display: 'inline-block', width: 7, height: 7, background: MEDALS[tier - 1], flex: 'none' }} />
}

// The league's best: a flat gold tab hanging from the tile's top edge, notched like a
// bookmark, #1 on it in the tile's dark.
function Ribbon() {
  return (
    <span title="The league's best" style={{ position: 'absolute', top: 0, right: 12, zIndex: 1, width: 22, height: 28, boxSizing: 'border-box', paddingTop: 6, background: MEDALS[0], clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)', color: '#1f1d1c', textAlign: 'center', fontFamily: MONO, fontSize: 10, fontWeight: 700, lineHeight: 1 }}>
      #1
    </span>
  )
}

// A teammate's face: his portrait (the players index's), else his initials.
function Face({ who }) {
  const [failed, setFailed] = useState(false)
  return (
    <span style={{ width: 30, height: 30, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, boxShadow: '0 0 0 1px #544f4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: DIM }}>
      {who.headshot && !failed
        ? <img src={headshotUrl(who.slug, 100, who.headshotVersion, who.headshot)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 15%' }} />
        : initialsOf(who.name)}
    </span>
  )
}

// One half of the teammate check: its swing, and a bar from zero on the two halves'
// shared scale (right a rise, left a fall).
function Half({ label, v, max, color }) {
  const w = v === null ? 0 : (Math.abs(v) / max) * 50
  return (
    <>
      <span style={{ color: DIM, letterSpacing: '.1em' }}>{label}</span>
      <span style={{ color: INK, textAlign: 'right' }}>{swingText(v)}</span>
      <span style={{ position: 'relative', height: 8, alignSelf: 'center' }}>
        <span style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 1, background: '#4a4642' }} />
        <span style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 8, background: DIM }} />
        {v !== null && <span style={{ position: 'absolute', top: 2, height: 5, left: `${v >= 0 ? 50 : 50 - w}%`, width: `${w}%`, background: color }} />}
      </span>
    </>
  )
}

// A tile's details, on hover (a tap on a phone), as a sheet: his team's value off and on,
// the swing (its unit, z and size among players' swings), the on value's league and
// percentile; for a teammate stat, the swing again with his best-OBPM teammate on the
// floor and off it. Opens leftward from a tile on the right of its row.
// `color`: a lit tile's; an unlit one's swing is ink and its bars grey.
function Details({ e, anchors, color, right }) {
  const medal = medalOf(e)
  const w = e.wowy
  const halves = w ? [w.with ? w.with[0] : null, w.without ? w.without[0] : null] : null
  const max = halves ? Math.max(...halves.filter(v => v !== null).map(Math.abs), 0.1) : 1
  const head = { fontSize: 9, letterSpacing: '.14em', color: DIM }
  const big = { fontSize: 18, lineHeight: 1.15, color: INK }
  const sub = { fontSize: 9.5, letterSpacing: '.06em', color: DIM, whiteSpace: 'nowrap' }
  const rule = `1px solid ${RULE}`
  const has = e.on !== null && e.on !== undefined
  return (
    <div role="tooltip" style={{ position: 'absolute', top: 'calc(100% + 4px)', ...(right ? { right: 0 } : { left: 0 }), zIndex: 30, width: 340, maxWidth: 'calc(100vw - 32px)', background: '#1f1d1c', border: '1px solid #837d76', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: MONO, fontSize: 10.5, lineHeight: 1.4, letterSpacing: '.04em', color: '#d8d2cb', fontVariantNumeric: 'tabular-nums', textAlign: 'left' }}>
      <span style={{ color: INK, textTransform: 'uppercase', letterSpacing: '.08em' }}>{e.label}</span>
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
          <span style={{ ...sub, display: 'inline-flex', alignItems: 'center', gap: 5, color: medal ? MEDALS[medal - 1] : DIM }}>{medal && <Medal tier={medal} />}{pctlText(e.onPctl)}</span>
          <span style={sub}>{e.pctl !== null && e.pctl !== undefined ? `z ${e.z.toFixed(1)} · ${pctlText(e.pctl)}` : MISSING[e.status]}</span>
          {e.borderline && <><span /><span /><span style={sub}>BORDERLINE</span></>}
        </div>
      ) : MISSING[e.status] && <span style={sub}>{MISSING[e.status]}</span>}
      {w && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 10, borderTop: rule }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ display: 'flex' }}>
              {anchors.map((a, i) => <span key={a.slug || i} style={{ marginLeft: i ? -8 : 0, display: 'flex' }}><Face who={a} /></span>)}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={head}>SWING WITH / WITHOUT</span>
              <span style={{ color: INK, fontWeight: 700, letterSpacing: '.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{anchorName(anchors)}</span>
            </span>
            <span style={{ marginLeft: 'auto', flex: 'none', padding: '2px 6px', border: `1px solid ${w.kind === 'holds' ? INK : '#5a5550'}`, color: w.kind === 'holds' ? INK : DIM, fontSize: 9.5, letterSpacing: '.1em' }}>{wowyVerdict(w)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto minmax(0, 1fr)', columnGap: 12, rowGap: 4, alignItems: 'center' }}>
            <Half label="WITH" v={halves[0]} max={max} color={color || '#837d76'} />
            <Half label="WITHOUT" v={halves[1]} max={max} color={color || '#837d76'} />
          </div>
        </div>
      )}
    </div>
  )
}

// A stat at a glance, in a box: its glyph and name at the top, its swing at the foot
// over the bar of how big the swing is among players'; a medal or the #1 ribbon when it
// has one. The rest is in its details.
function FootprintTile({ e, anchors, right }) {
  const [open, setOpen] = useState(false)
  const lit = e.status === 'notable'
  const color = lit ? shade(TONES[toneOf(e)], strengthOf(e)) : DIM
  const b = bar(e)
  const medal = medalOf(e)
  const first = medal && e.rank[0] === 1
  return (
    // A lit tile carries a bar of its color across the top edge; an unlit one is dimmed.
    <div tabIndex={0} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onPointerUp={ev => { if (ev.pointerType !== 'mouse') setOpen(o => !o) }}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', aspectRatio: '1 / .9', background: open ? '#302d2b' : lit ? '#2a2826' : '#2c2a28', boxShadow: `${lit ? `inset 0 3px 0 ${color}, ` : ''}0 0 0 1px ${RULE}`, outline: 'none', cursor: 'default', zIndex: open ? 2 : 'auto' }}>
      {first && <Ribbon />}
      <div style={{ flex: 1, padding: '15px 14px 13px', display: 'flex', flexDirection: 'column', gap: 10, opacity: lit ? 1 : 0.6, fontFamily: MONO }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingRight: first ? 26 : 0 }}>
          <div style={{ flex: 'none', width: 22, height: 22, color: lit ? INK : DIM }}><FootprintGlyph stat={e.key} size={22} /></div>
          <span style={{ minWidth: 0, paddingTop: 3, fontSize: 12.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', lineHeight: 1.25, color: INK }}>{e.effect}</span>
          {medal && !first && <span style={{ marginLeft: 'auto', paddingTop: 6, display: 'flex' }}><Medal tier={medal} /></span>}
        </div>
        <span style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, letterSpacing: '-.02em', color: lit ? color : DIM, fontVariantNumeric: 'tabular-nums' }}>{swingText(e.diff)}</span>
          <span style={{ fontSize: 9.5, color: DIM, letterSpacing: '.08em' }}>{unitOf(e.key, e.unit)}</span>
        </span>
        {/* How big the swing is among players' swings in this stat: right a lift, left a cost. */}
        <div style={{ position: 'relative', height: 8 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 1, background: '#4a4642' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 8, background: DIM }} />
          <div style={{ position: 'absolute', top: 3, height: 3, left: `${b.left}%`, width: `${b.width}%`, background: lit ? color : '#837d76' }} />
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
            <li>A tile lights when its swing clears its own noise (z of 2.5 or more) and is bigger than three quarters of players&apos; swings in that stat over the same seasons. Over several seasons, those players are the top half by minutes across them.</li>
            <li>Teammate stats are also measured again with his best-OBPM teammate on the floor (WITH) and off it (WITHOUT): the swing holds either way, comes only with or only without that teammate, or shrinks in both.</li>
            <li>In a tile&apos;s details, z is the whole swing over its noise, and its percentile is the swing&apos;s size among players&apos; swings in that stat. LG and the percentile under ON place his team&apos;s on value against the league&apos;s that season.</li>
            <li>An on value in the league&apos;s top 3% at the end that helps his team gets a medal: gold for the top 1%, silver the top 2%, bronze the top 3%. The league&apos;s best gets a #1 ribbon.</li>
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

// The span on show (his last two seasons at first, or his only one) and its tiles.
function Views({ p, doc, faces }) {
  const viewOf = (from, to) => doc.views.find(v => v.id === spanId(from, to))
  const [span, setSpan] = useState(() => {
    const [a, b] = doc.seasons.slice(-2)
    return b && viewOf(a, b) ? { from: a, to: b } : { from: doc.views[0].id, to: doc.views[0].id }
  })
  const fp = viewOf(span.from, span.to)
  const pick = (from, to) => { if (viewOf(from, to)) setSpan({ from, to }) }
  const anchors = (fp.anchors || []).map(a => {
    const f = faces.get(a.slug)
    return { ...a, headshot: f && f.headshot, headshotVersion: f && f.headshotVersion }
  })
  const sections = [
    { id: 'mates', title: 'MATES', tiles: fp.effects.filter(e => e.mates) },
    { id: 'off', title: 'OFFENSE', tiles: fp.effects.filter(e => e.side === 'off' && !e.mates) },
    { id: 'def', title: 'DEFENSE', tiles: fp.effects.filter(e => e.side === 'def') }
  ].filter(sec => sec.tiles.length)
  // His team's points per 100 scored and allowed with him on against the league's (rORTG,
  // rDRTG), and from him off to on; blue where it helps (more scored, fewer allowed).
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
  const row = sec => (
    <div key={sec.id} className="fp-row" style={{ display: 'grid', gridTemplateColumns: '128px minmax(0, 1fr)', columnGap: 14, padding: '14px 0', borderTop: `1px solid ${RULE}`, fontFamily: MONO }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2, minWidth: 0 }}>
        <span style={{ fontSize: 10, letterSpacing: '.22em', color: DIM }}>TEAM</span>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '.1em', lineHeight: 1.1, color: INK }}>{sec.title}</span>
      </div>
      <div className="fp-row-tiles" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 1, padding: 1, alignSelf: 'start' }}>
        {sec.tiles.map((e, i) => <FootprintTile key={e.key} e={e} anchors={anchors} right={i >= cols / 2} />)}
      </div>
    </div>
  )
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 24px', alignItems: 'center', fontFamily: MONO }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px' }}>
          <SeasonPicker seasons={doc.seasons} from={span.from} to={span.to} n={fp.seasons.length} pick={pick} />
          <p style={{ margin: 0, maxWidth: '72ch', fontSize: 12, lineHeight: 1.6, color: '#b3ada6', textWrap: 'pretty' }}>in {lastName(p.name)}&apos;s {fp.minutes.on.toLocaleString()} ON court vs {fp.minutes.off.toLocaleString()} OFF</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 11, letterSpacing: '.08em', whiteSpace: 'nowrap' }} title="His team's points per 100 possessions scored (rORTG) and allowed (rDRTG) with him on, against the league's, and the change from him off to on">
          {rating('rORTG', fp.ortg, 1)}
          <span style={{ color: DIM }}>·</span>
          {rating('rDRTG', fp.drtg, -1)}
        </div>
      </div>
      {/* TEAM MATES, then TEAM OFFENSE, then TEAM DEFENSE, a row each. */}
      <div style={{ borderBottom: `1px solid ${RULE}` }}>{sections.map(row)}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', paddingTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.good }} />LIFT</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.bad }} />COST</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.neutral }} />STYLE</span>
        <span style={legendKey}>DIM · WITHIN NOISE OR COMMON</span>
        <span style={legendKey}>BAR · SIZE AMONG PLAYERS&apos; SWINGS</span>
        <span style={legendKey}>HOVER A TILE FOR ITS DETAILS</span>
      </div>
      <Method fp={fp} from={span.from} to={span.to} />
    </>
  )
}
