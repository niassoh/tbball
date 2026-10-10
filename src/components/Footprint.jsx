import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MONO, signed } from '../lib/format.js'
import { bar, changeText, contextRows, seasonsText, shade, strengthOf, toneOf, yearsText } from '../lib/footprint.js'
import { useSeasonType } from '../useSeasonType.js'
import FootprintGlyph from './FootprintGlyph.jsx'
import SectionHeader from './SectionHeader.jsx'

// The Footprint tab: how his team plays differently with him on the floor, adjusted for
// the other nine players and in points per 100 possessions (thinking-bball
// lib/footprint.js; method in docs/footprint-methodology.md), laid out as the Claude
// Design "Footprint" module. Eight footprints, four on each end: those that clear the
// noise are lit (a blue bar for a lift, orange for a cost, as strong as the evidence);
// the rest stay dim. A lit tile's WHY opens the raw on/off swing broken into his own
// effect and the teammates who explain the rest.
const TONES = { good: '#8fb0e6', bad: '#fa962a' }
const INK = '#ece8e3'
const DIM = '#8a847e'
const RULE = '#3d3a37'
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name
const chip = { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', padding: '3px 6px', lineHeight: 1, whiteSpace: 'nowrap', background: 'transparent' }

// The glyph for each tile (the teammate-shot tile's follows its title).
const GLYPH = {
  Creation: 'astPct', Gravity: 'threeRate', Spacing: 'cornerRate', 'Teammate lift': 'efg',
  trips: 'ftRate', tov: 'tovPct', oreb: 'orebPct',
  shots_d: 'oppEfg', tov_d: 'forcedTov', trips_d: 'oppFtRate', oreb_d: 'drebPct'
}

function Why({ t }) {
  const { playerPath } = useSeasonType()
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
        <span role="tooltip" style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 6px)', zIndex: 20, width: 270, background: 'rgba(31, 29, 28, .94)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid #6b655f', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: 1.45, color: INK, textAlign: 'left' }}>
          <span>His team&apos;s raw on/off swing, split by who explains it (pts per 100):</span>
          <span style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 12px', fontFamily: MONO, fontSize: 11 }}>
            {contextRows(t.context).map(r => (
              <span key={r.label} style={{ display: 'contents' }}>
                <span style={{ color: r.strong ? INK : '#c9c3bc', fontWeight: r.strong ? 700 : 400 }}>
                  {r.mate && r.mate.slug ? <Link to={playerPath(r.mate.slug)} style={{ color: INK, borderBottom: `1px solid ${DIM}` }}>{r.label}</Link> : r.label}
                </span>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{signed(r.v)}</span>
              </span>
            ))}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>z {t.z.toFixed(1)} · RELIABILITY {t.reliability.toFixed(2)}</span>
        </span>
      )}
    </span>
  )
}

function FootprintTile({ t }) {
  const lit = t.status === 'notable'
  const tone = toneOf(t)
  const color = lit ? shade(TONES[tone], strengthOf(t)) : DIM
  const b = bar(t.pts)
  return (
    // A lit tile carries a bar of its color across the top edge.
    <div style={{ background: lit ? '#2a2826' : '#2c2a28', boxShadow: `${lit ? `inset 0 3px 0 ${color}, ` : ''}0 0 0 1px ${RULE}`, padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 190, opacity: lit ? 1 : 0.62, fontFamily: MONO }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 'none', width: 28, height: 28, color: lit ? INK : DIM }}><FootprintGlyph stat={GLYPH[t.effect] || GLYPH[t.key]} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.02em', textTransform: 'uppercase', lineHeight: 1.2 }}>{t.effect}</span>
          <span style={{ fontSize: 10, color: DIM, letterSpacing: '.06em', textTransform: 'uppercase' }}>{t.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 500, lineHeight: 1, letterSpacing: '-.02em', color: lit ? color : DIM, fontVariantNumeric: 'tabular-nums' }}>{signed(t.pts)}</span>
          <span style={{ fontSize: 9, color: DIM, letterSpacing: '.08em' }}>PTS/100</span>
        </span>
        <span style={{ fontSize: 10, color: DIM, letterSpacing: '.04em', fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }} title="The adjusted change in the stat with him on"><span style={{ color: '#6b655f' }}>Δ</span> {changeText(t)}</span>
      </div>
      {/* Points on a ±3 scale from zero. */}
      <div style={{ position: 'relative', height: 8 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 1, background: '#4a4642' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 8, background: DIM }} />
        <div style={{ position: 'absolute', top: 3, height: 3, left: `${b.left}%`, width: `${b.width}%`, background: lit ? color : '#6b655f' }} />
      </div>
      {(t.how || t.support) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10, color: '#a8a29c', lineHeight: 1.4 }}>
          {t.how && <span>{t.how}</span>}
          {t.support && <span style={{ color: DIM }}>{t.support}</span>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', minHeight: 18 }}>
        {lit && t.context && <Why t={t} />}
        {!lit && <span style={{ fontSize: 9, letterSpacing: '.12em', color: DIM }}>WITHIN NOISE</span>}
        {t.tier === 'tentative' && <span style={{ ...chip, border: `1px solid ${RULE}`, color: DIM }} title="A less reliable footprint: it needs stronger evidence to light">TENTATIVE</span>}
      </div>
    </div>
  )
}

function Method({ fp }) {
  const [open, setOpen] = useState(false)
  const names = { mates: "Teammates' shot quality", trips: 'Foul pressure', tov: 'Ball security', oreb: 'Offensive glass', shots_d: 'Shot defense', tov_d: 'Turnover pressure', trips_d: 'Foul discipline', oreb_d: 'Defensive glass' }
  const windows = fp.method.calibration.map(w => w.map(s => s.replace('-', '–')).join('+')).join(', ')
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 10, fontFamily: MONO }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ background: 'transparent', border: 0, padding: 0, color: DIM, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', cursor: 'pointer' }}>
        {open ? '▾' : '▸'} HOW THIS WORKS
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, paddingTop: 12, fontSize: 11, lineHeight: 1.6, color: '#c9c3bc' }}>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Every possession of {seasonsText(fp.seasons)} ({fp.method.possessions.toLocaleString()}, garbage time out), rebuilt from raw play-by-play with all ten players on the floor.</li>
            <li>Each footprint is adjusted: a regression credits him only for what changes with him on, given the other nine players. A box-score prior keeps players who share the floor apart.</li>
            <li>Luck-adjusted, the Thinking Basketball way: threes and free throws count at the shooter&apos;s expected percentage, not whether they fell.</li>
            <li>One currency: every footprint is worth so many points per 100 possessions.</li>
            <li>A tile lights when it clears {fp.method.zLit} standard errors ({fp.method.zTentative} for a tentative footprint). Creation, Gravity and Spacing are named from his own passing and shooting.</li>
          </ul>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: DIM, fontSize: 10, letterSpacing: '.08em' }}>RELIABILITY: EVEN- VS ODD-GAME AGREEMENT ({windows})</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 16px', fontVariantNumeric: 'tabular-nums' }}>
              {Object.entries(names).map(([k, label]) => (
                <span key={k} style={{ display: 'contents' }}>
                  <span>{label}</span>
                  <span style={{ textAlign: 'right' }}>{fp.method.reliability[k].r.toFixed(2)}</span>
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
  const { playerPath } = useSeasonType()
  const fp = p.footprint
  const sections = [
    { side: 'off', title: 'OFFENSE' },
    { side: 'def', title: 'DEFENSE' }
  ].map(sec => ({ ...sec, tiles: fp.tiles.filter(t => t.side === sec.side) }))
  const e = fp.entangled
  const legendKey = { display: 'inline-flex', gap: 6, alignItems: 'center' }
  return (
    <section id="sec-footprint" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader title="Footprint">
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: '.08em', textTransform: 'uppercase' }}>{p.name} · {seasonsText(fp.seasons)} REG</span>
      </SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px 24px', alignItems: 'baseline', fontFamily: MONO }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ margin: 0, maxWidth: '72ch', fontSize: 12, lineHeight: 1.6, color: '#a8a29c', textWrap: 'pretty' }}>Team footprint with {lastName(p.name)} ON vs OFF the court ({yearsText(fp.seasons)})</p>
          {e && e.share >= 0.6 && <span style={{ fontSize: 10, color: DIM, lineHeight: 1.5 }}>Plays {Math.round(100 * e.share)}% of his possessions with {e.slug ? <Link to={playerPath(e.slug)} style={{ color: DIM, borderBottom: `1px solid ${RULE}` }}>{e.name}</Link> : e.name}; their footprints are partly told apart by the box score.</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 11, letterSpacing: '.08em', whiteSpace: 'nowrap' }} title="Luck-adjusted points per 100 possessions he adds, adjusted for the other nine players">
          <span><span style={{ color: DIM }}>OFF</span> <span style={{ color: fp.impact.off >= 0 ? TONES.good : TONES.bad }}>{signed(fp.impact.off)}</span></span>
          <span><span style={{ color: DIM }}>DEF</span> <span style={{ color: fp.impact.def >= 0 ? TONES.good : TONES.bad }}>{signed(fp.impact.def)}</span></span>
          <span style={{ color: DIM }}>PTS/100 · {fp.poss.off.toLocaleString()} POSS</span>
        </div>
      </div>
      {sections.map(sec => (
        <div key={sec.side} style={{ display: 'flex', flexDirection: 'column', fontFamily: MONO }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '12px 0 10px' }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.14em' }}>{sec.title}</span>
            <span style={{ fontSize: 11, color: DIM, letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{sec.tiles.filter(t => t.status === 'notable').length} OF {sec.tiles.length} CLEAR THE NOISE</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 1, padding: 1 }}>
            {sec.tiles.map(t => <FootprintTile key={t.key} t={t} />)}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', paddingTop: 4, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: DIM }}>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.good }} />LIFT</span>
        <span style={legendKey}><span style={{ width: 14, height: 3, background: TONES.bad }} />COST</span>
        <span style={legendKey}>DIM · WITHIN NOISE</span>
        <span style={legendKey}>BAR · PTS/100 FROM 0, ±3 SCALE</span>
      </div>
      <Method fp={fp} />
    </section>
  )
}
