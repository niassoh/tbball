import { useCallback, useEffect, useRef, useState } from 'react'
import { MONO, col, fmt, heat, ord } from '../lib/format.js'
import { chartModel } from '../lib/chart.js'
import { histogram } from '../lib/dist.js'
import { loadDistribution } from '../api.js'
import { spanMean, spanLabel, spanTeams } from '../lib/span.js'
import { TEAM_COLORS, teamStints } from '../lib/teams.js'
import SectionHeader from './SectionHeader.jsx'

const pct = (v, of) => `${(v / of * 100).toFixed(2)}%`
// A dragged span is framed like a spreadsheet range; the other seasons fade back.
const SPAN_FRAME = '2px solid #ece8e3'
// The season and team columns stay put while the stat columns scroll under them; the
// team column's right rule marks the edge.
const SEASON_W = 84
const TM_W = 56
const PAGE_BG = '#262422'
const pinSeason = bg => ({ position: 'sticky', left: 0, zIndex: 1, background: bg })
const pinTeam = bg => ({ position: 'sticky', left: SEASON_W, zIndex: 1, background: bg, boxShadow: 'inset -1px 0 0 #3d3a37', whiteSpace: 'nowrap' })
// A span value against his career average: blue better, orange worse (flipped for
// lower-is-better stats), plain when they match at the shown precision.
const vsCareer = (stat, value, career) => {
  if (value === null || career === null || fmt(stat, value) === fmt(stat, career)) return '#ece8e3'
  return (value > career) !== !!stat.lowerBetter ? '#8fb0e6' : '#fa962a'
}

// Flat team-color blocks on the chart's x scale (chartModel's X), one per stint,
// each starting on the point of the team's first season and ending on the last
// (a team new in the latest season trails half a slot past it; see teamStints).
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

// Where he sat in that season's league: the qualified pool as a histogram, better to the
// right. Bars up to his are filled in percentile colour (orange low, blue high), so the
// filled area is the share of the league he's ahead of; bars past him stay flat grey.
// His bar is white, a marker at his exact value carries his percentile, and a dashed
// tick marks the league average. The bars ease between seasons as the pointer moves.
const DIST_W = 216
function DistStrip({ values, stat, value, pctl, lg }) {
  const h = histogram(values, !!stat.lowerBetter)
  const mine = h.bin(value)
  const at = h.pos(value) * 100
  return (
    <div style={{ width: DIST_W, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'relative', height: 62, paddingTop: 14, display: 'flex', alignItems: 'flex-end', gap: 1, borderBottom: '1px solid #6b655f' }}>
        {h.bars.map((b, i) => (
          <div key={i} className="dist-bar" style={{ flex: 1, height: `${b.count ? Math.max(5, b.height * 100) : 0}%`, background: i === mine ? '#ece8e3' : i < mine ? col(b.pct) : '#3d3a37' }} />
        ))}
        {lg !== null && lg !== undefined && <div className="dist-mark" style={{ position: 'absolute', left: `${h.pos(lg) * 100}%`, top: 14, bottom: 0, borderLeft: '1px dashed #a8a29c' }} />}
        <div className="dist-mark" style={{ position: 'absolute', left: `${at}%`, top: 11, bottom: -4, width: 1, marginLeft: -0.5, background: '#ece8e3' }} />
        {pctl !== null && pctl !== undefined && <span className="dist-mark" style={{ position: 'absolute', left: `${at}%`, top: 0, transform: at < 12 ? 'none' : at > 88 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 9, fontWeight: 700, letterSpacing: '.06em', color: '#ece8e3', lineHeight: 1 }}>{ord(pctl).toUpperCase()}</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, letterSpacing: '.04em', color: '#8a847e' }}>
        <span>{fmt(stat, h.worst)}</span>
        <span>{values.length} QUALIFIED</span>
        <span>{fmt(stat, h.best)}</span>
      </div>
    </div>
  )
}

// Hover card for one season point: square, flat, mono, the site's orange rule.
function PointTip({ p, season, stat, dist }) {
  const teams = season.teams && season.teams.length ? season.teams.join('/') : season.tm
  const flip = p.x > 200
  const anchor = Math.min(110, Math.max(20, p.has ? p.y : p.ly ?? 75))
  return (
    <div style={{ position: 'absolute', left: pct(p.x, 330), top: pct(anchor, 150), transform: flip ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)', zIndex: 2, pointerEvents: 'none', background: '#1f1d1c', border: '1px solid #6b655f', borderTop: '2px solid #fa962a', padding: '6px 9px 7px', fontFamily: MONO, whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 9, letterSpacing: '.06em', color: '#8a847e' }}>{season.label} · {teams}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: p.has ? '#ece8e3' : '#6b655f', lineHeight: 1.1 }}>{p.has ? p.value : '—'}</span>
      {p.has && <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.04em', color: p.color }}>{p.detail}</span>}
      {p.showLg && <span style={{ fontSize: 9, letterSpacing: '.04em', color: '#8a847e' }}>LG {p.lgValue}</span>}
      {p.has && dist && dist.length > 1 && <DistStrip values={dist} stat={stat} value={stat.vals[p.i].n} pctl={stat.vals[p.i].p} lg={stat.lg[p.i]} />}
    </div>
  )
}

function SeasonChart({ stat, label, seasons, span }) {
  const m = chartModel(stat, seasons)
  const [hover, setHover] = useState(null)
  // The charted stat's league spread per season, for the hover card (not for Year to
  // Year's derived changes, which have none).
  const [dist, setDist] = useState(null)
  useEffect(() => {
    if (stat.derived) return
    let live = true
    loadDistribution(label).then(d => live && setDist({ label, seasons: (d && d.seasons) || {} })).catch(() => {})
    return () => { live = false }
  }, [label, stat.derived])
  const seasonDist = hover !== null && dist && dist.label === label ? dist.seasons[seasons[hover].season] : null
  const L = seasons.length - 1
  const slot = L ? 282 / L : 60
  // A dragged span in the table shades its seasons here, with its average as a line.
  const band = span && { x0: Math.max(0, m.pts[span.from].x - slot / 2), x1: Math.min(330, m.pts[span.to].x + slot / 2) }
  const bandY = span && span.mean !== null ? m.Y(span.mean) : null
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
          {band && <rect x={band.x0} y="0" width={band.x1 - band.x0} height="134" fill="rgba(0,0,0,.34)" />}
          {m.bands.map((b, i) => <path key={i} d={b.d} fill={b.fill} />)}
          <line x1="0" x2="330" y1="134" y2="134" stroke="#6b655f" vectorEffect="non-scaling-stroke" />
          {m.leagueLines.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#8a847e" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
          {m.playerLines.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#ece8e3" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
          {bandY !== null && <line x1={band.x0} x2={band.x1} y1={bandY} y2={bandY} stroke="#d6d1cb" strokeWidth="1.5" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* Where the y scale starts: the value at the axis line, tagged on its left end. */}
        <span style={{ position: 'absolute', left: 0, top: pct(134, 150), transform: 'translateY(-50%)', paddingRight: 4, background: '#2c2a28', fontFamily: MONO, fontSize: 8.5, lineHeight: 1, letterSpacing: '.04em', color: '#8a847e', pointerEvents: 'none' }}>{m.axisLabel}</span>
        {bandY !== null && <span style={{ position: 'absolute', left: pct(band.x1, 330), top: pct(bandY, 150), transform: band.x1 > 290 ? 'translate(calc(-100% - 4px), -130%)' : 'translate(4px, -50%)', fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#ece8e3', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{fmt(stat, span.mean)}</span>}
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
        {hover !== null && <PointTip p={m.pts[hover]} season={seasons[hover]} stat={stat} dist={seasonDist} />}
      </div>
      <TeamTimeline seasons={seasons} />
    </div>
  )
}

export default function StatSection({ profile: p, tab, num, sel, setSel }) {
  const shown = tab.stats.filter(l => p.stats[l].available)
  const [charted, setCharted] = useState(shown[0])
  const k = p.seasons.length - 1
  // Drag across season rows (or click one, then another) to average that span.
  // sel (owned by the page, so it survives tab switches) holds the anchor row and the
  // row the drag is on; drag tracks a press in progress.
  const drag = useRef(null)
  const from = sel && Math.min(sel.a, sel.b)
  const to = sel && Math.max(sel.a, sel.b)
  const spanOn = sel !== null && to > from

  useEffect(() => {
    // A press without movement is a click: a second click on another row finishes a
    // span from the first (taps on touch screens, which don't drag); a click inside
    // the current selection clears it; anywhere else starts a new anchor.
    const up = () => {
      const d = drag.current
      if (!d) return
      drag.current = null
      if (d.moved) return
      const prev = d.prev
      if (prev && prev.a === prev.b && prev.a !== d.start) setSel({ a: prev.a, b: d.start })
      else if (prev && d.start >= Math.min(prev.a, prev.b) && d.start <= Math.max(prev.a, prev.b)) setSel(null)
      else setSel({ a: d.start, b: d.start })
    }
    // The browser took the gesture (e.g. a touch scroll): put the old selection back.
    const cancel = () => {
      if (drag.current) setSel(drag.current.prev)
      drag.current = null
    }
    const key = e => { if (e.key === 'Escape') setSel(null) }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [setSel])

  const press = (e, i) => {
    if (e.button !== 0) return
    drag.current = { start: i, moved: false, prev: sel }
    setSel({ a: i, b: i })
  }
  const enter = i => {
    const d = drag.current
    if (!d || i === d.start && !d.moved) return
    d.moved = true
    setSel({ a: d.start, b: i })
  }
  const grid = `${SEASON_W}px ${TM_W}px repeat(${shown.length},minmax(84px,1fr))`
  const minW = SEASON_W + TM_W + shown.length * 84 + 'px'
  // A fade on the right edge while more stat columns lie off to the right.
  const scroller = useRef(null)
  const [more, setMore] = useState(false)
  const measure = useCallback(() => {
    const el = scroller.current
    if (el) setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])
  useEffect(() => {
    const ro = new ResizeObserver(measure)
    ro.observe(scroller.current)
    ro.observe(scroller.current.firstChild)
    return () => ro.disconnect()
  }, [measure])

  return (
    <section id={`sec-${tab.id}`} style={{ scrollMarginTop: 48, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <SectionHeader num={num} title={tab.name}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#8a847e', letterSpacing: '.06em' }}>
          {spanOn
            ? <><span style={{ color: '#ece8e3' }}>{to - from + 1}-SEASON AVERAGE</span> · CLICK IT OR ESC TO CLEAR</>
            : sel
              ? 'CLICK ANOTHER SEASON TO AVERAGE THE SPAN · ESC TO CANCEL'
              : 'DRAG ACROSS SEASONS TO AVERAGE · CLICK A COLUMN TO CHART IT'}
        </span>
      </SectionHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
        <SeasonChart stat={p.stats[charted]} label={charted} seasons={p.seasons} span={spanOn ? { from, to, mean: spanMean(p, charted, from, to) } : null} />
        <div style={{ flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ position: 'relative' }}>
          <div ref={scroller} className="stat-scroll" onScroll={measure} style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: minW, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, fontFamily: MONO, fontSize: 10, letterSpacing: '.04em', borderBottom: '1px solid #6b655f', alignItems: 'end' }}>
                <span style={{ padding: '5px 10px', color: '#8a847e', alignSelf: 'stretch', display: 'flex', alignItems: 'flex-end', ...pinSeason(PAGE_BG) }}>SEASON</span>
                <span style={{ padding: '5px 10px', color: '#8a847e', alignSelf: 'stretch', display: 'flex', alignItems: 'flex-end', ...pinTeam(PAGE_BG) }}>TM</span>
                {shown.map(l => {
                  const on = l === charted
                  return (
                    <span key={l} onClick={() => setCharted(l)} style={{ padding: '8px 10px', textAlign: 'right', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, color: on ? '#ece8e3' : '#8a847e', fontWeight: on ? 600 : 400, boxShadow: on ? 'inset 0 -3px 0 #fa962a' : 'none', background: on ? '#2f2c2a' : 'transparent' }}>
                      <span style={{ textTransform: 'uppercase', lineHeight: 1.3 }}>{l}</span>
                    </span>
                  )
                })}
              </div>
              {p.seasons.map((s, i) => {
                const picked = sel !== null && i >= from && i <= to
                return (
                <div key={s.season} onPointerDown={e => press(e, i)} onPointerEnter={() => enter(i)} style={{ position: 'relative', display: 'grid', gridTemplateColumns: grid, borderBottom: '1px solid #3d3a37', fontFamily: MONO, fontSize: 13, cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', opacity: spanOn && !picked ? 0.4 : 1, transition: 'opacity .15s' }}>
                  {/* One frame around the whole span: its top and bottom at the span's ends, its left
                      edge on the pinned season cell (so it stays while the stats scroll), and its
                      right edge at the table's far end. */}
                  {picked && <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: i === to ? 0 : -1, zIndex: 2, pointerEvents: 'none', borderRight: SPAN_FRAME, borderTop: i === from ? SPAN_FRAME : 'none', borderBottom: i === to ? SPAN_FRAME : 'none' }} />}
                  <span style={{ padding: '5px 10px', fontWeight: 600, color: picked || i === k ? '#ece8e3' : '#a8a29c', ...pinSeason(PAGE_BG), boxShadow: picked ? 'inset 2px 0 0 #ece8e3' : i === k ? 'inset 3px 0 0 #97c197' : 'none' }}>{s.label}</span>
                  <span style={{ padding: '5px 10px', color: '#a8a29c', ...pinTeam(PAGE_BG) }}>{s.tm}</span>
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
                )
              })}
              {/* Always in the table (a faint placeholder until a span is picked), so picking one
                  never changes the table's height, or the chart's beside it. */}
              <div onClick={spanOn ? () => setSel(null) : undefined} title={spanOn ? `Average of ${p.seasons[from].label} to ${p.seasons[to].label} · click to clear` : undefined} style={{ display: 'grid', gridTemplateColumns: grid, borderTop: `1px solid ${spanOn ? '#6b655f' : '#3d3a37'}`, borderBottom: `1px solid ${spanOn ? '#6b655f' : '#3d3a37'}`, background: spanOn ? '#141312' : 'transparent', fontFamily: MONO, fontSize: 13, fontWeight: 600, cursor: spanOn ? 'pointer' : 'default', transition: 'background-color .15s, border-color .15s' }}>
                <span style={{ padding: '5px 10px', color: spanOn ? '#ece8e3' : '#544f4b', ...pinSeason(spanOn ? '#141312' : PAGE_BG) }}>{spanOn ? spanLabel(p.seasons, from, to) : 'SPAN'}</span>
                <span style={{ padding: '5px 10px', color: '#a8a29c', ...pinTeam(spanOn ? '#141312' : PAGE_BG) }}>{spanOn ? spanTeams(p.seasons, from, to) : ''}</span>
                {shown.map(l => {
                  if (!spanOn) return <span key={l} style={{ padding: '5px 10px', textAlign: 'right', color: '#3d3a37' }}>—</span>
                  const st = p.stats[l]
                  const value = spanMean(p, l, from, to)
                  return <span key={l} style={{ padding: '5px 10px', textAlign: 'right', color: vsCareer(st, value, spanMean(p, l, 0, k)) }}>{fmt(st, value)}</span>
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: grid, borderBottom: '2px solid #ece8e3', background: '#34312e', fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>
                <span style={{ padding: '5px 10px', ...pinSeason('#34312e') }}>CAREER</span>
                <span style={{ padding: '5px 10px', color: '#a8a29c', ...pinTeam('#34312e') }}>{p.careerTm}</span>
                {shown.map(l => <span key={l} style={{ padding: '5px 10px', textAlign: 'right' }}>{fmt(p.stats[l], spanMean(p, l, 0, k))}</span>)}
              </div>
            </div>
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', top: 0, right: 0, bottom: 8, width: 40, pointerEvents: 'none', background: `linear-gradient(to right, rgba(38,36,34,0), ${PAGE_BG})`, opacity: more ? 1 : 0, transition: 'opacity .2s' }} />
          </div>
        </div>
      </div>
    </section>
  )
}
