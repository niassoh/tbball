import { useEffect, useState } from 'react'
import { fetchFootprint } from '../api.js'
import { MONO } from '../lib/format.js'
import { MEDAL_SHARES, UNITS, anchorName, bar, medalOf, rankText, shade, strengthOf, swingText, toneOf, valueText, wowyText, wowyVerdict } from '../lib/footprint.js'
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
const DIM = '#8a847e'
const RULE = '#3d3a37'
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name
const one = v => v.toFixed(1)
const chip = { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', padding: '3px 6px', lineHeight: 1, whiteSpace: 'nowrap', background: 'transparent' }
// Why an unlit tile is unlit.
const UNLIT = { noise: 'WITHIN NOISE', typical: 'COMMON SWING', thin: 'TOO FEW MINUTES', na: "NOT IN THIS SEASON'S DATA YET" }
// The medals' colors: gold, silver and bronze for the league's top 1, 2 and 3%.
const MEDALS = ['#d4af37', '#c3c9cf', '#b8794a']

// A rank's mark: a small solid square of its medal's color, the rank text in the same
// color after it.
function Medal({ tier }) {
  return <span title={`In the league's top ${Math.round(MEDAL_SHARES[tier - 1] * 100)}%`} style={{ display: 'inline-block', width: 6, height: 6, background: MEDALS[tier - 1], flex: 'none' }} />
}

function FootprintTile({ e, anchor }) {
  const lit = e.status === 'notable'
  const color = lit ? shade(TONES[toneOf(e)], strengthOf(e)) : DIM
  const b = bar(e)
  const medal = medalOf(e)
  const small = { fontSize: 9.5, letterSpacing: '.06em', fontVariantNumeric: 'tabular-nums' }
  return (
    // A lit tile carries a bar of its color across the top edge.
    <div style={{ background: lit ? '#2a2826' : '#2c2a28', boxShadow: `${lit ? `inset 0 3px 0 ${color}, ` : ''}0 0 0 1px ${RULE}`, padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 196, opacity: lit ? 1 : 0.62, fontFamily: MONO }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 'none', width: 28, height: 28, color: lit ? INK : DIM }}><FootprintGlyph stat={e.key} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.02em', textTransform: 'uppercase', lineHeight: 1.2 }}>{e.effect}</span>
          <span style={{ fontSize: 10, color: DIM, letterSpacing: '.06em', textTransform: 'uppercase' }}>{e.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px 8px', marginTop: 'auto' }}>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, letterSpacing: '-.02em', color: lit ? color : DIM, fontVariantNumeric: 'tabular-nums' }}>{swingText(e.diff)}</span>
          <span style={{ fontSize: 9, color: DIM, letterSpacing: '.08em' }}>{UNITS[e.unit]}</span>
        </span>
        {e.on !== null && <span style={{ fontSize: 10, color: DIM, letterSpacing: '.04em', fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }}>{one(e.off)} <span style={{ color: '#6b655f' }}>OFF</span> → {one(e.on)} <span style={{ color: '#6b655f' }}>ON</span></span>}
      </div>
      {/* How big the swing is among players' swings in this stat: right a lift, left a cost. */}
      <div style={{ position: 'relative', height: 8 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 1, background: '#4a4642' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 8, background: DIM }} />
        <div style={{ position: 'absolute', top: 3, height: 3, left: `${b.left}%`, width: `${b.width}%`, background: lit ? color : '#6b655f' }} />
      </div>
      {/* His on value against the league's, and where it ranks at the league's ends. */}
      {e.r !== null && e.r !== undefined && (
        <div style={{ ...small, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '2px 8px', color: DIM }} title="With him on, against the league that season">
          <span>ON {swingText(e.r)} VS LG <span style={{ color: '#6b655f' }}>({valueText(e, e.lg)})</span></span>
          {e.rank && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: medal ? MEDALS[medal - 1] : '#c9c3bc' }}>{medal && <Medal tier={medal} />}{rankText(e.rank)}</span>}
        </div>
      )}
      {e.wowy && <div style={{ ...small, color: '#a8a29c' }}>{wowyText(e.wowy, anchor)}</div>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', minHeight: 18 }}>
        {lit && e.borderline && <span style={{ ...chip, border: `1px solid ${RULE}`, color: DIM }} title="Just clears the bar, or on a thin sample">BORDERLINE</span>}
        {lit && e.wowy && <span style={{ ...chip, border: `1px solid ${RULE}`, color: '#c9c3bc' }} title={`With and without ${anchor}`}>{wowyVerdict(e.wowy)}</span>}
        {!lit && <span style={{ fontSize: 9, letterSpacing: '.12em', color: DIM }}>{UNLIT[e.status]}</span>}
      </div>
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
            <li>Teammate stats are also measured again with his best-OBPM teammate on the floor (W/) and off it (W/O): the swing holds either way, comes only with or only without that teammate, or shrinks in both.</li>
            <li>VS LG is the on value against the league&apos;s that season; the rank is its place among every qualified player&apos;s at either end, and an on value in the league&apos;s top 3% at the end that helps his team gets a medal: gold for the top 1%, silver the top 2%, bronze the top 3%.</li>
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

// The tab fetches its views (every season and span) when opened.
export default function Footprint({ profile: p }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    let live = true
    fetchFootprint(p.slug).then(d => live && setDoc(d), () => live && setDoc(false))
    return () => { live = false }
  }, [p.slug])
  return (
    <section id="sec-footprint" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader title="Footprint" />
      {doc
        ? <Views p={p} doc={doc} />
        : <div style={{ border: `1px solid ${RULE}`, minHeight: 600, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }}>{doc === false ? 'Unavailable' : 'Loading'}</div>}
    </section>
  )
}

// The span on show (his latest season alone at first) and its tiles.
function Views({ p, doc }) {
  const [span, setSpan] = useState({ from: doc.views[0].id, to: doc.views[0].id })
  const viewOf = (from, to) => doc.views.find(v => v.id === spanId(from, to))
  const fp = viewOf(span.from, span.to)
  const pick = (from, to) => { if (viewOf(from, to)) setSpan({ from, to }) }
  const anchor = anchorName(fp.anchors)
  const left = `${lastName(p.name).toUpperCase()}'S SHOTS LEFT OUT`
  const sections = [
    { id: 'mates', title: 'MATES', note: (fp.anchors || []).length ? `${left} · CHECKED WITH AND WITHOUT ${anchor}` : left, tiles: fp.effects.filter(e => e.mates) },
    { id: 'off', title: 'OFFENSE', tiles: fp.effects.filter(e => e.side === 'off' && !e.mates) },
    { id: 'def', title: 'DEFENSE', tiles: fp.effects.filter(e => e.side === 'def') }
  ].filter(sec => sec.tiles.length)
  // His team's points per 100 scored (OFF) and kept off the board (DEF), on minus off, and
  // its points per 100 with him on against the league's.
  const offSwing = fp.ortg.on - fp.ortg.off
  const defSwing = fp.drtg.off - fp.drtg.on
  const ortg = fp.effects.find(e => e.key === 'ortg')
  const legendKey = { display: 'inline-flex', gap: 6, alignItems: 'center' }
  const row = sec => (
    <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', fontFamily: MONO, minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline', padding: '12px 0 10px' }}>
        {/* TEAM, then the row's word on a solid block of muted grey. */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, letterSpacing: '.14em' }}>
          TEAM<span style={{ background: '#a8a29c', color: '#1f1d1c', padding: '2px 5px 1px 6px', lineHeight: 1.1 }}>{sec.title}</span>
        </span>
        {sec.note && <span style={{ fontSize: 10, color: '#6b655f', letterSpacing: '.08em' }}>{sec.note}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 1, padding: 1 }}>
        {sec.tiles.map(e => <FootprintTile key={e.key} e={e} anchor={anchor} />)}
      </div>
    </div>
  )
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 24px', alignItems: 'center', fontFamily: MONO }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px' }}>
          <SeasonPicker seasons={doc.seasons} from={span.from} to={span.to} n={fp.seasons.length} pick={pick} />
          <p style={{ margin: 0, maxWidth: '72ch', fontSize: 12, lineHeight: 1.6, color: '#a8a29c', textWrap: 'pretty' }}>Team footprint with {lastName(p.name)} ON vs OFF the court</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 11, letterSpacing: '.08em', whiteSpace: 'nowrap' }} title="His team's points per 100 possessions scored (OFF) and kept off the board (DEF), with him on minus off">
          <span><span style={{ color: DIM }}>OFF</span> <span style={{ color: offSwing >= 0 ? TONES.good : TONES.bad }}>{swingText(offSwing)}</span></span>
          <span><span style={{ color: DIM }}>DEF</span> <span style={{ color: defSwing >= 0 ? TONES.good : TONES.bad }}>{swingText(defSwing)}</span></span>
          <span style={{ color: DIM }}>PTS/100 ON−OFF · {fp.minutes.on.toLocaleString()} MIN ON</span>
          {ortg && ortg.r !== null && ortg.r !== undefined && (
            <span title="His team's points per 100 possessions with him on, against the league's"><span style={{ color: DIM }}>ON-COURT rORTG</span> <span style={{ color: ortg.r >= 0 ? TONES.good : TONES.bad }}>{swingText(ortg.r)}</span></span>
          )}
        </div>
      </div>
      {/* TEAM MATES across the top; TEAM OFFENSE and TEAM DEFENSE side by side under it
          (one above the other on a narrow screen). */}
      {sections.filter(sec => sec.id === 'mates').map(row)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '0 24px', alignItems: 'start' }}>
        {sections.filter(sec => sec.id !== 'mates').map(row)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', paddingTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.good }} />LIFT</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.bad }} />COST</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.neutral }} />STYLE</span>
        <span style={legendKey}>DIM · WITHIN NOISE OR COMMON</span>
        <span style={legendKey}>BAR · SIZE AMONG PLAYERS&apos; SWINGS</span>
      </div>
      <Method fp={fp} from={span.from} to={span.to} />
    </>
  )
}
