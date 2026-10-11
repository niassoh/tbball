import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MONO } from '../lib/format.js'
import { UNITS, bar, seasonsOf, seasonsText, shade, strengthOf, swingText, toneOf, yearsText } from '../lib/footprint.js'
import { useSeasonType } from '../useSeasonType.js'
import FootprintGlyph from './FootprintGlyph.jsx'
import SectionHeader from './SectionHeader.jsx'

// The Footprint tab: how his team's play changes with him on the floor vs. off it, from
// his teams' five-man lineup totals over his last two regular seasons (thinking-bball
// lib/footprint.js), laid out as the Claude Design "Footprint" module. Each tile is a
// team stat with him on minus off; those that clear the noise and stand out against the
// league's swings are lit (blue for a lift, orange for a cost, ink for a style stat, as
// strong as the evidence), and their WHY says whether the swing survives the teammates
// whose minutes move with his.
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#c9c3bc' }
const INK = '#ece8e3'
const DIM = '#8a847e'
const RULE = '#3d3a37'
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name
const one = v => v.toFixed(1)
const chip = { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', padding: '3px 6px', lineHeight: 1, whiteSpace: 'nowrap', background: 'transparent' }
// Why an unlit tile is unlit.
const UNLIT = { noise: 'WITHIN NOISE', typical: 'COMMON SWING', thin: 'TOO FEW MINUTES' }

// The teammate named in a check's text, linked to his profile wherever it appears.
function Named({ text, mate }) {
  const { playerPath } = useSeasonType()
  if (!mate || !mate.slug || !mate.name || !text.includes(mate.name)) return text
  return text.split(mate.name).flatMap((part, i) => (i === 0 ? [part] : [
    <Link key={i} to={playerPath(mate.slug)} style={{ color: INK, borderBottom: `1px solid ${DIM}` }}>{mate.name}</Link>,
    part
  ]))
}

function Why({ e }) {
  const [open, setOpen] = useState(false)
  const closing = useRef(null)
  const show = on => {
    clearTimeout(closing.current)
    if (on) setOpen(true)
    else closing.current = setTimeout(() => setOpen(false), 150)
  }
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => show(true)} onMouseLeave={() => show(false)}>
      <button type="button" onFocus={() => show(true)} onBlur={() => show(false)} onClick={() => setOpen(o => !o)} style={{ ...chip, border: `1px solid ${INK}`, color: INK, cursor: 'help' }}>WHY</button>
      {open && (
        <span role="tooltip" style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 6px)', zIndex: 20, width: 280, background: 'rgba(31, 29, 28, .94)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid #6b655f', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: 1.45, color: INK, textAlign: 'left' }}>
          <span>{e.label}: {one(e.off)} with him off, {one(e.on)} with him on ({swingText(e.diff)}).</span>
          <span style={{ color: '#c9c3bc' }}><Named text={e.context.text} mate={e.context.mate} /></span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>z {e.z.toFixed(1)} · BIGGER THAN {e.pctl}% OF PLAYERS&apos; SWINGS</span>
        </span>
      )}
    </span>
  )
}

function FootprintTile({ e }) {
  const lit = e.status === 'notable'
  const color = lit ? shade(TONES[toneOf(e)], strengthOf(e)) : DIM
  const b = bar(e)
  return (
    // A lit tile carries a bar of its color across the top edge.
    <div style={{ background: lit ? '#2a2826' : '#2c2a28', boxShadow: `${lit ? `inset 0 3px 0 ${color}, ` : ''}0 0 0 1px ${RULE}`, padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 170, opacity: lit ? 1 : 0.62, fontFamily: MONO }}>
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
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', minHeight: 18 }}>
        {lit && e.context && <Why e={e} />}
        {lit && e.borderline && <span style={{ ...chip, border: `1px solid ${RULE}`, color: DIM }} title="Just clears the bar, or on a thin sample">BORDERLINE</span>}
        {!lit && <span style={{ fontSize: 9, letterSpacing: '.12em', color: DIM }}>{UNLIT[e.status]}</span>}
      </div>
    </div>
  )
}

function Method({ fp }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 10, fontFamily: MONO }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ background: 'transparent', border: 0, padding: 0, color: DIM, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', cursor: 'pointer' }}>
        {open ? '▾' : '▸'} HOW THIS WORKS
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, paddingTop: 12, fontSize: 11, lineHeight: 1.6, color: '#c9c3bc' }}>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Raw on/off: each stat is his team&apos;s with him on the floor minus with him off, summed over every five-man lineup his teams used in {seasonsText(seasonsOf(fp))} (regular season).</li>
            <li>Each team-season is measured against that team, then the seasons are combined; a player traded mid-season counts only over his time there.</li>
            <li>A tile lights when its swing clears its own noise (z of 2.5 or more) and is bigger than three quarters of players&apos; swings in that stat.</li>
            <li>A lit tile is checked against the teammates whose minutes move with his: the one he plays with most and the one who takes his minutes. WHY says whether the swing holds without them.</li>
            <li>Rim scoring and Rim protection count points at the rim per 100 possessions, so getting there and finishing are one number.</li>
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

export default function Footprint({ profile: p }) {
  const fp = p.footprint
  const seasons = seasonsOf(fp)
  const sections = [
    { side: 'off', title: 'OFFENSE' },
    { side: 'def', title: 'DEFENSE' }
  ].map(sec => ({ ...sec, tiles: fp.effects.filter(e => e.side === sec.side) }))
  // His team's points per 100 scored (OFF) and kept off the board (DEF), on minus off.
  const offSwing = fp.ortg.on - fp.ortg.off
  const defSwing = fp.drtg.off - fp.drtg.on
  const legendKey = { display: 'inline-flex', gap: 6, alignItems: 'center' }
  return (
    <section id="sec-footprint" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader title="Footprint">
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: '.08em', textTransform: 'uppercase' }}>{p.name} · {seasonsText(seasons)} REG</span>
      </SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 24px', alignItems: 'baseline', fontFamily: MONO }}>
        <p style={{ margin: 0, maxWidth: '72ch', fontSize: 12, lineHeight: 1.6, color: '#a8a29c', textWrap: 'pretty' }}>Team footprint with {lastName(p.name)} ON vs OFF the court ({yearsText(seasons)})</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 11, letterSpacing: '.08em', whiteSpace: 'nowrap' }} title="His team's points per 100 possessions scored (OFF) and kept off the board (DEF), with him on minus off">
          <span><span style={{ color: DIM }}>OFF</span> <span style={{ color: offSwing >= 0 ? TONES.good : TONES.bad }}>{swingText(offSwing)}</span></span>
          <span><span style={{ color: DIM }}>DEF</span> <span style={{ color: defSwing >= 0 ? TONES.good : TONES.bad }}>{swingText(defSwing)}</span></span>
          <span style={{ color: DIM }}>PTS/100 ON−OFF · {fp.minutes.on.toLocaleString()} MIN ON</span>
        </div>
      </div>
      {sections.map(sec => (
        <div key={sec.side} style={{ display: 'flex', flexDirection: 'column', fontFamily: MONO }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '12px 0 10px' }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.14em' }}>{sec.title}</span>
            <span style={{ fontSize: 11, color: DIM, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{sec.tiles.filter(e => e.status === 'notable').length} OF {sec.tiles.length} CLEAR THE NOISE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 1, padding: 1 }}>
            {sec.tiles.map(e => <FootprintTile key={e.key} e={e} />)}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', paddingTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.good }} />LIFT</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.bad }} />COST</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.neutral }} />STYLE</span>
        <span style={legendKey}>DIM · WITHIN NOISE OR COMMON</span>
        <span style={legendKey}>BAR · SIZE AMONG PLAYERS&apos; SWINGS</span>
      </div>
      <Method fp={fp} />
    </section>
  )
}
