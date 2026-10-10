import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MONO, ord, signed } from '../lib/format.js'
import { STAMPS, mateSegments, meter, toneOf } from '../lib/footprint.js'
import { useSeasonType } from '../useSeasonType.js'
import SectionHeader from './SectionHeader.jsx'

const cell = { borderRight: '1px solid #544f4b', borderBottom: '1px solid #544f4b', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }
const blurb = { margin: 0, fontSize: 12, lineHeight: 1.5, color: '#b8b2ab', textWrap: 'pretty' }
const label = { fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#8a847e' }

function CellHeader({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid #544f4b', paddingBottom: 10 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>{title}</h3>
      <p style={blurb}>{children}</p>
    </div>
  )
}

// Diverging bar centered at 50% (design's div()).
const diverge = (v, max) => ({
  left: v >= 0 ? '50%' : `${(50 + (Math.max(v, -max) / max) * 50).toFixed(1)}%`,
  width: `${((Math.min(Math.abs(v), max) / max) * 50).toFixed(1)}%`,
  background: v >= 0 ? '#597ec1' : '#fa962a'
})

// ORTG On / DRTG On per season (README §7 "grav"). The design's rim-points copy
// describes a different metric, so the text here says what is shown.
function Gravity({ grav }) {
  const GMAX = 15
  const rows = [...grav.seasons.map(s => ({ ...s, career: false })), { season: 'Career', ...grav.career, career: true }]
  const grid = { display: 'grid', gridTemplateColumns: '64px 52px 52px minmax(0,1fr) 44px', gap: 10 }
  return (
    <div style={cell}>
      <CellHeader title="On-Court Ratings">Team offensive and defensive rating per 100 possessions with him on the floor, last five seasons. The bar is the net margin.</CellHeader>
      <div style={{ ...grid, ...label }}>
        <span>SEASON</span><span style={{ textAlign: 'right' }}>ORTG</span><span style={{ textAlign: 'right' }}>DRTG</span><span>NET ON</span><span style={{ textAlign: 'right' }}>Δ</span>
      </div>
      {rows.map(r => {
        const d = r.on - r.off
        return (
          <div key={r.season} style={{ ...grid, alignItems: 'center', fontFamily: MONO, fontSize: 12, padding: '3px 0', borderTop: r.career ? '1px solid #544f4b' : 'none' }}>
            <span style={{ fontWeight: 600, color: r.career ? '#ece8e3' : '#a8a29c' }}>{r.season}</span>
            <span style={{ textAlign: 'right' }}>{r.on.toFixed(1)}</span>
            <span style={{ textAlign: 'right', color: '#a8a29c' }}>{r.off.toFixed(1)}</span>
            <div style={{ position: 'relative', height: 12, background: '#34312e' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(Math.max(0, Math.min(d, GMAX)) / GMAX * 100).toFixed(1)}%`, background: r.career ? 'var(--accent)' : '#597ec1' }} />
            </div>
            <span style={{ textAlign: 'right', fontWeight: 600, color: d >= 0 ? '#ece8e3' : '#fa962a' }}>{signed(d)}</span>
          </div>
        )
      })}
    </div>
  )
}

function PlayoffRiser({ riser, stats }) {
  const grid = { display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) repeat(3,minmax(0,1fr))', gap: 8 }
  const dec = l => (stats[l] ? stats[l].dec : 1)
  const runs = `${riser.runs} RUN${riser.runs === 1 ? '' : 'S'} · ${riser.span[0]}–${riser.span[1]} · ${riser.teams.join('/')}`
  return (
    <div style={cell}>
      <CellHeader title="Playoff Riser">Change from regular season to playoffs on the same stats, over the seasons with both. The rise score is the change in BPM.</CellHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #544f4b' }}>
        <div style={{ padding: 12, borderRight: '1px solid #544f4b', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={label}>RISE SCORE</span>
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{riser.score === null ? '—' : signed(riser.score)}</span>
          {riser.pctl !== null && <span style={{ alignSelf: 'flex-start', fontFamily: MONO, fontSize: 10, fontWeight: 600, color: '#1f1d1c', background: riser.score >= 0 ? '#597ec1' : '#fa962a', padding: '2px 6px' }}>{ord(riser.pctl).toUpperCase()} PCT</span>}
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={label}>PLAYOFF SAMPLE</span>
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{riser.poGP} GP</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#8a847e' }}>{runs}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...grid, ...label, padding: '4px 0', borderBottom: '1px solid #544f4b' }}><span>STAT</span><span style={{ textAlign: 'right' }}>RS</span><span style={{ textAlign: 'right' }}>PO</span><span style={{ textAlign: 'right' }}>Δ</span></div>
        {riser.rows.map(r => (
          <div key={r.l} style={{ ...grid, fontFamily: MONO, fontSize: 12, padding: '6px 0', borderBottom: '1px solid #3d3a37', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 600 }}>{r.l}</span>
            <span style={{ textAlign: 'right' }}>{r.rs.toFixed(dec(r.l))}</span>
            <span style={{ textAlign: 'right' }}>{r.po.toFixed(dec(r.l))}</span>
            <span style={{ textAlign: 'right', padding: '2px 4px', background: r.d >= 0 ? 'rgba(89,126,193,.4)' : 'rgba(250,150,42,.35)' }}>{signed(r.d, dec(r.l))}</span>
          </div>
        ))}
      </div>
      <span style={label}>CAREER RS VS. PO</span>
    </div>
  )
}

function Wowy({ wowy, onOff }) {
  const grid = { display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1.4fr) 52px 52px', gap: 10 }
  return (
    <div style={cell}>
      <CellHeader title="WOWY">Team net rating per 100 with him on the floor vs. off it, and on-court splits without key teammates. {wowy ? `${wowy.season.replace('-', '–')}${wowy.rows[0] && / playoffs /.test(wowy.rows[0].sub) ? ' playoffs' : ''}, ${wowy.team}.` : ''}</CellHeader>
      {wowy && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ ...grid, ...label, padding: '4px 0', borderBottom: '1px solid #544f4b' }}><span>SPLIT</span><span style={{ textAlign: 'center' }}>NET / 100</span><span style={{ textAlign: 'right' }}>NET</span><span style={{ textAlign: 'right' }}>MIN</span></div>
          {wowy.rows.map(r => (
            <div key={r.label} style={{ ...grid, alignItems: 'center', fontFamily: MONO, fontSize: 12, padding: '7px 0', borderBottom: '1px solid #3d3a37' }}>
              <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 600, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span>{r.label}</span><span style={{ fontFamily: MONO, fontSize: 9, color: '#8a847e', fontWeight: 400 }}>{r.sub}</span>
              </span>
              <div style={{ position: 'relative', height: 12, background: '#34312e' }}>
                <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#8a847e' }} />
                {r.net !== null && <div style={{ position: 'absolute', top: 0, bottom: 0, ...diverge(r.net, 15) }} />}
              </div>
              <span style={{ textAlign: 'right', color: r.net === null || r.net >= 0 ? '#ece8e3' : '#fa962a', fontWeight: 600 }}>{r.net === null ? '—' : signed(r.net)}</span>
              <span style={{ textAlign: 'right', color: '#8a847e' }}>{r.minutes.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {onOff && (
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #544f4b', paddingTop: 10, fontFamily: MONO, fontSize: 11 }}>
          <span style={{ color: '#a8a29c' }}>CAREER ON/OFF</span>
          <span style={{ color: onOff.value >= 0 ? '#8fb0e6' : '#fa962a', fontWeight: 600 }}>{signed(onOff.value)} · {ord(onOff.pctl).toUpperCase()} PCT</span>
        </div>
      )}
    </div>
  )
}

// Footprint: what changes for his team with him on the floor vs. off it (thinking-bball
// lib/footprint.js). Each tile is an effect named in basketball terms, its swing (blue
// when the team is better with him on, orange when worse), the stat behind it, a meter
// from off to on with the league value marked, its confidence (pips) and what the
// teammate checks found (the stamp; hover or focus it for the details).
const TONES = { good: '#8fb0e6', bad: '#fa962a', neutral: '#a8a29c' }
const FILL = { good: '#597ec1', bad: '#fa962a', neutral: '#8a847e' }
const fmt1 = v => (v === null || v === undefined ? '—' : v.toFixed(1))
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name

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
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => show(true)} onMouseLeave={() => show(false)}>
      <button type="button" onFocus={() => show(true)} onBlur={() => show(false)} onClick={() => setOpen(o => !o)} style={{ background: 'transparent', border: '1px solid #6b655f', color: '#d6d1cb', fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: '.1em', padding: '2px 6px', cursor: 'help' }}>
        {STAMPS[c.kind]}
      </button>
      {open && (
        <span role="tooltip" style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 6px)', zIndex: 20, width: 250, background: 'rgba(31, 29, 28, .94)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid #6b655f', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: 1.45, color: '#ece8e3', textAlign: 'left' }}>
          <span>
            {mateSegments(c.text, c.mate).map((seg, i) => (seg.mate
              ? (seg.mate.slug ? <Link key={i} to={playerPath(seg.mate.slug)} style={{ color: '#ece8e3', borderBottom: '1px solid #8a847e' }}>{seg.mate.name}</Link> : <span key={i}>{seg.mate.name}</span>)
              : <span key={i}>{seg.text}</span>))}
          </span>
          {c.check && c.mate && <span style={{ fontFamily: MONO, fontSize: 10, color: '#a8a29c', textTransform: 'uppercase' }}>{lastName(c.mate.name)} {c.check.kind === 'partner' ? 'OFF BOTH WAYS' : 'ALSO OFF'}: {fmt1(c.check.off)} → {fmt1(c.check.on)} ({signed(c.check.gap)})</span>}
        </span>
      )}
    </span>
  )
}

function FootprintTile({ s }) {
  const tone = toneOf(s)
  const m = meter(s)
  return (
    <div style={{ border: '1px solid #544f4b', background: '#2c2a28', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 168 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e' }}>
        <span>{s.side === 'off' ? 'OFFENSE' : 'DEFENSE'}</span>
        <span title={`z ${s.z} · bigger than ${s.pctl}% of players' swings`} aria-label={`confidence ${s.pips} of 3`} style={{ letterSpacing: '.15em', color: '#a8a29c' }}>{'●'.repeat(s.pips)}{'○'.repeat(3 - s.pips)}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', lineHeight: 1.15 }}>{s.effect}</span>
      <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, lineHeight: 1, color: TONES[tone] }}>{signed(s.diff)}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#8a847e' }}>{s.label}{s.luck ? ' · MOSTLY VARIANCE' : ''}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#d6d1cb' }}>{fmt1(s.off)} <span style={{ color: '#6b655f' }}>OFF</span> → {fmt1(s.on)} <span style={{ color: '#6b655f' }}>ON</span></span>
      </div>
      {/* Off (hollow) to on (filled) on one scale; the tick is the league's value. */}
      <div style={{ position: 'relative', height: 10, margin: '2px 4px' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 2, background: '#3d3a37' }} />
        {m.lg !== null && <div title={`League ${fmt1(s.lg)}`} style={{ position: 'absolute', left: `${m.lg}%`, top: 0, width: 1, height: 10, background: '#6b655f' }} />}
        <div style={{ position: 'absolute', left: `${Math.min(m.off, m.on)}%`, width: `${Math.abs(m.on - m.off)}%`, top: 4, height: 2, background: FILL[tone] }} />
        <div style={{ position: 'absolute', left: `${m.off}%`, top: 1, width: 8, height: 8, marginLeft: -4, borderRadius: '50%', border: '1.5px solid #8a847e', background: '#2c2a28', boxSizing: 'border-box' }} />
        <div style={{ position: 'absolute', left: `${m.on}%`, top: 0, width: 10, height: 10, marginLeft: -5, borderRadius: '50%', background: FILL[tone] }} />
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Stamp s={s} />
        {s.borderline && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e' }}>BORDERLINE</span>}
      </div>
      {s.also.length > 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: '#8a847e' }}>also {s.also.map(a => `${a.label} ${signed(a.diff)}`).join(' · ')}</span>}
    </div>
  )
}

function Footprint({ fp }) {
  const list = (names, color) => (names.length ? names.map((n, i) => <span key={n} style={{ color }}>{i ? ' · ' : ''}{n}</span>) : <span style={{ color: '#6b655f' }}>—</span>)
  const other = [fp.quiet && `${fp.quiet} other stats within noise`, fp.ordinary && `${fp.ordinary} real but typical`].filter(Boolean)
  return (
    <div style={{ ...cell, gridColumn: '1 / -1' }}>
      <CellHeader title="Footprint">What changes for {fp.team} with him on the floor vs. off it, {fp.season.replace('-', '–')} regular season. Only swings that clear the noise and stand out against the league's, each checked against the teammates who take his minutes and play beside him.</CellHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 28px', fontSize: 12, fontWeight: 700, letterSpacing: '.02em' }}>
        <span><span style={{ ...label, marginRight: 8 }}>LIFTS</span>{list(fp.lifts, TONES.good)}</span>
        <span><span style={{ ...label, marginRight: 8 }}>COSTS</span>{list(fp.costs, TONES.bad)}</span>
      </div>
      {fp.stats.length
        ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 8 }}>{fp.stats.map(s => <FootprintTile key={s.key} s={s} />)}</div>
        : <span style={{ ...label, padding: '14px 0' }}>NOTHING CLEARS THE NOISE: HIS TEAM PLAYS ABOUT THE SAME WITH HIM ON OR OFF.</span>}
      <span style={{ ...label, fontSize: 9.5, lineHeight: 1.6 }}>
        TEAM ORTG {fmt1(fp.ortg.on)} ON / {fmt1(fp.ortg.off)} OFF ({signed(fp.ortg.on - fp.ortg.off)}) · DRTG {fmt1(fp.drtg.on)} / {fmt1(fp.drtg.off)} ({signed(fp.drtg.on - fp.drtg.off)})
        {other.length ? ` · ${other.join(' · ')}` : ''} · {fp.minutes.on.toLocaleString()} MIN ON / {fp.minutes.off.toLocaleString()} OFF
      </span>
    </div>
  )
}

export default function Career({ profile: p, num }) {
  return (
    <section id="sec-career" style={{ scrollMarginTop: 'calc(var(--topbar-h, 0px) + 48px)', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader num={num} title="Career" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', borderTop: '1px solid #544f4b', borderLeft: '1px solid #544f4b' }}>
        {p.footprint && p.seasonType !== 'playoffs' && <Footprint fp={p.footprint} />}
        {p.grav && <Gravity grav={p.grav} />}
        {p.riser && <PlayoffRiser riser={p.riser} stats={p.stats} />}
        {(p.wowy || p.onOff) && <Wowy wowy={p.wowy} onOff={p.onOff} />}
      </div>
    </section>
  )
}
