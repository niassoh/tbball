import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MONO, fmt, ord } from '../lib/format.js'
import { TIME, envelope } from '../lib/careers.js'
import { axisOf, median, quantile } from '../lib/leaderboard.js'

// Careers' chart. Time across (a season, his age or his year of career): every career on
// the boards a faint line painted on one canvas, the league's 10th–90th percentile band
// and median at each x over it, and the channels' careers (up to four) drawn on top, a
// season off the board a dotted bridge. A stat across: every player-season a faint dot,
// and each channel's career a path through them, season to season, arrows on its longer
// steps, from a hollow square (his first season) to a ringed dot (his last). Better is
// up (and right): raw values on the Leaderboard's median-centred axes (lib/leaderboard.js
// axisOf), percentiles 0–100. The canvas is painted when the data or the frame change,
// never as the pointer moves; the readout follows the pointer (time: the x under it, each
// channel's season there; a path: the nearest of its seasons).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const BG = '#262422'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const M = { l: 50, r: 34, t: 14, b: 30 }
// The background's ink, tuned by eye: faint enough that the channels lead, dense enough
// that the league's shape shows.
const FIELD_ALPHA = 0.055
const DOT_ALPHA = 0.09
const BAND_FILL = 'rgba(236, 232, 227, .055)'
const CARD_W = 236
// Below this width the readout sits under the chart rather than over it.
const DOCK = 520
const X_NAMES = { season: 'Season', age: 'Age', career: 'Year of career' }
const BAND_AT = { season: 'each season', age: 'each age', career: 'each year of career' }
// A raw axis over the league's middle 98%: a handful of extreme seasons would otherwise
// squeeze every career into the middle of the frame (they run off its edge instead).
const trimmed = vs => {
  const lo = quantile(vs, 0.01)
  const hi = quantile(vs, 0.99)
  return vs.filter(v => v >= lo && v <= hi)
}
const tick = (x, mode) => (mode === 'season' ? `’${String(x).slice(2)}` : String(x))
const seasonOf = r => `’${r.season.slice(5)}`

// Whole-number ticks a step apart, about one per 56px.
const ticksOf = (d0, d1, room) => {
  const step = [1, 2, 4, 5, 10].find(s => (d1 - d0) / s <= Math.max(2, room / 56)) || 10
  const out = []
  for (let t = Math.ceil(d0 / step) * step; t <= d1; t += step) out.push(t)
  return out
}

export default function CareerChart({ store, x, y, scale, ys, xs, channels }) {
  const box = useRef(null)
  const faint = useRef(null)
  const [size, setSize] = useState({ w: 640, h: 420 })
  const [hover, setHover] = useState(null)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const { w, h } = size
  const path = !(x in TIME)
  const pct = scale === 'pctl'
  const sy = store.stats[y]
  const sx = path ? store.stats[x] : null
  const at = x in TIME ? TIME[x] : null
  const yOf = (i, k) => (pct ? ys[i].p[k] : ys[i].v[k])
  const xOf = (i, k) => (path ? (pct ? xs[i].p[k] : xs[i].v[k]) : at(store.players[i].rows[k]))

  // Every player's points, the axes and (time across) the league's band.
  const field = useMemo(() => {
    const lines = store.players.map((pl, i) => pl.rows.map((r, k) => [xOf(i, k), yOf(i, k)]).filter(([a, b]) => a !== null && a !== undefined && b !== null && b !== undefined))
    const all = lines.flat()
    return {
      lines,
      ly: trimmed(all.map(p => p[1])),
      lx: path ? trimmed(all.map(p => p[0])) : null,
      yMid: pct ? 50 : median(all.map(p => p[1])),
      xMid: !path ? null : pct ? 50 : median(all.map(p => p[0])),
      band: path ? [] : envelope(all)
    }
  }, [store, x, y, scale, ys, xs]) // eslint-disable-line react-hooks/exhaustive-deps -- xOf and yOf are these

  // The axes: the league's middle 98%, stretched to keep the channels' own seasons in frame
  // (the stars are the league's top 1%).
  const axes = useMemo(() => {
    const linear = { lo: 0, hi: 100, root: false, pos: v => Math.max(0, Math.min(1, v / 100)) }
    if (pct) return { ya: linear, xa: path ? linear : null }
    const mine = channels.flatMap(c => field.lines[c.pl.i])
    return {
      ya: axisOf([...field.ly, ...mine.map(p => p[1])], sy.lowerBetter),
      xa: path ? axisOf([...field.lx, ...mine.map(p => p[0])], sx.lowerBetter) : null
    }
  }, [field, channels, pct, path, sy, sx])

  // Time across: the channels' span with a year either side (eight at least), or the band's.
  const domain = useMemo(() => {
    if (path) return null
    const xsOn = channels.flatMap(c => field.lines[c.pl.i].map(p => p[0]))
    const xsAll = xsOn.length ? xsOn : field.band.map(b => b.x)
    if (!xsAll.length) return [0, 1]
    let d0 = Math.min(...xsAll) - (xsOn.length ? 1 : 0)
    let d1 = Math.max(...xsAll) + (xsOn.length ? 1 : 0)
    if (d1 - d0 < 8) {
      const pad = (8 - (d1 - d0)) / 2
      d0 -= pad
      d1 += pad
    }
    return [d0, d1]
  }, [path, channels, field])

  const X0 = M.l
  const X1 = w - M.r
  const Y0 = M.t
  const Y1 = h - M.b
  const px = v => (path ? X0 + axes.xa.pos(v) * (X1 - X0) : X0 + ((v - domain[0]) / (domain[1] - domain[0])) * (X1 - X0))
  const py = v => Y1 - axes.ya.pos(v) * (Y1 - Y0)

  useEffect(() => {
    const c = faint.current
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr
    c.height = h * dpr
    const g = c.getContext('2d')
    g.scale(dpr, dpr)
    g.beginPath()
    g.rect(X0, Y0, X1 - X0, Y1 - Y0)
    g.clip()
    g.fillStyle = INK
    g.strokeStyle = INK
    if (path) {
      g.globalAlpha = DOT_ALPHA
      for (const line of field.lines) for (const [a, b] of line) g.fillRect(px(a) - 1.2, py(b) - 1.2, 2.4, 2.4)
      return
    }
    g.globalAlpha = FIELD_ALPHA
    g.lineWidth = 1
    for (const line of field.lines) {
      if (line.length < 2) continue
      g.beginPath()
      line.forEach(([a, b], k) => (k && a - line[k - 1][0] === 1 ? g.lineTo(px(a), py(b)) : g.moveTo(px(a), py(b))))
      g.stroke()
    }
  }, [field, axes, domain, w, h]) // eslint-disable-line react-hooks/exhaustive-deps -- px, py and the frame are these

  // The channels' points: [x, y, row index], in season order.
  const tracks = useMemo(() => channels.map(c => ({ ...c, pts: c.pl.rows.map((r, k) => [xOf(c.pl.i, k), yOf(c.pl.i, k), k]).filter(([a, b]) => a !== null && a !== undefined && b !== null && b !== undefined) })), [channels, field]) // eslint-disable-line react-hooks/exhaustive-deps -- xOf and yOf read field's inputs

  const marks = useMemo(() => {
    const out = []
    const placed = []
    const free = (a, b) => placed.every(([c, d]) => Math.hypot(a - c, b - d) >= 18)
    for (const t of tracks) {
      const pts = t.pts.map(([a, b, k]) => ({ X: px(a), Y: py(b), k, year: t.pl.rows[k].year }))
      if (!pts.length) continue
      pts.slice(1).forEach((p, j) => {
        const q = pts[j]
        const near = p.year - q.year === 1
        out.push(<line key={`${t.letter}s${j}`} x1={q.X} y1={q.Y} x2={p.X} y2={p.Y} stroke={t.color} strokeWidth={1.75} strokeOpacity={near ? 1 : 0.4} strokeDasharray={near ? undefined : '2 3'} />)
        // A path's direction, on its longer steps.
        if (path && near && Math.hypot(p.X - q.X, p.Y - q.Y) >= 24) {
          const deg = (Math.atan2(p.Y - q.Y, p.X - q.X) * 180) / Math.PI
          out.push(<polygon key={`${t.letter}a${j}`} points="2,0 -3,-3 -3,3" fill={t.color} transform={`translate(${(p.X + q.X) / 2} ${(p.Y + q.Y) / 2}) rotate(${deg})`} />)
        }
      })
      pts.forEach((p, j) => {
        const last = j === pts.length - 1
        if (path && j === 0) out.push(<rect key={`${t.letter}d${j}`} x={p.X - 3} y={p.Y - 3} width={6} height={6} fill={BG} stroke={t.color} strokeWidth={1.5} />)
        else out.push(<circle key={`${t.letter}d${j}`} cx={p.X} cy={p.Y} r={last ? 3.5 : 2.5} fill={t.color} stroke={last ? INK : 'none'} strokeWidth={1.5} />)
      })
      if (path) {
        // Seasons named where they don't crowd: his last, first and best, then every fourth.
        const best = pts.reduce((a, p) => (yOf(t.pl.i, p.k) > yOf(t.pl.i, a.k) ? p : a), pts[0])
        const order = [pts[pts.length - 1], pts[0], best, ...pts.filter(p => p.year % 4 === 0)]
        for (const p of order) {
          if (!free(p.X, p.Y)) continue
          placed.push([p.X, p.Y])
          out.push(<text key={`${t.letter}l${p.k}`} x={p.X + 6} y={p.Y - 6} style={{ fontFamily: MONO, fontSize: 8.5, fill: t.color, paintOrder: 'stroke', stroke: BG, strokeWidth: 3 }}>{seasonOf(t.pl.rows[p.k])}</text>)
        }
      }
    }
    // Time across: each line's letter at its end, nudged apart.
    if (!path) {
      const tags = tracks.filter(t => t.pts.length).map(t => {
        const [a, b] = t.pts[t.pts.length - 1]
        return { t, X: px(a), Y: py(b) }
      }).sort((a, b) => a.Y - b.Y)
      tags.forEach((g, j) => { if (j && g.Y - tags[j - 1].Y < 13) g.Y = tags[j - 1].Y + 13 })
      for (const g of tags) {
        out.push(
          <g key={`${g.t.letter}tag`} transform={`translate(${Math.min(g.X + 7, X1 + 20)} ${g.Y - 6})`}>
            <rect width={12} height={12} fill={g.t.color} />
            <text x={6} y={9} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, fill: '#1f1d1c' }}>{g.t.letter}</text>
          </g>
        )
      }
    }
    return out
  }, [tracks, axes, domain, w, h, path]) // eslint-disable-line react-hooks/exhaustive-deps -- px, py and yOf are these

  const band = !path && field.band.filter(b => b.x >= domain[0] && b.x <= domain[1])
  const xTicks = path ? [] : ticksOf(Math.ceil(domain[0]), Math.floor(domain[1]), X1 - X0)
  const yTicks = pct ? [10, 50, 90] : [axes.ya.lo, field.yMid, axes.ya.hi]
  const ends = (stat, a) => (stat.lowerBetter && !pct ? [a.hi, a.lo] : [a.lo, a.hi])

  const move = e => {
    const r = box.current.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    if (!path) {
      const v = Math.round(domain[0] + ((mx - X0) / (X1 - X0)) * (domain[1] - domain[0]))
      setHover(mx < X0 || mx > X1 ? null : { x: v })
      return
    }
    let best = null
    for (const t of tracks) for (const [a, b, k] of t.pts) {
      const d = Math.hypot(px(a) - mx, py(b) - my)
      if (d <= 18 && (!best || d < best.d)) best = { d, t, k, a, b }
    }
    setHover(best)
  }

  const docked = w < DOCK
  const hx = hover && !path ? hover.x : null
  const card = hover && (path ? <PathCard store={store} x={x} y={y} hover={hover} xs={xs} ys={ys} /> : <TimeCard store={store} mode={x} y={y} hx={hx} tracks={channels} ys={ys} band={field.band.find(b => b.x === hx)} pct={pct} />)
  const cardLeft = hover && (path ? px(hover.a) : px(hx))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap' }}>
        {channels.map(c => (
          <span key={c.letter} style={{ ...label, display: 'inline-flex', alignItems: 'center', gap: 5, color: INK }}>
            <span style={{ width: 7, height: 7, background: c.color }} />{c.letter} <span style={{ color: DIM }}>{c.pl.name.split(' ').slice(1).join(' ') || c.pl.name}</span>
          </span>
        ))}
        <span style={{ ...label, marginLeft: 'auto', fontSize: 8 }}>
          {path ? '▫ first season · ◉ last · ┼ median' : <><span style={{ display: 'inline-block', width: 10, height: 7, background: 'rgba(236,232,227,.16)', verticalAlign: -1, marginRight: 5 }} />P10–P90 · ┄ median · {store.rows.length.toLocaleString()} seasons</>}
        </span>
      </div>
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 340, touchAction: 'pan-y' }} onPointerMove={move} onPointerLeave={() => setHover(null)}>
        <canvas ref={faint} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: w, height: h, pointerEvents: 'none' }} />
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, display: 'block' }} role="img" aria-label={`${y} by ${path ? x : X_NAMES[x]}`}>
          <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke={RULE} />
          {yTicks.map((v, j) => (
            <g key={j}>
              <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke={RULE} strokeDasharray={j === 1 ? '2 3' : undefined} strokeOpacity={j === 1 ? 1 : 0.6} />
              <text x={X0 - 5} y={py(v) + 3} textAnchor="end" style={{ ...label, fontSize: 8, fill: FAINT }}>{pct ? v : fmt(sy, v)}</text>
            </g>
          ))}
          {band && band.length > 1 && (
            <>
              <polygon points={[...band.map(b => `${px(b.x)},${py(b.hi)}`), ...[...band].reverse().map(b => `${px(b.x)},${py(b.lo)}`)].join(' ')} fill={BAND_FILL} />
              <polyline points={band.map(b => `${px(b.x)},${py(b.mid)}`).join(' ')} fill="none" stroke={DIM} strokeWidth={1.25} strokeDasharray="4 3" />
              {[['P90', 'hi'], ['MED', 'mid'], ['P10', 'lo']].map(([n, k]) => (
                <text key={n} x={Math.min(px(band[band.length - 1].x) + 4, X1 + 2)} y={py(band[band.length - 1][k]) + 3} style={{ ...label, fontSize: 7.5, fill: FAINT }}>{n}</text>
              ))}
            </>
          )}
          {path && (
            <>
              <line x1={px(field.xMid)} x2={px(field.xMid)} y1={Y0} y2={Y1} stroke={EDGE} strokeDasharray="2 3" />
              {(() => {
                const [xl, xr] = ends(sx, axes.xa)
                return (
                  <>
                    <text x={X0} y={Y1 + 16} style={{ ...label, fill: FAINT }}>{pct ? 0 : fmt(sx, xl)}</text>
                    <text x={X1} y={Y1 + 16} textAnchor="end" style={{ ...label, fill: FAINT }}>{pct ? 100 : fmt(sx, xr)}</text>
                  </>
                )
              })()}
            </>
          )}
          {xTicks.map(t => (
            <text key={t} x={px(t)} y={Y1 + 14} textAnchor="middle" style={{ ...label, fontSize: 8.5, fill: FAINT }}>{tick(t, x)}</text>
          ))}
          <text x={(X0 + X1) / 2} y={Y1 + 26} textAnchor="middle" style={{ ...label, fontSize: 8, fill: DIM }}>{path ? `${x}${pct ? ' · pctl' : axes.xa.root ? ' · √ scale' : ''} →` : X_NAMES[x]}</text>
          <text x={X0 - 40} y={(Y0 + Y1) / 2} textAnchor="middle" transform={`rotate(-90 ${X0 - 40} ${(Y0 + Y1) / 2})`} style={{ ...label, fontSize: 8, fill: DIM }}>{y}{pct ? ' · pctl' : axes.ya.root ? ' · √ scale' : ''} →</text>
          {hx !== null && <line x1={px(hx)} x2={px(hx)} y1={Y0} y2={Y1} stroke={INK} strokeOpacity={0.35} />}
          {marks}
          {hover && path && <circle cx={px(hover.a)} cy={py(hover.b)} r={7} fill="none" stroke={INK} strokeWidth={1.5} />}
          {!path && (
            <text x={X0 + 6} y={Y0 + 12} style={{ ...label, fontSize: 7.5, fill: FAINT }}>Band = qualified seasons at {BAND_AT[x]}{x === 'age' ? ' (survivors)' : ''}</text>
          )}
        </svg>
        {card && !docked && (
          <div style={{ position: 'absolute', top: 8, left: cardLeft > w * 0.6 ? cardLeft - 14 - CARD_W : cardLeft + 14, width: CARD_W, pointerEvents: 'none', zIndex: 5 }}>{card}</div>
        )}
      </div>
      {docked && <div style={{ minHeight: 96, borderTop: `1px solid ${RULE}` }}>{card || <span style={{ ...label, display: 'block', padding: 12, color: FAINT }}>Drag across the chart to read it</span>}</div>}
    </>
  )
}

const cardStyle = { background: '#1f1d1c', border: '1px solid #837d76', borderTop: '2px solid #fa962a', boxShadow: '5px 5px 0 rgba(0,0,0,.55)', padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }
const surname = n => n.split(' ').slice(1).join(' ') || n

// Time across: each channel's season at the x under the pointer, and the league's spread.
function TimeCard({ store, mode, y, hx, tracks, ys, band, pct }) {
  const st = store.stats[y]
  return (
    <div style={cardStyle}>
      <span style={{ ...label, color: INK, fontWeight: 700 }}>{mode === 'season' ? `${hx - 1}–${String(hx).slice(2)}` : `${mode === 'age' ? 'Age' : 'Year'} ${hx}`}</span>
      {tracks.map(c => {
        const k = c.pl.rows.findIndex(r => TIME[mode](r) === hx)
        const v = k < 0 ? null : ys[c.pl.i].v[k]
        const p = k < 0 ? null : ys[c.pl.i].p[k]
        return (
          <span key={c.letter} style={{ display: 'grid', gridTemplateColumns: '9px minmax(0, 1fr) auto', gap: 6, alignItems: 'baseline' }}>
            <span style={{ width: 7, height: 7, background: c.color }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surname(c.pl.name)}</span>
              <span style={{ ...label, fontSize: 8 }}>{k < 0 ? '— not on the board' : `${c.pl.rows[k].season.replace('-', '–')} · ${c.pl.rows[k].team}`}</span>
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: v === null ? FAINT : INK, textAlign: 'right' }}>
              {pct ? (p === null ? '—' : ord(p)) : fmt(st, v)}
              {!pct && p !== null && <span style={{ ...label, fontSize: 8, marginLeft: 5 }}>{ord(p)}</span>}
            </span>
          </span>
        )
      })}
      <span style={{ height: 1, background: RULE }} />
      <span style={{ ...label, fontSize: 8 }}>{band ? `League med ${pct ? ord(Math.round(band.mid)) : fmt(st, band.mid)} · P10–P90 ${pct ? `${Math.round(band.lo)}–${Math.round(band.hi)}` : `${fmt(st, band.lo)} – ${fmt(st, band.hi)}`}` : 'Too few seasons here for a band'}</span>
    </div>
  )
}

// A stat across: the season under the pointer on a channel's path.
function PathCard({ store, x, y, hover, xs, ys }) {
  const { t, k } = hover
  const r = t.pl.rows[k]
  const line = (l, c) => (
    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
      <span style={{ ...label, fontSize: 8.5 }}>{l}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: INK }}>{fmt(store.stats[l], c.v[k])}<span style={{ ...label, fontSize: 8, marginLeft: 5 }}>{c.p[k] === null ? '' : ord(c.p[k])}</span></span>
    </span>
  )
  return (
    <div style={cardStyle}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, background: t.color }} />
        <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: INK }}>{t.pl.name}</span>
      </span>
      <span style={{ ...label, fontSize: 8 }}>{[r.season.replace('-', '–'), r.team, r.age !== null && `age ${r.age}`].filter(Boolean).join(' · ')}</span>
      <span style={{ height: 1, background: RULE }} />
      {line(x, xs[t.pl.i])}
      {line(y, ys[t.pl.i])}
    </div>
  )
}
