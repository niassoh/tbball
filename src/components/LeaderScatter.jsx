import { useLayoutEffect, useRef, useState } from 'react'
import { MONO, fmt } from '../lib/format.js'
import { along, median, quadrantOf, radiusOf, valueOf } from '../lib/leaderboard.js'
import Popover from './Popover.jsx'

// The Leaderboard's scatter: any two stats of the season against each other, each axis
// running better toward the top and right (a lower-is-better stat reversed) and centred
// on the league's median, as far either way as the furthest player, so the medians split
// it into four equal quadrants. A dot is a player, its size his minutes, blue when he's on the good
// side of both medians, orange when on neither, grey when split; players the table's
// filters leave out stay as faint dots. Dots glide to their new places when an axis or
// the season changes (index.css .lb-dot). Hover names a dot (as does the table's row
// under the pointer, `hot`); a click opens his card.
// Under it: the season, both medians, how many players, and how many beat both.
const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const TONE = { both: '#597ec1', neither: '#fa962a', split: '#7a7570' }
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const M = { l: 30, r: 14, t: 16, b: 30 }

function AxisPicker({ doc, axis, value, set }) {
  return (
    <Popover name={`${axis} axis: ${value}`} minWidth={300} trigger={<><span style={{ ...label, fontWeight: 400 }}>{axis}</span>{value}</>}>
      {close => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460 }}>
          {doc.groups.map(g => (
            <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ ...label, fontSize: 8, color: FAINT }}>{g.name}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {g.stats.map(l => (
                  <button key={l} type="button" className="lb-chip" onClick={() => { set(l); close() }}
                    style={{ padding: '3px 6px', border: `1px solid ${l === value ? INK : EDGE}`, background: l === value ? '#3a3734' : 'transparent', color: l === value ? INK : '#b8b2ab', fontFamily: MONO, fontSize: 10, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Popover>
  )
}

export default function LeaderScatter({ doc, shown, hot, x, y, setAxis, onPick, seasonLabel }) {
  const box = useRef(null)
  const [size, setSize] = useState({ w: 480, h: 420 })
  const [hover, setHover] = useState(null)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const sx = doc.stats[x]
  const sy = doc.stats[y]
  const pts = doc.players.map(p => ({ p, vx: valueOf(doc, p, x), vy: valueOf(doc, p, y) })).filter(d => d.vx !== null && d.vy !== null)
  const mx = median(pts.map(d => d.vx))
  const my = median(pts.map(d => d.vy))
  const around = (vs, m) => {
    const d = Math.max(...vs.map(v => Math.abs(v - m))) * 1.05 || 1
    return [m - d, m + d]
  }
  const [x0, x1] = pts.length ? around(pts.map(d => d.vx), mx) : [0, 1]
  const [y0, y1] = pts.length ? around(pts.map(d => d.vy), my) : [0, 1]
  const { w, h } = size
  const px = v => M.l + along(v, x0, x1, sx.lowerBetter) * (w - M.l - M.r)
  const py = v => M.t + (1 - along(v, y0, y1, sy.lowerBetter)) * (h - M.t - M.b)
  const cx = (M.l + w - M.r) / 2
  const cy = (M.t + h - M.b) / 2
  const most = Math.max(...doc.players.map(p => p.mp || 0))
  // Big dots first, so small ones stay on top; the filters' players over the rest.
  const order = [...pts].sort((a, b) => (shown.has(a.p.slug) - shown.has(b.p.slug)) || (b.p.mp || 0) - (a.p.mp || 0))
  const quad = d => quadrantOf(d.vx, d.vy, mx, my, sx.lowerBetter, sy.lowerBetter)
  const top = pts.filter(d => quad(d) === 'both').length
  const hv = (hover || hot) && pts.find(d => d.p.slug === (hover || hot))
  // An axis's worse end on the left (or bottom), its better end on the right (or top).
  const ends = (stat, lo, hi) => (stat.lowerBetter ? [hi, lo] : [lo, hi])
  const [xl, xr] = ends(sx, x0, x1)
  const [yb, yt] = ends(sy, y0, y1)
  const cell = { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, borderLeft: `1px solid ${RULE}` }
  const cap = { ...label, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  const big = { fontFamily: MONO, fontSize: 18, fontWeight: 600, color: INK, lineHeight: 1 }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap' }}>
        <AxisPicker doc={doc} axis="X" value={x} set={v => setAxis('x', v)} />
        <AxisPicker doc={doc} axis="Y" value={y} set={v => setAxis('y', v)} />
        <span style={{ ...label, marginLeft: 'auto', fontSize: 8 }}>● = minutes · ┼ median</span>
      </div>
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 240 }}>
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, display: 'block' }} onMouseLeave={() => setHover(null)}>
          <rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} fill="none" stroke={RULE} />
          {/* The medians cross at the centre: better-in-both up and right, worse-in-both down
              and left, each tinted. */}
          <rect x={cx} y={M.t} width={w - M.r - cx} height={cy - M.t} fill={TONE.both} fillOpacity={0.06} />
          <rect x={M.l} y={cy} width={cx - M.l} height={h - M.b - cy} fill={TONE.neither} fillOpacity={0.06} />
          <line x1={cx} x2={cx} y1={M.t} y2={h - M.b} stroke={EDGE} strokeDasharray="2 3" />
          <line x1={M.l} x2={w - M.r} y1={cy} y2={cy} stroke={EDGE} strokeDasharray="2 3" />
          <text x={w - M.r - 6} y={M.t + 12} textAnchor="end" style={{ ...label, fontSize: 9, fill: TONE.both }}>+ +</text>
          <text x={M.l + 6} y={h - M.b - 6} style={{ ...label, fontSize: 9, fill: TONE.neither }}>− −</text>
          {order.map(d => {
            const on = shown.has(d.p.slug)
            const q = quad(d)
            return (
              <circle key={d.p.slug} className="lb-dot lb-dot-in" cx={0} cy={0} r={radiusOf(d.p.mp || 0, most, 2.5, 9)}
                fill={TONE[q]} fillOpacity={on ? (q === 'split' ? 0.55 : 0.75) : 0.08}
                style={{ transform: `translate(${px(d.vx)}px, ${py(d.vy)}px)`, cursor: on ? 'pointer' : 'default', pointerEvents: on ? 'auto' : 'none' }}
                onMouseEnter={() => setHover(d.p.slug)} onClick={() => onPick(d.p.slug)} />
            )
          })}
          {hv && <circle cx={px(hv.vx)} cy={py(hv.vy)} r={radiusOf(hv.p.mp || 0, most, 2.5, 9) + 2.5} fill="none" stroke={INK} strokeWidth={1.5} pointerEvents="none" />}
          {/* Each axis: its ends' values and its name, the better end up and to the right. */}
          <text x={M.l} y={h - M.b + 14} style={{ ...label, fill: FAINT }}>{fmt(sx, xl)}</text>
          <text x={(M.l + w - M.r) / 2} y={h - M.b + 14} textAnchor="middle" style={{ ...label, fill: DIM }}>{x} →</text>
          <text x={w - M.r} y={h - M.b + 14} textAnchor="end" style={{ ...label, fill: FAINT }}>{fmt(sx, xr)}</text>
          <text x={M.l - 6} y={h - M.b} textAnchor="start" style={{ ...label, fill: FAINT }} transform={`rotate(-90 ${M.l - 6} ${h - M.b})`}>{fmt(sy, yb)}</text>
          <text x={M.l - 6} y={(M.t + h - M.b) / 2} textAnchor="middle" style={{ ...label, fill: DIM }} transform={`rotate(-90 ${M.l - 6} ${(M.t + h - M.b) / 2})`}>{y} →</text>
          <text x={M.l - 6} y={M.t} textAnchor="end" style={{ ...label, fill: FAINT }} transform={`rotate(-90 ${M.l - 6} ${M.t})`}>{fmt(sy, yt)}</text>
        </svg>
        {hv && (
          <div style={{ position: 'absolute', left: Math.min(px(hv.vx) + 12, w - 190), top: Math.max(py(hv.vy) - 54, 4), width: 178, pointerEvents: 'none', background: '#1f1d1c', border: '1px solid #6b655f', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 3, fontFamily: MONO, fontSize: 10 }}>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, color: INK }}>{hv.p.name} <span style={{ ...label, fontSize: 8 }}>{hv.p.team}</span></span>
            <span style={{ color: DIM }}>{x} <span style={{ color: INK }}>{fmt(sx, hv.vx)}</span> · {y} <span style={{ color: INK }}>{fmt(sy, hv.vy)}</span></span>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', borderTop: `1px solid ${RULE}` }}>
        <div style={{ ...cell, borderLeft: 0 }}><span style={cap}>League</span><span style={big}>{seasonLabel}</span></div>
        <div style={cell}><span style={cap}>{x} med</span><span style={big}>{fmt(sx, mx)}</span></div>
        <div style={cell}><span style={cap}>{y} med</span><span style={big}>{fmt(sy, my)}</span></div>
        <div style={cell}><span style={cap}>Players</span><span style={big}>{pts.length}</span></div>
        <div style={cell}><span style={cap}>Beat both</span><span style={{ ...big, color: TONE.both }}>{top}</span></div>
      </div>
    </>
  )
}
