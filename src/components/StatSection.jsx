import { useState } from 'react'
import { MONO, fmt, heat } from '../lib/format.js'
import { chartModel } from '../lib/chart.js'
import { TEAM_COLORS, teamStints } from '../lib/teams.js'
import SectionHeader from './SectionHeader.jsx'

const pct = (v, of) => `${(v / of * 100).toFixed(2)}%`

// Flat team-color blocks on the chart's x scale (chartModel's X), one per stint,
// each starting on the point of the team's first season and ending on the last.
function TeamTimeline({ seasons }) {
  const L = seasons.length - 1
  const X = f => (L ? Math.min(330, 24 + (f / L) * 282) : 165 + f * 60)
  return (
    <div style={{ position: 'relative', height: 16 }}>
      {teamStints(seasons).map(s => {
        const left = X(s.from)
        const w = X(s.to) - left
        const color = TEAM_COLORS[s.team]
        return (
          <div key={`${s.team}-${s.from}`} title={s.first === s.last ? `${s.team} · ${s.first}` : `${s.team} · ${s.first} – ${s.last}`} style={{ position: 'absolute', top: 0, bottom: 0, left: pct(left, 330), width: `calc(${pct(w, 330)} - 1px)`, background: color ? `color-mix(in srgb, ${color} 70%, #2c2a28)` : '#3d3a37', display: 'flex', alignItems: 'center', gap: 3, padding: w >= 16 ? '0 3px' : 0, boxSizing: 'border-box', overflow: 'hidden' }}>
            {color && w >= 16 && <img src={`/logos/${s.team}.png`} alt="" style={{ width: 10, height: 10, objectFit: 'contain', flex: 'none' }} />}
            {w >= 42 && <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 600, letterSpacing: '.04em', color: '#ece8e3', whiteSpace: 'nowrap' }}>{s.team}</span>}
          </div>
        )
      })}
    </div>
  )
}

// Hover card for one season point: square, flat, mono, the site's orange rule.
function PointTip({ p, season }) {
  const teams = season.teams && season.teams.length ? season.teams.join('/') : season.tm
  const flip = p.x > 200
  const anchor = Math.min(110, Math.max(20, p.has ? p.y : p.ly ?? 75))
  return (
    <div style={{ position: 'absolute', left: pct(p.x, 330), top: pct(anchor, 150), transform: flip ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)', zIndex: 2, pointerEvents: 'none', background: '#1f1d1c', border: '1px solid #6b655f', borderTop: '2px solid #fa962a', padding: '6px 9px 7px', fontFamily: MONO, whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 9, letterSpacing: '.06em', color: '#8a847e' }}>{season.label} · {teams}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: p.has ? '#ece8e3' : '#6b655f', lineHeight: 1.1 }}>{p.has ? p.value : '—'}</span>
      {p.has && <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.04em', color: p.color }}>{p.pctl} PCT</span>}
      {p.showLg && <span style={{ fontSize: 9, letterSpacing: '.04em', color: '#8a847e' }}>LG {p.lgValue}</span>}
    </div>
  )
}

function SeasonChart({ stat, label, seasons }) {
  const m = chartModel(stat, seasons)
  const [hover, setHover] = useState(null)
  const L = seasons.length - 1
  const slot = L ? 282 / L : 60
  return (
    <div style={{ flex: '0 1 330px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 10, background: '#2c2a28', border: '1px solid #544f4b', padding: 16, alignSelf: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.03em' }}>{label}</span>
        <span style={{ display: 'flex', gap: 10, fontFamily: MONO, fontSize: 9, color: '#8a847e' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 2, background: '#ece8e3' }} />PLAYER</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 0, borderTop: '2px dashed #8a847e' }} />{m.legend}</span>
        </span>
      </div>
      <div onMouseLeave={() => setHover(null)} style={{ position: 'relative', flex: 1, minHeight: 200, display: 'flex' }}>
        <svg viewBox="0 0 330 150" preserveAspectRatio="none" style={{ width: '100%', height: '100%', minHeight: 200, display: 'block', overflow: 'visible', position: 'absolute', inset: 0 }}>
          {m.bands.map((b, i) => <path key={i} d={b.d} fill={b.fill} />)}
          <line x1="0" x2="330" y1="134" y2="134" stroke="#6b655f" vectorEffect="non-scaling-stroke" />
          {m.leagueLines.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#8a847e" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
          {m.playerLines.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#ece8e3" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
        </svg>
        {m.pts.map(p => (
          <span key={`dots-${p.i}`}>
            {p.ly !== null && <span style={{ position: 'absolute', left: pct(p.x, 330), top: pct(p.ly, 150), width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5, borderRadius: '50%', background: '#8a847e', pointerEvents: 'none' }} />}
            {p.has && (() => {
              const r = hover === p.i ? Math.max(p.r, 3.5) + 1.5 : p.r
              return <span style={{ position: 'absolute', left: pct(p.x, 330), top: pct(p.y, 150), width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: '50%', background: p.color, border: p.current || hover === p.i ? '1.5px solid #ece8e3' : 'none', boxSizing: 'border-box', pointerEvents: 'none' }} />
            })()}
          </span>
        ))}
        {m.pts.map(p => (
          <span key={`labels-${p.i}`}>
            {p.showValue && <span style={{ position: 'absolute', left: pct(p.x, 330), top: pct(p.valueY, 150), transform: 'translate(-50%,-50%)', fontFamily: MONO, fontSize: 10.5, fontWeight: 600, color: '#ece8e3', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{p.value}</span>}
            {p.showValue && p.showLg && <span style={{ position: 'absolute', left: pct(p.x, 330), top: pct(p.lgY, 150), transform: 'translate(-50%,-50%)', fontFamily: MONO, fontSize: 8.5, color: '#8a847e', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{p.lgValue}</span>}
            <span style={{ position: 'absolute', left: pct(p.x, 330), top: '96%', transform: 'translate(-50%,-50%)', fontFamily: MONO, fontSize: seasons.length > 9 ? 8.5 : 9.5, color: p.current || hover === p.i ? '#ece8e3' : '#8a847e', whiteSpace: 'nowrap', display: p.hideSeason && hover !== p.i ? 'none' : 'block' }}>{p.season}</span>
          </span>
        ))}
        {hover !== null && <span style={{ position: 'absolute', left: pct(m.pts[hover].x, 330), top: 0, bottom: '9%', width: 1, background: 'rgba(236,232,227,.22)', pointerEvents: 'none' }} />}
        {m.pts.map(p => {
          const from = Math.max(0, p.x - slot / 2)
          const to = Math.min(330, p.x + slot / 2)
          return <span key={`hit-${p.i}`} onMouseEnter={() => setHover(p.i)} style={{ position: 'absolute', top: 0, bottom: 0, left: pct(from, 330), width: pct(to - from, 330) }} />
        })}
        {hover !== null && <PointTip p={m.pts[hover]} season={seasons[hover]} />}
      </div>
      <TeamTimeline seasons={seasons} />
    </div>
  )
}

export default function StatSection({ profile: p, tab, num }) {
  const shown = tab.stats.filter(l => p.stats[l].available)
  const [charted, setCharted] = useState(shown[0])
  const k = p.seasons.length - 1
  const grid = `84px 48px repeat(${shown.length},minmax(84px,1fr))`
  const minW = 132 + shown.length * 84 + 'px'

  return (
    <section id={`sec-${tab.id}`} style={{ scrollMarginTop: 48, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader num={num} title={tab.name}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#8a847e', letterSpacing: '.06em' }}>CLICK A COLUMN TO CHART IT</span>
      </SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
        <SeasonChart stat={p.stats[charted]} label={charted} seasons={p.seasons} />
        <div style={{ flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: minW, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, fontFamily: MONO, fontSize: 10, letterSpacing: '.04em', borderBottom: '1px solid #6b655f', alignItems: 'end' }}>
                <span style={{ padding: '5px 10px', color: '#8a847e' }}>SEASON</span>
                <span style={{ padding: '5px 10px', color: '#8a847e' }}>TM</span>
                {shown.map(l => {
                  const on = l === charted
                  return (
                    <span key={l} onClick={() => setCharted(l)} style={{ padding: '8px 10px', textAlign: 'right', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, color: on ? '#ece8e3' : '#8a847e', fontWeight: on ? 600 : 400, boxShadow: on ? 'inset 0 -3px 0 #fa962a' : 'none', background: on ? '#2f2c2a' : 'transparent' }}>
                      <span style={{ textTransform: 'uppercase', lineHeight: 1.3 }}>{l}</span>
                    </span>
                  )
                })}
              </div>
              {p.seasons.map((s, i) => (
                <div key={s.season} style={{ display: 'grid', gridTemplateColumns: grid, borderBottom: '1px solid #3d3a37', fontFamily: MONO, fontSize: 13, boxShadow: i === k ? 'inset 3px 0 0 #97c197' : 'none' }}>
                  <span style={{ padding: '5px 10px', fontWeight: 600, color: i === k ? '#ece8e3' : '#a8a29c' }}>{s.label}</span>
                  <span style={{ padding: '5px 10px', color: '#a8a29c' }}>{s.tm}</span>
                  {shown.map(l => {
                    const st = p.stats[l]
                    const v = st.vals[i]
                    return (
                      <span key={l} style={{ padding: '5px 10px', textAlign: 'right', background: v ? heat(v.p, i === k ? 0.12 : 0) : 'transparent', fontWeight: l === charted ? 600 : 400, color: v ? '#ece8e3' : '#6b655f' }}>
                        {v ? fmt(st, v.n) : '—'}
                      </span>
                    )
                  })}
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: grid, borderBottom: '2px solid #ece8e3', background: '#34312e', fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>
                <span style={{ padding: '5px 10px' }}>CAREER</span>
                <span style={{ padding: '5px 10px', color: '#a8a29c' }}>{p.careerTm}</span>
                {shown.map(l => <span key={l} style={{ padding: '5px 10px', textAlign: 'right' }}>{fmt(p.stats[l], p.stats[l].career)}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
