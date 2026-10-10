import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MONO, signed } from '../lib/format.js'
import { STAMPS, mateSegments, meter, netSwing, shade, spanText, strengthOf, tagOf, yearsText } from '../lib/footprint.js'
import { useSeasonType } from '../useSeasonType.js'
import FootprintGlyph from './FootprintGlyph.jsx'
import SectionHeader from './SectionHeader.jsx'

// The Footprint tab: what changes for his team with him on the floor vs. off it
// (thinking-bball lib/footprint.js), laid out as the Claude Design "Footprint" module: every offense and
// defense effect as a tile. Each has its glyph, its swing, off → on
// with a meter (hollow square off, filled on, tick the league) and, when notable, what
// the teammate checks found (the stamp; hover or focus it for the details). Notable
// lifts (blue) and costs (orange) are lit; the rest are dim, tagged with how they fared.
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#8a847e' }
const INK = '#ece8e3'
const DIM = '#8a847e'
const RULE = '#3d3a37'
const fmt1 = v => (v === null || v === undefined ? '—' : v.toFixed(1))
const pad2 = n => String(n).padStart(2, '0')
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name
const chip = { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', padding: '3px 6px', lineHeight: 1, whiteSpace: 'nowrap', background: 'transparent' }

function Stamp({ s }) {
  const { playerPath } = useSeasonType()
  const [open, setOpen] = useState(false)
  const closing = useRef(null)
  const show = on => {
    clearTimeout(closing.current)
    if (on) setOpen(true)
    else closing.current = setTimeout(() => setOpen(false), 150)
  }
  const c = s.context
  const stamp = STAMPS[c.kind]
  const firm = c.kind !== 'thin'
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => show(true)} onMouseLeave={() => show(false)}>
      <button type="button" onFocus={() => show(true)} onBlur={() => show(false)} onClick={() => setOpen(o => !o)} style={{ ...chip, border: `1px solid ${c.kind === 'own' ? INK : firm ? '#6b655f' : RULE}`, color: firm ? INK : DIM, cursor: 'help' }}>
        <span aria-hidden="true">{stamp.icon}</span>{stamp.label}
      </button>
      {open && (
        <span role="tooltip" style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 6px)', zIndex: 20, width: 260, background: 'rgba(31, 29, 28, .94)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid #6b655f', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: 1.45, color: INK, textAlign: 'left' }}>
          <span>
            {mateSegments(c.text, c.mate).map((seg, i) => (seg.mate
              ? (seg.mate.slug ? <Link key={i} to={playerPath(seg.mate.slug)} style={{ color: INK, borderBottom: `1px solid ${DIM}` }}>{seg.mate.name}</Link> : <span key={i}>{seg.mate.name}</span>)
              : <span key={i}>{seg.text}</span>))}
          </span>
          {c.check && c.mate && <span style={{ fontFamily: MONO, fontSize: 10, color: '#a8a29c', textTransform: 'uppercase' }}>{lastName(c.mate.name)} {c.check.kind === 'partner' ? 'OFF BOTH WAYS' : 'ALSO OFF'}: {fmt1(c.check.off)} → {fmt1(c.check.on)} ({signed(c.check.gap)})</span>}
          <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>z {fmt1(s.z)} · BIGGER THAN {s.pctl}% OF PLAYERS&apos; SWINGS</span>
        </span>
      )}
    </span>
  )
}

function FootprintTile({ s }) {
  const { tag, tone, lit } = tagOf(s)
  // A lit tile's blue or orange is as strong as the effect: borderline ones are muted.
  const color = lit ? shade(TONES[tone], strengthOf(s)) : TONES[tone]
  const m = meter(s)
  return (
    // A lit tile (a lift or a cost) carries a bar of its color across the top edge.
    <div style={{ background: lit ? '#2a2826' : '#2c2a28', boxShadow: `${lit ? `inset 0 3px 0 ${color}, ` : ''}0 0 0 1px ${RULE}`, padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 172, opacity: lit ? 1 : 0.62, fontFamily: MONO }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 'none', width: 28, height: 28, color: lit ? INK : DIM }}><FootprintGlyph stat={s.key} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.02em', textTransform: 'uppercase', lineHeight: 1.2 }}>{s.effect}</span>
          <span style={{ fontSize: 10, color: DIM, letterSpacing: '.06em', textTransform: 'uppercase' }}>{s.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
        <span style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, letterSpacing: '-.02em', color, fontVariantNumeric: 'tabular-nums' }}>{s.diff === null ? '—' : signed(s.diff)}</span>
        <span style={{ fontSize: 10, color: DIM, letterSpacing: '.04em', fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt1(s.off)} <span style={{ color: '#6b655f' }}>OFF</span> → {fmt1(s.on)} <span style={{ color: '#6b655f' }}>ON</span></span>
      </div>
      {s.diff !== null && <div style={{ position: 'relative', height: 12 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 5, height: 1, background: '#4a4642' }} />
        <div style={{ position: 'absolute', top: 5, height: 1, left: `${Math.min(m.off, m.on)}%`, width: `${Math.abs(m.on - m.off)}%`, background: color }} />
        {m.lg !== null && <div title={`League ${fmt1(s.lg)}`} style={{ position: 'absolute', top: 1, width: 1, height: 9, background: DIM, left: `${m.lg}%` }} />}
        <div style={{ position: 'absolute', top: 2, width: 7, height: 7, border: `1px solid ${DIM}`, background: '#2a2826', boxSizing: 'border-box', left: `${m.off}%`, transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', top: 2, width: 7, height: 7, background: color, left: `${m.on}%`, transform: 'translateX(-50%)' }} />
      </div>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', minHeight: 18 }}>
        {s.context && <Stamp s={s} />}
        {!lit && <span style={{ fontSize: 9, letterSpacing: '.12em', color: DIM }}>{tag}</span>}
        {s.borderline && <span style={{ ...chip, border: `1px solid ${RULE}`, color: DIM }}><span aria-hidden="true">·</span>BORDERLINE</span>}
      </div>
    </div>
  )
}

export default function Footprint({ profile: p }) {
  const fp = p.footprint
  const name = p.name
  const teams = [...new Set(fp.spans.map(s => s.team))]
  const team = teams.length === 1 ? teams[0] : 'HIS TEAM'
  const net = netSwing(fp)
  const sections = [
    { side: 'off', title: 'OFFENSE', note: `${team} WITH HIM ON` },
    { side: 'def', title: 'DEFENSE', note: `OPPONENT VS. ${team}` }
  ].map(sec => ({ ...sec, tiles: fp.effects.filter(s => s.side === sec.side) }))
  const legendKey = { display: 'inline-flex', gap: 6, alignItems: 'center' }
  return (
    <section id="sec-footprint" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader title="Footprint">
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: '.08em', textTransform: 'uppercase' }}>{name} · {spanText(fp.spans)} REG</span>
      </SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 24px', alignItems: 'baseline', fontFamily: MONO }}>
        <p style={{ margin: 0, maxWidth: '72ch', fontSize: 12, lineHeight: 1.6, color: '#a8a29c', textWrap: 'pretty' }}>Team footprint with {lastName(name)} ON vs OFF the court ({yearsText(fp.spans)})</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 11, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>
          <span><span style={{ color: DIM }}>ON</span> {fp.minutes.on.toLocaleString()} MIN</span>
          <span><span style={{ color: DIM }}>OFF</span> {fp.minutes.off.toLocaleString()} MIN</span>
          <span title="Team net rating per 100 with him on minus off"><span style={{ color: DIM }}>NET</span> <span style={{ color: net >= 0 ? TONES.good : TONES.bad }}>{signed(net)}</span></span>
        </div>
      </div>
      {sections.map(sec => (
        <div key={sec.side} style={{ display: 'flex', flexDirection: 'column', fontFamily: MONO }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '12px 0 10px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.14em' }}>{sec.title}</span>
              <span style={{ fontSize: 11, color: DIM, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{pad2(sec.tiles.length)} EFFECT{sec.tiles.length === 1 ? '' : 'S'}</span>
            </div>
            <span style={{ fontSize: 11, color: DIM, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{sec.note}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 1, padding: 1 }}>
            {sec.tiles.map(s => <FootprintTile key={s.key} s={s} />)}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', paddingTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={legendKey}><span style={{ width: 7, height: 7, border: `1px solid ${DIM}`, boxSizing: 'border-box' }} />OFF</span>
        <span style={legendKey}><span style={{ width: 7, height: 7, background: INK }} />ON</span>
        <span style={legendKey}><span style={{ width: 1, height: 9, background: DIM }} />LEAGUE</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.good }} />LIFT</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.bad }} />COST</span>
        <span style={legendKey}>DIM · NEUTRAL, TYPICAL OR WITHIN NOISE</span>
        <span style={{ marginLeft: 'auto' }}>■ HIS OWN&nbsp;&nbsp;◐ BACKUP&nbsp;&nbsp;◇ PARTNER&nbsp;&nbsp;○ THIN SAMPLE&nbsp;&nbsp;· BORDERLINE</span>
      </div>
    </section>
  )
}
