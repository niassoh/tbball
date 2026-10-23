import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MONO, fmt, ord } from '../lib/format.js'
import { TIME, domainOf, envelope, headAt, middle98, pctlPos } from '../lib/careers.js'
import { axisOf, median } from '../lib/leaderboard.js'

// Careers' chart, time across (a season, his age or his year of career): every career on
// the boards a faint line painted on one canvas, the league's 10th–90th percentile band
// and median at each x over it, and the channels' careers drawn on top, a season off the
// board a dotted bridge. Better is up: raw values on the Leaderboard's median-centred axes
// (lib/leaderboard.js axisOf), percentiles 0–100. The canvas is painted when the data or
// the frame change, never as the pointer moves; the readout follows the pointer, each
// channel's season at the x under it. Played (`playing`, the page's Play), it's drawn across
// from the axis's start, PER_YEAR a year: all of it up to a playhead, so a career's line
// starts in his first year, its head and his name riding its tip; at the end it's whole
// again (`setPlaying(false)`).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const BG = '#262422'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const M = { l: 50, r: 34, t: 14, b: 30 }
// The background's ink, tuned by eye: faint enough that the channels lead, dense enough
// that the league's shape shows.
const FIELD_ALPHA = 0.055
const BAND_FILL = 'rgba(236, 232, 227, .055)'
const CARD_W = 236
const PER_YEAR = 800
// Below this width the readout sits under the chart rather than over it.
const DOCK = 520
const X_NAMES = { season: 'Season', age: 'Age', career: 'Year of career' }
const BAND_AT = { season: 'each season', age: 'each age', career: 'each year of career' }
const tick = (x, mode) => (mode === 'season' ? `’${String(x).slice(2)}` : String(x))
const surname = n => n.split(' ').slice(1).join(' ') || n

// Whole-number ticks a step apart, about one per 56px.
const ticksOf = (d0, d1, room) => {
  const step = [1, 2, 4, 5, 10].find(s => (d1 - d0) / s <= Math.max(2, room / 56)) || 10
  const out = []
  for (let t = Math.ceil(d0 / step) * step; t <= d1; t += step) out.push(t)
  return out
}

export default function CareerChart({ store, x, y, scale, ys, channels, playing = false, setPlaying }) {
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
  const pct = scale === 'pctl'
  const sy = store.stats[y]
  const at = TIME[x]
  const yOf = (i, k) => (pct ? ys[i].p[k] : ys[i].v[k])
  const xOf = (i, k) => at(store.players[i].rows[k])

  // Every player's points, the league's values for the axis, and its band.
  const field = useMemo(() => {
    const lines = store.players.map((pl, i) => pl.rows.map((r, k) => [xOf(i, k), yOf(i, k)]).filter(([a, b]) => a !== null && a !== undefined && b !== null && b !== undefined))
    const all = lines.flat()
    return {
      lines,
      ly: middle98(all.map(p => p[1])),
      yMid: pct ? 50 : median(all.map(p => p[1])),
      band: envelope(all)
    }
  }, [store, x, y, scale, ys]) // eslint-disable-line react-hooks/exhaustive-deps -- xOf and yOf are these

  // The y axis: the league's middle 98%, stretched to keep the channels' own seasons in
  // frame (the stars are the league's top 1%).
  const axes = useMemo(() => {
    if (pct) return { ya: { lo: 0, hi: 100, root: false, pos: v => pctlPos(Math.max(0, Math.min(100, v))) } }
    return { ya: axisOf([...field.ly, ...channels.flatMap(c => field.lines[c.pl.i]).map(p => p[1])], sy.lowerBetter) }
  }, [field, channels, pct, sy])

  // Across: the channels' years (lib/careers.js domainOf), or the band's.
  const domain = useMemo(() => {
    const mine = channels.flatMap(c => field.lines[c.pl.i].map(p => p[0]))
    return domainOf(mine.length ? mine : field.band.map(b => b.x), field.lines.flat().map(p => p[0]))
  }, [channels, field])

  // While playing, how far across it's drawn: a share of the axis (so a new axis never sees
  // the last one's x; it starts over), and the x that is (null: whole).
  const [share, setShare] = useState(null)
  useEffect(() => {
    if (!playing) {
      setShare(null)
      return
    }
    const span = (domain[1] - domain[0]) * PER_YEAR
    const start = performance.now()
    let id
    const step = now => {
      const f = Math.max(0, now - start) / span
      if (f >= 1) {
        setShare(null)
        setPlaying(false)
        return
      }
      setShare(f)
      id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [playing, domain[0], domain[1], setPlaying]) // eslint-disable-line react-hooks/exhaustive-deps -- the axis's ends, not the array
  const upTo = share === null ? null : domain[0] + share * (domain[1] - domain[0])

  const X0 = M.l
  const X1 = w - M.r
  const Y0 = M.t
  const Y1 = h - M.b
  const px = v => X0 + ((v - domain[0]) / (domain[1] - domain[0])) * (X1 - X0)
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
    g.strokeStyle = INK
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

  // One career leads: the first player's, or the one whose name is under the pointer in the
  // legend (`focus`). It's drawn last, at full weight; the others sit back, thinner and
  // dimmer.
  const [focus, setFocus] = useState(null)
  const leadOf = t => (focus ? t.letter === focus : t === tracks[0])
  const marks = useMemo(() => {
    const out = []
    for (const t of [...tracks].sort((a, b) => leadOf(a) - leadOf(b))) {
      const lead = leadOf(t)
      const fade = lead ? 1 : focus ? 0.25 : 0.7
      const pts = t.pts.map(([a, b, k]) => ({ X: px(a), Y: py(b), k, year: t.pl.rows[k].year }))
      if (!pts.length) continue
      pts.slice(1).forEach((p, j) => {
        const q = pts[j]
        const near = p.year - q.year === 1
        out.push(<line key={`${t.letter}s${j}`} x1={q.X} y1={q.Y} x2={p.X} y2={p.Y} stroke={t.color} strokeWidth={lead ? 2.5 : 1.75} strokeOpacity={(near ? 1 : 0.4) * fade} strokeDasharray={near ? undefined : '2 3'} />)
      })
      pts.forEach((p, j) => {
        const last = j === pts.length - 1
        out.push(<circle key={`${t.letter}d${j}`} cx={p.X} cy={p.Y} r={last ? 3.5 : lead ? 2.5 : 2} fill={t.color} fillOpacity={fade} stroke={last && lead ? INK : 'none'} strokeWidth={1.5} />)
      })
    }
    return out
  }, [tracks, axes, domain, w, h, focus]) // eslint-disable-line react-hooks/exhaustive-deps -- px, py and leadOf are these

  // Each line's tip: its last point, or while playing where it's drawn to (none before his
  // first year), on the segment it's crossing. A playing tip carries a head; his surname sits
  // beside it in his colour, the names nudged apart.
  const tips = tracks.map(tr => {
    const hd = headAt(tr.pts.map(p => p[0]), upTo ?? Infinity)
    if (!hd) return null
    const [a, b] = tr.pts[hd.j]
    if (hd.done) return { tr, X: px(a), Y: py(b) }
    const q = py(tr.pts[hd.j - 1][1])
    return { tr, X: px(upTo), Y: q + (py(b) - q) * hd.f }
  }).filter(Boolean).sort((a, b) => leadOf(a.tr) - leadOf(b.tr))
  const tags = [...tips].sort((a, b) => a.Y - b.Y).map(g => ({ ...g, tagY: g.Y }))
  tags.forEach((g, j) => { if (j && g.tagY - tags[j - 1].tagY < 13) g.tagY = tags[j - 1].tagY + 13 })

  const band = field.band.filter(b => b.x >= domain[0] && b.x <= domain[1])
  const xTicks = ticksOf(Math.ceil(domain[0]), Math.floor(domain[1]), X1 - X0)
  // Percentiles: ticks where the scale stretches show it (10 and 90 sit nearer 1 and 99 than an even scale would put them).
  const yTicks = pct ? [10, 25, 50, 75, 90, 99] : [axes.ya.lo, field.yMid, axes.ya.hi]

  const move = e => {
    const mx = e.clientX - box.current.getBoundingClientRect().left
    setHover(mx < X0 || mx > X1 ? null : Math.round(domain[0] + ((mx - X0) / (X1 - X0)) * (domain[1] - domain[0])))
  }

  const docked = w < DOCK
  const hx = hover
  const card = hx !== null && <TimeCard store={store} mode={x} y={y} hx={hx} tracks={channels} ys={ys} band={field.band.find(b => b.x === hx)} pct={pct} />
  const cardLeft = hx !== null && px(hx)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap' }}>
        {channels.map(c => (
          <span key={c.letter} onMouseEnter={() => setFocus(c.letter)} onMouseLeave={() => setFocus(null)} title="Hover to bring him forward"
            style={{ ...label, display: 'inline-flex', alignItems: 'center', gap: 6, color: c.color, fontWeight: 700, cursor: 'default', opacity: focus && focus !== c.letter ? 0.4 : 1 }}>
            <span style={{ width: 14, height: 3, background: c.color }} />{surname(c.pl.name)}
          </span>
        ))}
        <span title={`The band: the 10th to 90th percentile of qualified seasons at ${BAND_AT[x]}${x === 'age' ? ', so only those still playing (survivors)' : ''}`} style={{ ...label, marginLeft: 'auto', fontSize: 8, cursor: 'help' }}>
          <span style={{ display: 'inline-block', width: 10, height: 7, background: 'rgba(236,232,227,.16)', verticalAlign: -1, marginRight: 5 }} />P10–P90 · ┄ median · {store.rows.length.toLocaleString()} seasons
        </span>
      </div>
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 340, touchAction: 'pan-y' }} onPointerMove={move} onPointerLeave={() => setHover(null)}>
        <canvas ref={faint} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: w, height: h, pointerEvents: 'none', clipPath: upTo === null ? undefined : `inset(0 ${w - px(upTo)}px 0 0)` }} />
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, display: 'block' }} role="img" aria-label={`${y} by ${X_NAMES[x]}`}>
          <defs><clipPath id="career-play"><rect width={upTo === null ? w : px(upTo)} height={h} /></clipPath></defs>
          <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke={RULE} />
          {yTicks.map((v, j) => (
            <g key={j}>
              <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke={RULE} strokeDasharray={v === (pct ? 50 : field.yMid) ? '2 3' : undefined} strokeOpacity={v === (pct ? 50 : field.yMid) ? 1 : 0.6} />
              <text x={X0 - 5} y={py(v) + 3} textAnchor="end" style={{ ...label, fontSize: 8, fill: FAINT }}>{pct ? v : fmt(sy, v)}</text>
            </g>
          ))}
          {band.length > 1 && (
            <g clipPath="url(#career-play)">
              <polygon points={[...band.map(b => `${px(b.x)},${py(b.hi)}`), ...[...band].reverse().map(b => `${px(b.x)},${py(b.lo)}`)].join(' ')} fill={BAND_FILL} />
              <polyline points={band.map(b => `${px(b.x)},${py(b.mid)}`).join(' ')} fill="none" stroke={DIM} strokeWidth={1.25} strokeDasharray="4 3" />
              {[['P90', 'hi'], ['MED', 'mid'], ['P10', 'lo']].map(([n, k]) => (
                <text key={n} x={Math.min(px(band[band.length - 1].x) + 4, X1 + 2)} y={py(band[band.length - 1][k]) + 3} style={{ ...label, fontSize: 7.5, fill: FAINT }}>{n}</text>
              ))}
            </g>
          )}
          {/* A tick the playhead's year covers gives way to it. */}
          {xTicks.filter(t => upTo === null || Math.abs(px(t) - px(upTo)) >= 24).map(t => (
            <text key={t} x={px(t)} y={Y1 + 14} textAnchor="middle" style={{ ...label, fontSize: 8.5, fill: FAINT }}>{tick(t, x)}</text>
          ))}
          <text x={(X0 + X1) / 2} y={Y1 + 26} textAnchor="middle" style={{ ...label, fontSize: 8, fill: DIM }}>{X_NAMES[x]}</text>
          <text x={X0 - 40} y={(Y0 + Y1) / 2} textAnchor="middle" transform={`rotate(-90 ${X0 - 40} ${(Y0 + Y1) / 2})`} style={{ ...label, fontSize: 8, fill: DIM }}>{y}{pct ? ' · pctl' : axes.ya.root ? ' · √ scale' : ''} →</text>
          {hx !== null && <line x1={px(hx)} x2={px(hx)} y1={Y0} y2={Y1} stroke={INK} strokeOpacity={0.35} />}
          <g clipPath="url(#career-play)">{marks}</g>
          {upTo !== null && (
            <g aria-hidden="true">
              <line x1={px(upTo)} x2={px(upTo)} y1={Y0} y2={Y1} stroke={INK} strokeOpacity={0.3} />
              <rect x={px(upTo) - 15} y={Y1 + 4} width={30} height={14} fill={INK} />
              <text x={px(upTo)} y={Y1 + 14} textAnchor="middle" style={{ ...label, fontSize: 8.5, fontWeight: 700, fill: BG }}>{tick(Math.floor(upTo), x)}</text>
              {tips.map(g => <circle key={g.tr.letter} cx={g.X} cy={g.Y} r={3.5} fill={g.tr.color} fillOpacity={leadOf(g.tr) ? 1 : focus ? 0.25 : 0.7} stroke={leadOf(g.tr) ? INK : 'none'} strokeWidth={1.5} />)}
            </g>
          )}
          {tags.map(g => (
            <text key={`${g.tr.letter}tag`} opacity={leadOf(g.tr) ? 1 : focus ? 0.3 : 0.75} x={g.X + 8} y={g.tagY + 3.5} textAnchor={g.X + 8 + 70 > w ? 'end' : 'start'} dx={g.X + 8 + 70 > w ? -16 : 0}
              style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', fill: g.tr.color, paintOrder: 'stroke', stroke: BG, strokeWidth: 3 }}>{surname(g.tr.pl.name)}</text>
          ))}
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
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: c.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surname(c.pl.name)}</span>
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
