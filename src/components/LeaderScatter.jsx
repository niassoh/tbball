import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { headshotUrl } from '../api.js'
import { rowAge } from '../lib/age.js'
import { MONO, col, fmt, ord } from '../lib/format.js'
import { axisOf, median, pctlOf, quadrantOf, radiusOf, valueOf } from '../lib/leaderboard.js'
import { initials } from '../lib/teams.js'
import Popover from './Popover.jsx'

// The Leaderboard's scatter: any two stats of the season against each other, each axis
// running better toward the top and right (a lower-is-better stat reversed), split at the
// league's median into four equal quadrants (lib/leaderboard.js axisOf: each half runs
// from the median to its farthest player, so every dot is inside and no side is empty; a
// long-tailed stat like drives on a square-root scale, marked √). A dot is a player, its size his minutes (from the pool's
// fewest to its most), its colour how far toward the top right (blue) or bottom left
// (orange) he sits, grey between, on the site's percentile scale. The table's rows (`shown`)
// are live dots; everyone else on the board (the filters' others, the other pages of a long
// board) is a faint dot painted on one canvas behind them, so thousands cost one paint and
// none listens for the pointer. Live dots glide to their new places when an axis or the
// season changes (index.css .lb-dot). Hover a dot for his card in brief; the table's
// row under the pointer (`hot`) rings its dot with just his face and surname, so the chart
// stays in view as the table is read. A click opens his card. Under it: the season,
// both medians, how many players, and how many are in the top right.
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const TONE = { both: '#597ec1', neither: '#fa962a' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const TIP_W = 228
const TIP_H = 138
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const M = { l: 30, r: 14, t: 16, b: 30 }

// The stats a board can chart: those with values in it (the last 30 days leave some out).
// `dim(label)`: a reason a stat is faint (Careers: none of the picked players has it),
// still pickable.
export function AxisPicker({ doc, axis, value, set, dim }) {
  const charted = l => !doc.stats[l].na && doc.players.some(p => valueOf(doc, p, l) !== null)
  const groups = doc.groups.map(g => ({ ...g, stats: g.stats.filter(charted) })).filter(g => g.stats.length)
  return (
    <Popover name={`${axis} axis: ${value}`} minWidth={300} trigger={<><span style={{ ...label, fontWeight: 400 }}>{axis}</span>{value}</>}>
      {close => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460 }}>
          {groups.map(g => (
            <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ ...label, fontSize: 8, color: FAINT }}>{g.name}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {g.stats.map(l => {
                  const why = dim && l !== value ? dim(l) : null
                  return (
                    <button key={l} type="button" className="lb-chip" title={why || undefined} onClick={() => { set(l); close() }}
                      style={{ padding: '3px 6px', border: `1px ${why ? 'dashed' : 'solid'} ${l === value ? INK : EDGE}`, background: l === value ? '#3a3734' : 'transparent', color: l === value ? INK : why ? FAINT : '#b8b2ab', fontFamily: MONO, fontSize: 10, cursor: 'pointer' }}>{l}</button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Popover>
  )
}

// A dot's player in brief: headshot, name, team, position, age and minutes, then each
// axis's stat with its value and a bar to its percentile.
function Tip({ doc, d, x, y, left, top }) {
  const row = (l, v) => {
    const pc = pctlOf(doc, d.p, l)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ ...label, fontSize: 8.5 }}>{l}</span>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: INK }}>{fmt(doc.stats[l], v)}</span>
        </span>
        <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 34px', gap: 8, alignItems: 'center' }}>
          <span style={{ position: 'relative', height: 5, background: '#34312e' }}>
            {pc !== null && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(pc, 2)}%`, background: col(pc) }} />}
            <span style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#837d76' }} />
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, textAlign: 'right', color: pc === null ? FAINT : col(pc) }}>{pc === null ? '—' : ord(pc)}</span>
        </span>
      </div>
    )
  }
  const p = d.p
  return (
    <div style={{ position: 'absolute', left, top, width: TIP_W, pointerEvents: 'none', zIndex: 5, background: 'rgba(31, 29, 28, .96)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid #837d76', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: '1px solid #544f4b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 9, color: DIM }}>
          {p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(p.name)}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-.005em', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
          <span style={{ ...label, fontSize: 8 }}>{[doc.many && `’${p.season.slice(5)}`, p.team, p.pos, rowAge(p) && `age ${rowAge(p)}`, p.mp !== null && `${p.mp.toLocaleString()} min`].filter(Boolean).join(' · ')}</span>
        </span>
      </div>
      <span style={{ height: 1, background: RULE }} />
      {row(x, d.vx)}
      {row(y, d.vy)}
    </div>
  )
}

// The table's row under the pointer, at its dot: his face and surname, no more. Beside the
// dot on its right, or, near the chart's right edge, on its left (`flip`: placed by its
// right edge, so it sits as close whatever the name's length).
const MINI_W = 160
function Mini({ p, left, top, flip }) {
  return (
    <div style={{ position: 'absolute', left, top, maxWidth: MINI_W, transform: flip ? 'translateX(-100%)' : 'none', pointerEvents: 'none', zIndex: 5, display: 'flex', alignItems: 'center', gap: 5, padding: '2px 7px 2px 2px', background: 'rgba(31, 29, 28, .94)', border: '1px solid #837d76' }}>
      <span style={{ width: 18, height: 18, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 7, color: DIM }}>
        {p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={18} height={18} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(p.name)}
      </span>
      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ').slice(1).join(' ') || p.name}</span>
    </div>
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
  // The board's points and scales, kept between renders: the table's row under the pointer
  // (`hot`) changes as it scrolls, and on a long board (eras, many seasons) redoing these
  // and every dot for each row it passes made the table stutter.
  const { pts, byId, mx, my, xa, ya, most, least, order, top } = useMemo(() => {
    const pts = doc.players.map(p => ({ p, vx: valueOf(doc, p, x), vy: valueOf(doc, p, y) })).filter(d => d.vx !== null && d.vy !== null)
    const mx = median(pts.map(d => d.vx))
    const my = median(pts.map(d => d.vy))
    const minutes = doc.players.map(p => p.mp || 0)
    return {
      pts,
      byId: new Map(pts.map(d => [d.p.id, d])),
      mx,
      my,
      xa: axisOf(pts.map(d => d.vx), sx.lowerBetter),
      ya: axisOf(pts.map(d => d.vy), sy.lowerBetter),
      most: Math.max(...minutes),
      least: Math.min(...minutes),
      // Big dots first, so small ones stay on top; the filters' players over the rest.
      order: [...pts].sort((a, b) => (shown.has(a.p.id) - shown.has(b.p.id)) || (b.p.mp || 0) - (a.p.mp || 0)),
      top: pts.filter(d => quadrantOf(d.vx, d.vy, mx, my, sx.lowerBetter, sy.lowerBetter) === 'both').length
    }
  }, [doc, x, y, sx, sy, shown])
  const [x0, x1, y0, y1] = [xa.lo, xa.hi, ya.lo, ya.hi]
  const ax = xa.pos
  const ay = ya.pos
  const { w, h } = size
  const px = v => M.l + ax(v) * (w - M.l - M.r)
  const py = v => M.t + (1 - ay(v)) * (h - M.t - M.b)
  const cx = (M.l + w - M.r) / 2
  const cy = (M.t + h - M.b) / 2
  const radius = p => radiusOf(p.mp || 0, most, 2, 11, least)
  // Toward the top right, bluer; toward the bottom left, more orange (the percentile scale,
  // from how far up and right he sits, each axis 0 to 1 with its median at the middle).
  const tint = d => col(50 + 50 * Math.max(-1, Math.min(1, 2 * (ax(d.vx) + ay(d.vy) - 1))))
  const hv = (hover || hot) && byId.get(hover || hot)
  // The same elements while only the lit dot changes, so React passes over them.
  const dots = useMemo(() => order.filter(d => shown.has(d.p.id)).map(d => (
    <circle key={d.p.id} className="lb-dot lb-dot-in" cx={0} cy={0} r={radius(d.p)}
      fill={tint(d)} fillOpacity={0.82}
      style={{ transform: `translate(${px(d.vx)}px, ${py(d.vy)}px)`, cursor: 'pointer' }}
      onMouseEnter={() => setHover(d.p.id)} onMouseLeave={() => setHover(id => (id === d.p.id ? null : id))} onClick={() => onPick(d.p.id)} />
  )), [order, shown, xa, ya, most, least, w, h, onPick]) // eslint-disable-line react-hooks/exhaustive-deps -- px, py, radius and tint are these
  const faint = useRef(null)
  useEffect(() => {
    const c = faint.current
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr
    c.height = h * dpr
    const g = c.getContext('2d')
    g.scale(dpr, dpr)
    g.globalAlpha = 0.08
    for (const d of order) {
      if (shown.has(d.p.id)) continue
      g.fillStyle = tint(d)
      g.beginPath()
      g.arc(px(d.vx), py(d.vy), radius(d.p), 0, 2 * Math.PI)
      g.fill()
    }
  }, [order, shown, xa, ya, most, least, w, h]) // eslint-disable-line react-hooks/exhaustive-deps -- px, py, radius and tint are these
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
      {/* As tall as the panel allows, but never much taller than it's wide. */}
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 240, maxHeight: Math.round(w * 1.1) }}>
        <canvas ref={faint} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: w, height: h, pointerEvents: 'none' }} />
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
          {dots}
          {hv && <circle cx={px(hv.vx)} cy={py(hv.vy)} r={radius(hv.p) + 2.5} fill="none" stroke={INK} strokeWidth={1.5} pointerEvents="none" />}
          {/* Each axis: its ends' values and its name, the better end up and to the right. */}
          <text x={M.l} y={h - M.b + 14} style={{ ...label, fill: FAINT }}>{fmt(sx, xl)}</text>
          <text x={(M.l + w - M.r) / 2} y={h - M.b + 14} textAnchor="middle" style={{ ...label, fill: DIM }}>{x}{xa.root ? ' · √ scale' : ''} →</text>
          <text x={w - M.r} y={h - M.b + 14} textAnchor="end" style={{ ...label, fill: FAINT }}>{fmt(sx, xr)}</text>
          <text x={M.l - 6} y={h - M.b} textAnchor="start" style={{ ...label, fill: FAINT }} transform={`rotate(-90 ${M.l - 6} ${h - M.b})`}>{fmt(sy, yb)}</text>
          <text x={M.l - 6} y={(M.t + h - M.b) / 2} textAnchor="middle" style={{ ...label, fill: DIM }} transform={`rotate(-90 ${M.l - 6} ${(M.t + h - M.b) / 2})`}>{y}{ya.root ? ' · √ scale' : ''} →</text>
          <text x={M.l - 6} y={M.t} textAnchor="end" style={{ ...label, fill: FAINT }} transform={`rotate(-90 ${M.l - 6} ${M.t})`}>{fmt(sy, yt)}</text>
        </svg>
        {hv && hover && <Tip doc={doc} d={hv} x={x} y={y}
          left={px(hv.vx) + 16 + TIP_W < w ? px(hv.vx) + 16 : px(hv.vx) - 16 - TIP_W}
          top={Math.max(4, Math.min(h - TIP_H - 4, py(hv.vy) - TIP_H / 2))} />}
        {hv && !hover && (() => {
          const flip = px(hv.vx) + radius(hv.p) + 6 + MINI_W > w
          return <Mini p={hv.p} flip={flip} left={flip ? px(hv.vx) - radius(hv.p) - 6 : px(hv.vx) + radius(hv.p) + 6} top={Math.max(2, py(hv.vy) - 12)} />
        })()}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', borderTop: `1px solid ${RULE}` }}>
        <div style={{ ...cell, borderLeft: 0 }}><span style={cap}>League</span><span style={big}>{seasonLabel}</span></div>
        <div style={cell}><span style={cap}>{x} med</span><span style={big}>{fmt(sx, mx)}</span></div>
        <div style={cell}><span style={cap}>{y} med</span><span style={big}>{fmt(sy, my)}</span></div>
        <div style={cell}><span style={cap}>Players</span><span style={big}>{pts.length}</span></div>
        <div style={cell}><span style={cap}>Top right</span><span style={{ ...big, color: TONE.both }}>{top}</span></div>
      </div>
    </>
  )
}
