import { MONO, ord, signed } from '../lib/format.js'
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

export default function Career({ profile: p, num }) {
  return (
    <section id="sec-career" style={{ scrollMarginTop: 48, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader num={num} title="Career" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', borderTop: '1px solid #544f4b', borderLeft: '1px solid #544f4b' }}>
        {p.grav && <Gravity grav={p.grav} />}
        {p.riser && <PlayoffRiser riser={p.riser} stats={p.stats} />}
        {(p.wowy || p.onOff) && <Wowy wowy={p.wowy} onOff={p.onOff} />}
      </div>
    </section>
  )
}
