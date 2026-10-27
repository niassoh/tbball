import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MONO, fmt } from '../lib/format.js'
import { asset } from '../lib/static.js'
import { frameOf, netLines, placeOf, tiedOf } from '../lib/teamboard.js'
import { AxisPicker } from './LeaderScatter.jsx'

// The Team board's chart: every team as its logo, ORTG across and DRTG up (a lower DRTG
// higher: better up and right), both axes on one scale so net rating's lines run at 45°,
// every five points, the league's average crossing at the centre. The good-offense,
// good-defense corner is washed blue, the bad-bad one orange (the site's better and worse).
// Each logo is in its colours with a dark halo; the team under the pointer, here or in
// the table (`hot`), lifts as the rest step back, and a hover brings its card: record, the
// two ratings and net, each with its place among the 30; a click opens its card. Over many
// seasons (a span or runs) it plots rORTG and rDRTG, each against its season's league.
// Any two of the board's stats can be picked instead (the Leaderboard's X and Y): each
// axis then on its own scale, the league at the centre, better up and right (a style,
// pace or a share, just more), with no net lines.
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const BLUE = '#597ec1'
const ORANGE = '#fa962a'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const M = { l: 36, r: 16, t: 22, b: 38 }
// A logo's size; each in its own colours with a tight dark halo, so clustered teams stay
// apart without boxes.
const LOGO = 30
const HALO = 'drop-shadow(0 0 1.5px rgba(20,19,18,.95)) drop-shadow(0 1px 3px rgba(0,0,0,.6))'
const CARD_W = 210
// Over many seasons: each row a square MARK wide; the best ELITE franchises (each by its
// best row) keep their logos.
const MARK = 7
const ELITE = 6
// A team-season of fewer games than this (a season just begun) stays off the field: three
// games' ratings would stretch its frame to ±35 and take the best franchises' places.
const FIELD_GAMES = 15

export default function TeamScatter({ doc, hot, setHot, onPick }) {
  const box = useRef(null)
  const [size, setSize] = useState({ w: 560, h: 520 })
  const [hover, setHover] = useState(null)
  const [axes, setAxes] = useState({})
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const { w, h } = size
  // Over many seasons each team against its own season's league (rORTG, rDRTG), so a span
  // across eras of scoring (the league's 105 in 2014, 115 in 2024) sits on one centre, 0.
  const X = doc.labels.includes(axes.x) ? axes.x : doc.many ? 'rORTG' : 'ORTG'
  const Y = doc.labels.includes(axes.y) ? axes.y : doc.many ? 'rDRTG' : 'DRTG'
  const sx = doc.stats[X]
  const sy = doc.stats[Y]
  // The ratings, offense against defense: one scale, net's lines.
  const ratings = (X === 'ORTG' && Y === 'DRTG') || (X === 'rORTG' && Y === 'rDRTG')
  const rel = ratings && X === 'rORTG'
  const kx = doc.labels.indexOf(X)
  const ky = doc.labels.indexOf(Y)
  const lgO = doc.league.ORTG ?? 116
  const lgDRTG = doc.league.DRTG ?? lgO
  const end = v => (rel && v > 0 ? `+${v.toFixed(0)}` : v.toFixed(0).replace('-', '−'))
  const field = !!doc.dated
  const games = t => (t.v[doc.labels.indexOf('Wins')] ?? 0) + (t.v[doc.labels.indexOf('Losses')] ?? 0)
  const teams = doc.teams.filter(t => t.v[kx] !== null && t.v[ky] !== null && (!field || games(t) >= FIELD_GAMES))
  const mean = k => teams.reduce((n, t) => n + t.v[k], 0) / teams.length
  const league = rel ? 0 : ratings ? lgO : doc.league[X] ?? mean(kx)
  const lgD = rel ? 0 : ratings ? lgDRTG : doc.league[Y] ?? mean(ky)
  // The ratings on one scale both ways: the frame's span fills the plot's shorter side, the
  // longer side shows more rating around the centre. Other stats each to their farthest
  // team from the league, a lower-is-better one reversed. (x0, y0: the left and top ends.)
  const { x0, x1, y0, y1, lines } = useMemo(() => {
    const pw = w - M.l - M.r
    const ph = h - M.t - M.b
    if (!ratings) {
      const half = (k, c, px) => Math.max(...teams.map(t => Math.abs(t.v[k] - c)), 1e-6) * (1 + (LOGO * 2) / px)
      const hx = half(kx, league, pw)
      const hy = half(ky, lgD, ph)
      const [l, r] = sx.lowerBetter ? [league + hx, league - hx] : [league - hx, league + hx]
      const [t, b] = sy.lowerBetter ? [lgD - hy, lgD + hy] : [lgD + hy, lgD - hy]
      return { x0: l, x1: r, y0: t, y1: b, lines: [] }
    }
    const f = frameOf(teams.map(t => t.v[kx]), teams.map(t => t.v[ky]), league)
    const s = Math.min(pw, ph) / (f.x[1] - f.x[0])
    const fr = { x: [league - pw / s / 2, league + pw / s / 2], y: [lgD - ph / s / 2, lgD + ph / s / 2] }
    return { x0: fr.x[0], x1: fr.x[1], y0: fr.y[0], y1: fr.y[1], lines: netLines(fr, 5) }
  }, [doc, w, h, X, Y]) // eslint-disable-line react-hooks/exhaustive-deps -- teams, kx, ky, sx, sy, ratings, league and lgD are doc's, X's and Y's
  const px = v => M.l + ((v - x0) / (x1 - x0)) * (w - M.l - M.r)
  // Lower DRTG is better: it sits higher.
  const py = v => M.t + ((v - y0) / (y1 - y0)) * (h - M.t - M.b)
  const cx = px(league)
  const cy = py(lgD)
  const net = tm => tm.v[kx] - tm.v[ky]
  // How far up and right, in the plot: on the ratings' one scale, net rating.
  const toward = tm => px(tm.v[kx]) - cx + (cy - py(tm.v[ky]))
  // A row per team-season or per run (`dated`): hundreds of rows, so each is a plain square
  // and only the era's best franchises keep a logo, their years beside it; pointing at any
  // row draws its franchise's arc (below).
  const logo = (tm, s = LOGO) => (
    <g key={tm.id} data-id={tm.id} className="tb-logo" style={{ transform: `translate(${px(tm.v[kx])}px, ${py(tm.v[ky])}px)`, cursor: 'pointer' }}>
      <image href={asset(`logos/color/${tm.team}.png`)} x={-s / 2} y={-s / 2} width={s} height={s} style={{ filter: HALO }} />
    </g>
  )
  const marks = useMemo(() => {
    if (!field) return teams.map(tm => logo(tm))
    const bestOf = new Map()
    for (const tm of teams) if (!bestOf.has(tm.team) || toward(tm) > toward(bestOf.get(tm.team))) bestOf.set(tm.team, tm)
    const elite = [...bestOf.values()].sort((a, b) => toward(b) - toward(a)).slice(0, ELITE)
    const top = new Set(elite.map(tm => tm.id))
    return (
      <>
        {teams.filter(tm => !top.has(tm.id)).map(tm => (
          <rect key={tm.id} data-id={tm.id} x={px(tm.v[kx]) - MARK / 2} y={py(tm.v[ky]) - MARK / 2} width={MARK} height={MARK} fill={DIM} fillOpacity={0.6} style={{ cursor: 'pointer' }} />
        ))}
        {elite.map(tm => (
          <g key={tm.id}>
            {logo(tm, LOGO * 0.8)}
            <text x={px(tm.v[kx]) + LOGO * 0.45} y={py(tm.v[ky]) + 3} style={{ ...label, fontSize: 8, fill: INK, paintOrder: 'stroke', stroke: '#262422', strokeWidth: 3, pointerEvents: 'none' }}>{tm.span}</text>
          </g>
        ))}
      </>
    )
  }, [doc, w, h, X, Y]) // eslint-disable-line react-hooks/exhaustive-deps -- teams, px, py, kx, ky, logo and toward are doc's, w's, h's, X's and Y's
  const lit = hover || hot
  // The lit row (`t` while it's on the chart) and its franchise's rows on the field, in
  // season order: its arc, drawn even for a row off the field (a season just begun).
  const litRow = lit && doc.teams.find(x => x.id === lit)
  const t = litRow && teams.includes(litRow) ? litRow : null
  const arc = litRow && field ? teams.filter(x => x.team === litRow.team).sort((a, b) => (a.id < b.id ? -1 : 1)) : null
  const shown = !!(t || (arc && arc.length))
  const best = teams.reduce((a, b) => (net(b) > net(a) ? b : a), teams[0])
  // Better and worse corners, where both stats have a better (not a style, pace or a share).
  const better = !sx.neutral && !sy.neutral
  const tick = (st, v) => (ratings ? end(v) : fmt(st, v))
  const lgText = (st, v) => (rel ? 'League' : ratings ? v.toFixed(1) : fmt(st, v))
  const title = (l, st, way) => (ratings ? `${l} · ${way} →` : `${l} · ${st.neutral ? 'more' : 'better'} →`)
  const corner = (dx, dy) => teams.filter(tm => dx * (px(tm.v[kx]) - cx) > 0 && dy * (cy - py(tm.v[ky])) > 0).length
  const cell = { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, borderLeft: `1px solid ${RULE}` }
  const big = { fontFamily: MONO, fontSize: 18, fontWeight: 600, color: INK, lineHeight: 1 }
  const cap = { ...label, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap' }}>
        <AxisPicker doc={doc} axis="X" value={X} set={v => setAxes(a => ({ ...a, x: v }))} />
        <AxisPicker doc={doc} axis="Y" value={Y} set={v => setAxes(a => ({ ...a, y: v }))} />
        <span style={{ ...label, fontSize: 8 }}>{rel ? "Per 100 vs each season's league · better ↗" : ratings ? 'Per 100 possessions · better ↗' : better ? 'Better ↗' : ''}</span>
        <span style={{ ...label, fontSize: 8, marginLeft: 'auto' }}>{ratings ? '╱ Net rating every 5 · ┼ league' : '┼ league'}</span>
      </div>
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 320 }} onMouseLeave={() => { setHover(null); setHot(null) }}>
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, display: 'block' }} role="img" aria-label={`Every team's ${X} against its ${Y}`}>
          <defs>
            <clipPath id="tb-plot"><rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} /></clipPath>
          </defs>
          <g clipPath="url(#tb-plot)">
            {better && <rect x={cx} y={M.t} width={w - M.r - cx} height={cy - M.t} fill={BLUE} fillOpacity={0.055} />}
            {better && <rect x={M.l} y={cy} width={cx - M.l} height={h - M.b - cy} fill={ORANGE} fillOpacity={0.055} />}
            {lines.map(([k, a, b]) => (
              <line key={k} x1={px(a[0])} y1={py(a[1])} x2={px(b[0])} y2={py(b[1])} stroke={k === 0 ? '#837d76' : '#6b655f'} strokeOpacity={k === 0 ? 0.9 : 0.8} strokeDasharray={k === 0 ? undefined : '1 3'} />
            ))}
            <line x1={cx} x2={cx} y1={M.t} y2={h - M.b} stroke={EDGE} strokeDasharray="2 3" />
            <line x1={M.l} x2={w - M.r} y1={cy} y2={cy} stroke={EDGE} strokeDasharray="2 3" />
          </g>
          <rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} fill="none" stroke={RULE} />
          {/* Each net line named outside the frame, like a ruler: a positive one where it leaves
              the top, a negative one where it leaves the bottom (clear of the ORTG ticks). */}
          {lines.map(([k, a, b]) => {
            const top = k >= 0 && a[1] <= y0 + 1e-9
            const bottom = k < 0 && b[1] >= y1 - 1e-9
            if (!top && !bottom) return null
            const X = px(top ? a[0] : b[0])
            if (bottom && [M.l, cx, w - M.r].some(t => Math.abs(t - X) < (rel && t === cx ? 38 : 28))) return null
            return <text key={k} x={X} y={top ? M.t - 6 : h - M.b + 14} textAnchor="middle" style={{ ...label, fontSize: 8, fill: k === 0 ? DIM : FAINT }}>{k > 0 ? `+${k}` : k === 0 ? 'NET 0' : `−${-k}`}</text>
          })}
          {ratings && (
            <>
              <text x={w - M.r - 8} y={M.t + 14} textAnchor="end" style={{ ...label, fontSize: 8.5, fill: BLUE }}>GOOD O · GOOD D</text>
              <text x={M.l + 8} y={h - M.b - 8} style={{ ...label, fontSize: 8.5, fill: ORANGE }}>BAD O · BAD D</text>
              <text x={M.l + 8} y={M.t + 14} style={{ ...label, fontSize: 8, fill: FAINT }}>BAD O · GOOD D</text>
              <text x={w - M.r - 8} y={h - M.b - 8} textAnchor="end" style={{ ...label, fontSize: 8, fill: FAINT }}>GOOD O · BAD D</text>
            </>
          )}
          {/* The axes: their ends and the league's average. */}
          <text x={M.l} y={h - M.b + 14} style={{ ...label, fill: FAINT }}>{tick(sx, x0)}</text>
          <text x={cx} y={h - M.b + 14} textAnchor="middle" style={{ ...label, fill: DIM }}>{lgText(sx, league)}</text>
          <text x={w - M.r} y={h - M.b + 14} textAnchor="end" style={{ ...label, fill: FAINT }}>{tick(sx, x1)}</text>
          <text x={(M.l + cx) / 2} y={h - M.b + 30} textAnchor="middle" style={{ ...label, fontSize: 8, fill: DIM }}>{title(X, sx, 'points scored')}</text>
          <text x={M.l - 6} y={M.t + 4} textAnchor="end" style={{ ...label, fill: FAINT }} transform={`rotate(-90 ${M.l - 6} ${M.t + 4})`}>{tick(sy, y0)}</text>
          <text x={M.l - 6} y={cy} textAnchor="middle" style={{ ...label, fill: DIM }} transform={`rotate(-90 ${M.l - 6} ${cy})`}>{lgText(sy, lgD)}</text>
          <text x={M.l - 6} y={(M.t + cy) / 2} textAnchor="middle" style={{ ...label, fontSize: 8, fill: DIM }} transform={`rotate(-90 ${M.l - 6} ${(M.t + cy) / 2})`}>{title(Y, sy, 'fewer allowed')}</text>
        </svg>
        {/* The marks, drawn once a board and size, on a layer of their own that a hover only
            dims (index.css .tb-logos); the lit one again, larger, with its franchise's arc, on
            the layer over it. One listener for them all. */}
        <svg width={w} height={h} className="tb-logos" style={{ position: 'absolute', inset: 0, display: 'block', opacity: shown ? 0.25 : 1 }}
          onMouseOver={e => { const id = e.target.closest('[data-id]')?.dataset.id; if (id) { setHover(id); setHot(id) } }}
          onClick={e => { const id = e.target.closest('[data-id]')?.dataset.id; if (id) onPick(id) }}>
          {marks}
        </svg>
        {shown && (
          <svg width={w} height={h} style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none' }}>
            {arc && (
              <>
                <polyline points={arc.map(x => `${px(x.v[kx])},${py(x.v[ky])}`).join(' ')} fill="none" stroke={INK} strokeWidth={1.5} strokeLinejoin="miter" />
                {arc.map(x => <rect key={x.id} x={px(x.v[kx]) - MARK / 2} y={py(x.v[ky]) - MARK / 2} width={MARK} height={MARK} fill={INK} />)}
                {/* Each point its year (a run's by the year it ends), so the path reads in order. */}
                {arc.filter(x => x !== t).map(x => (
                  <text key={x.id} x={px(x.v[kx]) + 6} y={py(x.v[ky]) - 5} style={{ ...label, fontSize: 8.5, fill: INK, paintOrder: 'stroke', stroke: '#262422', strokeWidth: 3 }}>’{x.season.slice(5)}</text>
                ))}
              </>
            )}
            {t && (
              <g className="tb-logo" style={{ transform: `translate(${px(t.v[kx])}px, ${py(t.v[ky])}px)` }}>
                <image href={asset(`logos/color/${t.team}.png`)} x={-LOGO * 0.65} y={-LOGO * 0.65} width={LOGO * 1.3} height={LOGO * 1.3} style={{ filter: HALO }} />
              </g>
            )}
          </svg>
        )}
        {t && (() => {
          const tx = px(t.v[kx])
          const ty = py(t.v[ky])
          // Beside its mark; with an arc, in the plot's corner farthest from it, off the path.
          const CARD_H = 140
          const far = arc && (() => {
            const ax = arc.reduce((n, x) => n + px(x.v[kx]), 0) / arc.length
            const ay = arc.reduce((n, x) => n + py(x.v[ky]), 0) / arc.length
            const corners = [[M.l + 8, M.t + 8], [w - M.r - 8 - CARD_W, M.t + 8], [M.l + 8, h - M.b - 8 - CARD_H], [w - M.r - 8 - CARD_W, h - M.b - 8 - CARD_H]]
            return corners.reduce((a, b) => (Math.hypot(b[0] + CARD_W / 2 - ax, b[1] + CARD_H / 2 - ay) > Math.hypot(a[0] + CARD_W / 2 - ax, a[1] + CARD_H / 2 - ay) ? b : a))
          })()
          const left = far ? far[0] : tx + 26 + CARD_W < w ? tx + 26 : tx - 26 - CARD_W
          const row = (name, v, l) => {
            const place = placeOf(doc, t, l)
            return (
              <span key={l} style={{ display: 'grid', gridTemplateColumns: '1fr auto 34px', gap: 8, alignItems: 'baseline' }}>
                <span style={{ ...label, fontSize: 8.5 }}>{name}</span>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: INK }}>{v}</span>
                <span style={{ ...label, fontSize: 8, textAlign: 'right', color: place && place <= 5 ? BLUE : place && place >= 26 ? ORANGE : DIM }}>{place ? `${tiedOf(doc, t, l) ? 'T-' : ''}#${place}` : ''}</span>
              </span>
            )
          }
          const wins = t.v[doc.labels.indexOf('Wins')]
          const losses = t.v[doc.labels.indexOf('Losses')]
          return (
            <div style={{ position: 'absolute', left, top: far ? far[1] : Math.max(6, Math.min(h - 150, ty - 70)), width: CARD_W, pointerEvents: 'none', zIndex: 5, background: '#1f1d1c', border: '1px solid #837d76', borderTop: `2px solid ${ORANGE}`, boxShadow: '5px 5px 0 rgba(0,0,0,.55)', padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={asset(`logos/color/${t.team}.png`)} alt="" width={26} height={26} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: INK }}>{t.name}</span>
                  <span style={{ ...label, fontSize: 8 }}>{t.team}{doc.dated ? ` · ${t.span}` : ''}{wins !== null && losses !== null ? ` · ${wins}–${losses}` : ''}</span>
                </span>
              </span>
              <span style={{ height: 1, background: RULE }} />
              {(ratings ? ['ORTG', 'DRTG'] : [X, Y]).map(l => row(l, fmt(doc.stats[l], t.v[doc.labels.indexOf(l)]), l))}
              {doc.labels.includes('Net') && ![X, Y].includes('Net') && row('NET', fmt({ ...doc.stats.Net, relative: true }, t.v[doc.labels.indexOf('Net')]), 'Net')}
            </div>
          )
        })()}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', borderTop: `1px solid ${RULE}` }}>
        {ratings
          ? <>
            <div style={{ ...cell, borderLeft: 0 }}><span style={label}>League ORTG</span><span style={big}>{lgO.toFixed(1)}</span></div>
            <div style={cell}><span style={label}>League DRTG</span><span style={big}>{lgDRTG.toFixed(1)}</span></div>
            <div style={cell}><span style={label}>Best net</span><span style={{ ...big, display: 'flex', alignItems: 'center', gap: 6 }}><img src={asset(`logos/${best.team}.png`)} alt={best.name} width={18} height={18} />{net(best) > 0 ? '+' : '−'}{Math.abs(net(best)).toFixed(1)}</span></div>
            <div style={cell}><span style={label}>Net above 0</span><span style={{ ...big, color: BLUE }}>{teams.filter(x => net(x) > 0).length}<span style={{ ...label, fontSize: 9, marginLeft: 4 }}>/ {teams.length}</span></span></div>
          </>
          : <>
            <div style={{ ...cell, borderLeft: 0 }}><span style={cap}>League {X}</span><span style={big}>{fmt(sx, league)}</span></div>
            <div style={cell}><span style={cap}>League {Y}</span><span style={big}>{fmt(sy, lgD)}</span></div>
            <div style={cell}><span style={label}>Top right</span><span style={{ ...big, color: better ? BLUE : INK }}>{corner(1, 1)}<span style={{ ...label, fontSize: 9, marginLeft: 4 }}>/ {teams.length}</span></span></div>
            <div style={cell}><span style={label}>Bottom left</span><span style={{ ...big, color: better ? ORANGE : INK }}>{corner(-1, -1)}<span style={{ ...label, fontSize: 9, marginLeft: 4 }}>/ {teams.length}</span></span></div>
          </>}
      </div>
    </>
  )
}
