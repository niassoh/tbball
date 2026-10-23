import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPlayers, headshotUrl, loadTeams } from '../api.js'
import { MONO, col, fmt, heat, ord } from '../lib/format.js'
import { placeOf, tiedOf } from '../lib/teamboard.js'
import { asset } from '../lib/static.js'
import { initials } from '../lib/teams.js'
import { CountUp, Meter } from './PlayerCard.jsx'

// A team's card on the Team board, in the chart's place: every stat of the team sheet, each
// group drawn its own way. Its head: logo, name, record, win pace and net. Then a level
// meter of the team's percentile in every stat (hover a bar for it); its ratings as strips
// of the 30 teams with it marked, better always to the right; its play types as a mosaic,
// each as wide as its share of the offense and as tall as its points a play above or below
// the league's; its shots and its opponents' on two half courts; its tempo on three dials;
// its splits (home, away, against the top and bottom 10) on one net axis; what each
// possession starts after (a stop, a make, a set) as pads; and its starting five. Blue is
// better than the league, orange worse, grey a style. It comes in on opening, and again
// for another team: bars rise, markers slide in from the league's average, courts draw,
// dials turn and pads light in turn (index.css .tc-*).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const PAD = '#2c2a28'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const tiny = { fontFamily: MONO, fontSize: 8, letterSpacing: '.1em', fill: FAINT, textTransform: 'uppercase' }
const RELATIVE = /^Net|^r|^Adj r| Net$/
// A style stat's shade, in grey (TeamBoard's).
const plain = p => `rgba(201,195,188,${((Math.abs(p - 50) / 50) * 0.32).toFixed(2)})`
const RECORD = ['Wins', 'Losses']

// The team's numbers in a stat: value, percentile, league average, the 30's values, its
// place, and how to print and colour it.
const reader = (doc, t) => {
  const k = l => doc.labels.indexOf(l)
  const has = l => k(l) >= 0
  const v = l => (has(l) ? t.v[k(l)] : null)
  const p = l => (has(l) ? t.p[k(l)] : null)
  const stat = l => ({ ...doc.stats[l], relative: RELATIVE.test(l) })
  const all = l => (has(l) ? doc.teams.map(x => x.v[k(l)]).filter(x => x !== null) : [])
  const place = l => (v(l) === null ? '—' : `${tiedOf(doc, t, l) ? 'T-' : ''}${ord(placeOf(doc, t, l))}`)
  const tone = l => (p(l) === null ? FAINT : doc.stats[l].neutral ? INK : col(p(l)))
  const shade = l => (p(l) === null ? 'transparent' : doc.stats[l].neutral ? plain(p(l)) : heat(p(l)))
  const text = (l, n = v(l)) => fmt(stat(l), n)
  return { has, v, p, stat, all, place, tone, shade, text, lg: l => doc.league[l] ?? null }
}

function Section({ n, title, note, children }) {
  return (
    <section style={{ padding: '12px 16px 14px', borderTop: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...label, color: INK, fontWeight: 700 }}><span style={{ color: FAINT, marginRight: 8 }}>{String(n).padStart(2, '0')}</span>{title}</span>
        {note && <span style={{ ...label, marginLeft: 'auto', color: FAINT, textAlign: 'right' }}>{note}</span>}
      </div>
      {children}
    </section>
  )
}

// The head: logo, name and record; win pace and net, each with its place and a meter.
function Head({ t, x, season }) {
  const big = { fontFamily: 'Montserrat, sans-serif', fontWeight: 800, lineHeight: 0.9, color: INK, fontVariantNumeric: 'tabular-nums' }
  const Hero = ({ l, name, delay }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 104 }}>
      <span style={label}>{name}</span>
      <span style={{ ...big, fontSize: 30 }}><CountUp stat={x.stat(l)} value={x.v(l)} delay={delay} /></span>
      <Meter pc={x.p(l)} delay={delay} />
      <span style={{ ...label, fontSize: 8, color: FAINT }}>{x.place(l)} of 30</span>
    </div>
  )
  return (
    <div className="tc-head" style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) auto', alignItems: 'center', columnGap: 18, rowGap: 14, padding: '6px 16px 16px' }}>
      <img className="tc-logo" src={asset(`logos/color/${t.team}.png`)} alt="" width={92} height={92} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <span style={label}>{t.team} · {season.replace('-', '–')} · regular season</span>
        <span className="tc-wipe" style={{ ...big, fontSize: 30, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ ...big, fontSize: 22 }}><CountUp stat={{ dec: 0 }} value={x.v('Wins')} delay={150} />–<CountUp stat={{ dec: 0 }} value={x.v('Losses')} delay={150} /></span>
          <span style={label}>W–L</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 22 }}>
        <Hero l="LA Bayes Win-pace" name="Win pace" delay={200} />
        <Hero l="Net" name="Net rating" delay={320} />
      </div>
    </div>
  )
}

// Every stat's percentile as a level meter, grouped as the sheet groups them; the bar
// under the pointer reads out above.
function Levels({ doc, x }) {
  const [at, setAt] = useState(null)
  const groups = doc.groups.map(g => ({ ...g, stats: g.stats.filter(l => !RECORD.includes(l)) }))
  const n = groups.reduce((s, g) => s + g.stats.length, 0)
  const W = 720
  const H = 92
  const GAP = 10
  const bw = (W - GAP * (groups.length - 1)) / n
  let i = 0
  let x0 = 0
  const cols = groups.map(g => {
    const bars = g.stats.map((l, j) => ({ l, x: x0 + j * bw, i: i++ }))
    const c = { g, x0, x1: x0 + bars.length * bw, bars }
    x0 = c.x1 + GAP
    return c
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ height: 14, fontSize: 10.5, color: DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {at
          ? <><span style={{ color: INK, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{at}</span>{'  '}<span style={{ color: x.tone(at), fontWeight: 700 }}>{x.text(at)}</span>{'  ·  '}{x.place(at)} of 30{x.lg(at) !== null ? `  ·  league ${x.text(at, x.lg(at))}` : ''}{doc.stats[at].desc ? `  ·  ${doc.stats[at].desc}` : ''}</>
          : <span style={{ color: FAINT }}>Percentile in every stat, 0 to 100 · the line is the middle · hover a bar</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" style={{ display: 'block' }} onMouseLeave={() => setAt(null)}>
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke={EDGE} strokeDasharray="1 3" />
        {cols.map(c => (
          <g key={c.g.id}>
            {c.bars.map(b => {
              const p = x.p(b.l)
              const h = p === null ? 0 : Math.max(2, (p / 100) * H)
              const on = at === b.l
              return (
                <g key={b.l} onMouseEnter={() => setAt(b.l)}>
                  <rect x={b.x} y={0} width={bw} height={H} fill={on ? 'rgba(236,232,227,.06)' : 'transparent'} />
                  <rect className="tc-rise" x={b.x + 1} y={H - h} width={Math.max(1, bw - 2)} height={h} fill={doc.stats[b.l].neutral ? '#8d8780' : col(p ?? 50)}
                    opacity={at && !on ? 0.35 : 1} style={{ animationDelay: `${b.i * 14}ms`, transformOrigin: `0 ${H}px` }} />
                </g>
              )
            })}
            <line x1={c.x0} x2={c.x1} y1={H + 3} y2={H + 3} stroke={EDGE} />
            <text x={(c.x0 + c.x1) / 2} y={H + 13} textAnchor="middle" style={{ ...tiny, fontSize: 7 }}>{c.g.name}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// A stat as a strip: the 30 teams as ticks, the league's average dashed, the team's mark
// sliding out from it; better is always to the right.
function Strip({ x, l, name }) {
  if (!x.has(l)) return null
  const vs = x.all(l)
  const v = x.v(l)
  const lg = x.lg(l) ?? (RELATIVE.test(l) ? 0 : vs.reduce((a, b) => a + b, 0) / vs.length)
  const lo = Math.min(...vs, lg)
  const hi = Math.max(...vs, lg)
  const pad = (hi - lo) * 0.06 || 1
  const flip = x.stat(l).lowerBetter
  const pos = n => `${(((flip ? hi + pad - n : n - lo + pad) / (hi - lo + 2 * pad)) * 100).toFixed(2)}%`
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr) 58px 40px', alignItems: 'center', columnGap: 12, height: 26 }} title={x.stat(l).desc || undefined}>
      <span style={{ ...label, fontSize: 8.5, color: '#c9c3bc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || l}</span>
      <span style={{ position: 'relative', height: 22 }}>
        <span style={{ position: 'absolute', left: 0, right: 0, top: 11, height: 1, background: RULE }} />
        {vs.map((n, i) => <span key={i} style={{ position: 'absolute', left: pos(n), top: 6, width: 1, height: 11, background: '#57524d' }} />)}
        <span style={{ position: 'absolute', left: pos(lg), top: 1, height: 21, borderLeft: `1px dashed ${DIM}` }} />
        {v !== null && <span className="tc-slide" style={{ position: 'absolute', left: pos(v), top: 2, width: 5, height: 19, marginLeft: -2, background: x.tone(l), boxShadow: `0 0 0 1px #262422`, '--from': pos(lg) }} />}
      </span>
      <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>{x.text(l)}</span>
      <span style={{ ...label, fontSize: 8.5, textAlign: 'right' }}>{x.place(l)}</span>
    </div>
  )
}

// The play types as a mosaic across all of the offense: each half-court type as wide as its
// share, as tall as its points a play above (blue) or below (orange) the league's for it,
// the rest (transition and the like) hatched; the half court bracketed with its own.
const TYPES = [['Off-Ball', 'Off-ball'], ['PnR Game', 'Pick & roll'], ['Iso-Post', 'Iso & post']]
function Playtypes({ x }) {
  const W = 720
  const H = 176
  const top = 34
  const mid = top + (H - top - 22) / 2
  const half = (H - top - 22) / 2
  const REACH = 0.14
  const cols = []
  let at = 0
  for (const [k, name] of TYPES) {
    const share = x.v(`${k} Share`)
    if (share === null) continue
    cols.push({ k, name, share, x0: (at / 100) * W, w: (share / 100) * W })
    at += share
  }
  const rest = Math.max(0, 100 - at)
  const y = (ppp, lg) => mid - (Math.max(-REACH, Math.min(REACH, ppp - lg)) / REACH) * half
  const hc = 'Half-Court'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <pattern id="tc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={6} stroke="#3d3a37" strokeWidth={2} /></pattern>
      </defs>
      {at > 0 && (
        <g>
          <path d={`M1 ${top - 8} V${top - 14} H${(at / 100) * W - 1} V${top - 8}`} fill="none" stroke={DIM} />
          <text x={0} y={top - 20} style={{ ...tiny, fill: DIM }}>Half court · {x.text(`${hc} Share`)}% of plays · <tspan style={{ fill: x.tone(`${hc} PPP`), fontWeight: 700 }}>{x.text(`${hc} PPP`)}</tspan> a play · {x.place(`${hc} PPP`)}</text>
        </g>
      )}
      <line x1={0} x2={W} y1={mid} y2={mid} stroke={DIM} strokeDasharray="3 3" />
      <text x={W - 2} y={mid - 5} textAnchor="end" style={tiny}>league</text>
      {cols.map((c, i) => {
        const ppp = x.v(`${c.k} PPP`)
        const lg = x.lg(`${c.k} PPP`) ?? ppp
        const yy = ppp === null ? mid : y(ppp, lg)
        const better = ppp !== null && ppp >= lg
        return (
          <g key={c.k}>
            <rect x={c.x0 + 1} y={top} width={c.w - 2} height={H - top - 22} fill={PAD} />
            <rect className="tc-grow" x={c.x0 + 1} y={Math.min(yy, mid)} width={c.w - 2} height={Math.max(1.5, Math.abs(mid - yy))} fill={x.tone(`${c.k} PPP`)} fillOpacity={0.85}
              style={{ transformOrigin: `0 ${mid}px`, animationDelay: `${150 + i * 110}ms` }} />
            <text x={c.x0 + 8} y={top + 14} style={{ ...tiny, fill: INK, fontWeight: 700 }}>{c.name}</text>
            <text x={c.x0 + 8} y={better ? H - 30 : top + 28} style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, fill: INK }}>{x.text(`${c.k} PPP`)}</text>
            <text x={c.x0 + 8} y={better ? H - 30 : top + 28} dy={13} style={{ ...tiny, fill: DIM }}>a play · {x.place(`${c.k} PPP`)}</text>
            <text x={c.x0 + 8} y={H - 6} style={{ ...tiny, fill: DIM }}>{x.text(`${c.k} Share`)}% <tspan style={{ fill: FAINT }}>lg {x.lg(`${c.k} Share`) ?? '—'}</tspan></text>
          </g>
        )
      })}
      {rest > 0 && (
        <g>
          <rect x={(at / 100) * W + 1} y={top} width={(rest / 100) * W - 2} height={H - top - 22} fill="url(#tc-hatch)" />
          <text x={(at / 100) * W + 8} y={top + 14} style={tiny}>Transition</text>
          <text x={(at / 100) * W + 8} y={top + 26} style={tiny}>& the rest</text>
          <text x={(at / 100) * W + 8} y={H - 6} style={tiny}>{Math.round(rest)}%</text>
        </g>
      )}
    </svg>
  )
}

// A half court, basket up (5 units a foot, 50 by 32 feet shown): its zones shaded by the
// team's percentile in their stat and labelled with it; the lines draw in.
const FT = 5
const HOOP = { x: 25 * FT, y: 5.25 * FT }
const ARC_R = 23.75 * FT
const CORNER_Y = 14 * FT
function Court({ title, rim, three, corner, notes, x, delay }) {
  const W = 50 * FT
  const H = 32 * FT
  const arcX = 22 * FT
  const arc = `M${HOOP.x - arcX} 0 V${CORNER_Y} A${ARC_R} ${ARC_R} 0 0 0 ${HOOP.x + arcX} ${CORNER_Y} V0`
  const outside = `M0 0 H${HOOP.x - arcX} V${CORNER_Y} A${ARC_R} ${ARC_R} 0 0 0 ${HOOP.x + arcX} ${CORNER_Y} V0 H${W} V${H} H0 Z`
  const zone = (l, d, i) => l && x.has(l) && <path className="tc-fade" d={d} fill={x.shade(l)} style={{ animationDelay: `${delay + 350 + i * 120}ms` }} />
  const Num = ({ l, at, small }) => l && x.has(l) && (
    <g className="tc-fade" style={{ animationDelay: `${delay + 600}ms` }}>
      <text x={at[0]} y={at[1]} textAnchor="middle" style={{ fontFamily: MONO, fontSize: small ? 11 : 15, fontWeight: 700, fill: INK, paintOrder: 'stroke', stroke: '#262422', strokeWidth: 3 }}>{x.text(l)}{/Share|share|3p|FG/.test(l) ? '%' : ''}</text>
      <text x={at[0]} y={at[1] + 10} textAnchor="middle" style={{ ...tiny, fontSize: 6.5, fill: DIM, paintOrder: 'stroke', stroke: '#262422', strokeWidth: 3 }}>{x.place(l)}</text>
    </g>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ ...label, color: '#c9c3bc' }}>{title}</span>
      <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} width="100%" style={{ display: 'block' }}>
        <rect x={0} y={0} width={W} height={H} fill={PAD} />
        {zone(three.l, outside, 0)}
        {corner && zone(corner.l, `M0 0 H${HOOP.x - arcX} V${CORNER_Y} H0 Z M${HOOP.x + arcX} 0 H${W} V${CORNER_Y} H${HOOP.x + arcX} Z`, 1)}
        {zone(rim.l, `M${HOOP.x - 6 * FT} 0 V${HOOP.y} A${6 * FT} ${6 * FT} 0 0 0 ${HOOP.x + 6 * FT} ${HOOP.y} V0 Z`, 2)}
        <g fill="none" stroke="#6d6761" strokeWidth={1} style={{ '--delay': `${delay}ms` }}>
          <path className="tc-draw" pathLength={1} d={`M0 0 H${W} V${H} H0 Z`} />
          <path className="tc-draw" pathLength={1} d={arc} />
          <path className="tc-draw" pathLength={1} d={`M${HOOP.x - 8 * FT} 0 V${19 * FT} H${HOOP.x + 8 * FT} V0`} />
          <path className="tc-draw" pathLength={1} d={`M${HOOP.x - 6 * FT} ${19 * FT} A${6 * FT} ${6 * FT} 0 0 0 ${HOOP.x + 6 * FT} ${19 * FT}`} />
          <path className="tc-draw" pathLength={1} d={`M${HOOP.x - 4 * FT} ${HOOP.y} A${4 * FT} ${4 * FT} 0 0 0 ${HOOP.x + 4 * FT} ${HOOP.y}`} />
          <line x1={HOOP.x - 3 * FT} x2={HOOP.x + 3 * FT} y1={4 * FT} y2={4 * FT} stroke={INK} />
          <circle cx={HOOP.x} cy={HOOP.y} r={0.75 * FT} stroke={INK} />
        </g>
        <Num l={three.l} at={[HOOP.x, 29 * FT]} />
        {corner && <Num l={corner.l} at={[1.5 * FT, 8 * FT]} small />}
        <Num l={rim.l} at={[HOOP.x, HOOP.y + 9.5 * FT]} small />
        <text x={HOOP.x} y={26 * FT} textAnchor="middle" style={{ ...tiny, fontSize: 6.5 }}>{three.name}</text>
        <text x={HOOP.x + 8.5 * FT} y={HOOP.y + 3 * FT} style={{ ...tiny, fontSize: 6.5 }}>{rim.name}</text>
        {corner && <text x={0.6 * FT} y={3 * FT} style={{ ...tiny, fontSize: 6, fill: DIM }}>corner</text>}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {notes.filter(n => x.has(n.l)).map(n => (
          <span key={n.l} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10.5 }} title={x.stat(n.l).desc || undefined}>
            <span style={{ ...label, fontSize: 8.5 }}>{n.name}</span>
            <span><span style={{ color: x.tone(n.l), fontWeight: 700 }}>{x.text(n.l)}{n.pct ? '%' : ''}</span><span style={{ color: FAINT }}> · {x.place(n.l)}</span></span>
          </span>
        ))}
      </div>
    </div>
  )
}

// A stat as a dial: its range across the 30 on a 270° track, faster always clockwise, the
// teams as ticks round it, the league's longer; the pointer turns out to the team's value.
function Dial({ x, l, name, unit, faster }) {
  if (!x.has(l)) return null
  const vs = x.all(l)
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const frac = n => (hi === lo ? 0.5 : Math.max(0, Math.min(1, (faster === 'low' ? hi - n : n - lo) / (hi - lo))))
  const ang = n => -135 + frac(n) * 270
  const C = 60
  const R = 42
  const pt = (a, r) => [C + r * Math.sin((a * Math.PI) / 180), C - r * Math.cos((a * Math.PI) / 180)]
  const v = x.v(l)
  const a = v === null ? -135 : ang(v)
  const [sx, sy] = pt(-135, R)
  const [ex, ey] = pt(a, R)
  const lg = x.lg(l)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }} title={x.stat(l).desc || undefined}>
      <svg viewBox="0 0 120 112" width="100%" style={{ display: 'block', maxWidth: 170 }}>
        <path d={`M${sx} ${sy} A${R} ${R} 0 1 1 ${pt(135, R)[0]} ${pt(135, R)[1]}`} fill="none" stroke={RULE} strokeWidth={3} />
        {v !== null && <path className="tc-draw" pathLength={1} d={`M${sx} ${sy} A${R} ${R} 0 ${a + 135 > 180 ? 1 : 0} 1 ${ex} ${ey}`} fill="none" stroke={x.tone(l)} strokeWidth={3} style={{ '--delay': '150ms' }} />}
        {vs.map((n, i) => { const [x1, y1] = pt(ang(n), R + 5); const [x2, y2] = pt(ang(n), R + 9); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#57524d" /> })}
        {lg !== null && (() => { const [x1, y1] = pt(ang(lg), R + 4); const [x2, y2] = pt(ang(lg), R + 13); return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={DIM} strokeWidth={1.5} /> })()}
        <circle cx={C} cy={C} r={29} fill="#2f2c2a" stroke={EDGE} />
        <g className="tc-turn" style={{ transform: `rotate(${a}deg)`, transformOrigin: `${C}px ${C}px`, '--from': '-135deg' }}>
          <line x1={C} y1={C - 14} x2={C} y2={C - 27} stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="square" />
        </g>
        <text x={C} y={C + 4} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, fill: INK }}>{x.text(l)}</text>
        <text x={C} y={C + 14} textAnchor="middle" style={{ ...tiny, fontSize: 6 }}>{unit}</text>
        <text x={pt(-135, R)[0] - 2} y={110} textAnchor="middle" style={{ ...tiny, fontSize: 6.5 }}>slow</text>
        <text x={pt(135, R)[0] + 2} y={110} textAnchor="middle" style={{ ...tiny, fontSize: 6.5 }}>fast</text>
      </svg>
      <span style={{ ...label, fontSize: 8.5, color: '#c9c3bc' }}>{name}</span>
      <span style={{ ...label, fontSize: 8, color: FAINT }}>{x.place(l)} · lg {lg === null ? '—' : x.text(l, lg)}</span>
    </div>
  )
}

// The splits on one net axis: home and away, against the top 10 and the bottom 10, each a
// dot (the league's average a tick) with its ratings beside; each pair joined, so the
// swing between them shows. The dots slide out from zero.
const SPLITS = [['Home', 'Home Net', 'Home ORTG', 'Home DRTG'], ['Away', 'Away Net', 'Away ORTG', 'Away DRTG'], ['v Top 10', 'Net v Top10', 'ORTG v Top10', 'DRTG v Top10'], ['v Bottom 10', 'Net v Bot10', 'ORTG v Bot10', 'DRTG v Bot10']]
function Splits({ x }) {
  const rows = SPLITS.filter(s => x.v(s[1]) !== null)
  const W = 720
  const L = 92
  const R = 150
  const RH = 30
  const H = rows.length * RH + 18
  const vals = rows.flatMap(s => [...x.all(s[1]), x.lg(s[1]) ?? 0])
  const reach = Math.max(5, ...vals.map(Math.abs)) * 1.05
  const px = n => L + ((n + reach) / (2 * reach)) * (W - L - R)
  const y = i => 8 + i * RH + RH / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <line x1={px(0)} x2={px(0)} y1={4} y2={H - 14} stroke={EDGE} />
      {[-reach, 0, reach].map((n, i) => <text key={i} x={px(Math.trunc(n))} y={H - 3} textAnchor={['start', 'middle', 'end'][i]} style={tiny}>{i === 1 ? 'net 0' : `${n > 0 ? '+' : '−'}${Math.abs(Math.trunc(n))}`}</text>)}
      <text x={W - R + 16} y={H - 3} style={tiny}>ortg / drtg</text>
      {[['Home', 'Away'], ['v Top 10', 'v Bottom 10']].map(pair => pair.map(n => rows.findIndex(r => r[0] === n))).filter(([a, b]) => a >= 0 && b >= 0).map(([a, b]) => (
        <line key={a} className="tc-fade" x1={px(x.v(rows[a][1]))} y1={y(a)} x2={px(x.v(rows[b][1]))} y2={y(b)} stroke="#6d6761" strokeWidth={1.5} style={{ animationDelay: '600ms' }} />
      ))}
      {rows.map(([name, net, o, d], i) => {
        const v = x.v(net)
        const lg = x.lg(net)
        return (
          <g key={name}>
            <text x={0} y={y(i) + 3} style={{ ...tiny, fill: '#c9c3bc' }}>{name}</text>
            <line x1={L} x2={W - R} y1={y(i)} y2={y(i)} stroke={RULE} />
            {lg !== null && <line x1={px(lg)} x2={px(lg)} y1={y(i) - 7} y2={y(i) + 7} stroke={DIM} strokeDasharray="2 2" />}
            {v !== null && (
              <g className="tc-slidex" style={{ '--dx': `${px(0) - px(v)}px`, animationDelay: `${120 + i * 90}ms` }}>
                <circle cx={px(v)} cy={y(i)} r={6} fill={x.tone(net)} stroke="#262422" strokeWidth={2} />
                <text x={px(v)} y={y(i) - 10} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, fill: INK }}>{x.text(net)}</text>
              </g>
            )}
            <text x={W - R + 16} y={y(i) + 4} style={{ fontFamily: MONO, fontSize: 11, fill: DIM }}>
              <tspan fill={x.tone(o)}>{x.text(o)}</tspan> / <tspan fill={x.tone(d)}>{x.text(d)}</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// What a possession starts after, as two rows of pads (the team's offense, then its
// defense): each the rating after a stop, a make or a set, lit by its percentile, with the
// share of possessions that start that way along its foot. They light in turn, a step
// sequencer's run.
const AFTER = [['STOP', 'after a stop', 'steal or defensive rebound'], ['MAKE', 'after a make', 'the other side scored'], ['SET', 'after a set', 'a dead ball']]
function Pads({ x }) {
  const row = (side, k) => AFTER.map(([w], j) => {
    const rating = `${side === 'Off' ? 'ORTG' : 'DRTG'} after ${w}`
    const share = `${side} after ${w}`
    const named = x.has(share) ? x.v(share) : null
    // The sheet has no defense's share after a set: it's what the other two leave.
    const derived = named === null && side === 'Def' && x.v('Def after STOP') !== null && x.v('Def after MAKE') !== null ? 100 - x.v('Def after STOP') - x.v('Def after MAKE') : null
    return { w, j, k, rating, share: named ?? derived, derived: derived !== null, sharePlace: named === null ? null : x.place(share) }
  })
  const rows = [['Offense', row('Off', 0)], ['Defense', row('Def', 1)]]
  return (
    <div className="tc-pads" style={{ display: 'grid', gridTemplateColumns: '64px repeat(3, minmax(0, 1fr))', gap: 6 }}>
      <span className="tc-blank" />
      {AFTER.map(([w, words, gloss]) => <span key={w} style={{ ...label, fontSize: 8.5 }} title={gloss}>{words}</span>)}
      {rows.map(([name, pads]) => [
        <span key={name} className="tc-rowname" style={{ ...label, fontSize: 8.5, color: '#c9c3bc', alignSelf: 'center' }}>{name}</span>,
        ...pads.map(p => (
          <div key={p.rating} className="tc-pad" style={{ '--d': `${200 + (p.k * 3 + p.j) * 110}ms`, position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 10px 12px', background: PAD, border: `1px solid ${EDGE}`, minWidth: 0 }} title={x.stat(p.rating)?.desc || undefined}>
            <span aria-hidden="true" style={{ position: 'absolute', top: 7, right: 8, width: 6, height: 6, background: x.tone(p.rating) }} />
            <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>{x.text(p.rating)}</span>
            <span style={{ ...label, fontSize: 8 }}>{p.k ? 'drtg' : 'ortg'} · {x.place(p.rating)} · lg {x.lg(p.rating) === null ? '—' : x.text(p.rating, x.lg(p.rating))}</span>
            <span style={{ ...label, fontSize: 8, color: FAINT }}>{p.share === null ? '—' : `${p.derived ? '≈' : ''}${Math.round(p.share)}% of poss`}{p.sharePlace ? ` · ${p.sharePlace}` : ''}</span>
            <span aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${p.share === null ? 0 : Math.min(100, p.share * 2)}%`, background: '#8d8780' }} />
          </div>
        ))
      ])}
    </div>
  )
}

// The depth chart's first name at each position, with faces.
function Five({ team }) {
  const [five, setFive] = useState(null)
  useEffect(() => {
    let live = true
    Promise.all([loadTeams(), fetchPlayers()]).then(([teams, players]) => {
      const t = (teams || []).find(x => x.team === team)
      const by = new Map((players || []).map(p => [p.slug, p]))
      if (live) setFive(t && t.depth ? t.depth.rows.map(r => ({ pos: r.pos, ...r.players[0], index: by.get(r.players[0].slug) })) : [])
    }, () => live && setFive([]))
    return () => { live = false }
  }, [team])
  if (!five || !five.length) return <span style={{ ...label, color: FAINT, height: 64 }}>{five ? 'No depth chart' : ''}</span>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${five.length}, minmax(0, 1fr))`, gap: 10 }}>
      {five.map((p, i) => {
        const face = (
          <span className="tc-fade" style={{ animationDelay: `${i * 70}ms`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
            <span style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${EDGE}`, background: 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: DIM, fontSize: 11 }}>
              {p.index && p.index.headshot ? <img src={headshotUrl(p.slug, 100, p.index.headshotVersion, p.index.headshot)} alt="" width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(p.name)}
            </span>
            <span style={{ ...label, fontSize: 8, color: FAINT }}>{p.pos}</span>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: INK, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ').slice(1).join(' ') || p.name}</span>
          </span>
        )
        return p.hasProfile ? <Link key={p.slug} to={`/player/${p.slug}`} style={{ minWidth: 0 }}>{face}</Link> : <span key={p.slug || i} style={{ minWidth: 0 }}>{face}</span>
      })}
    </div>
  )
}

export default function TeamCard({ doc, team: t, season, onClose }) {
  useEffect(() => {
    const escape = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])
  const x = reader(doc, t)
  return (
    <div className="pc-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
        <span aria-hidden="true" style={{ width: 7, height: 7, background: 'var(--accent)' }} />
        <span style={{ ...label, color: INK }}>Team card</span>
        <button type="button" aria-label="Close the card" onClick={onClose} style={{ marginLeft: 'auto', width: 26, height: 26, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
      <Head t={t} x={x} season={season} />
      <Section n={1} title="Every stat" note="percentile among the 30"><Levels doc={doc} x={x} /></Section>
      <Section n={2} title="Ratings" note="the 30 as ticks · dashed: league · better →">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[['ORTG', 'Offense'], ['DRTG', 'Defense'], ['Net', 'Net'], ['Adj rORTG', 'Adj offense'], ['Adj rDRTG', 'Adj defense'], ['ORTG v Top Def', 'O v top-8 D'], ['DRTG vs Top Off', 'D v top-8 O']].map(([l, n]) => <Strip key={l} x={x} l={l} name={n} />)}
        </div>
      </Section>
      <Section n={3} title="Play types" note="width: share of plays · height: points a play v league"><Playtypes x={x} /></Section>
      <Section n={4} title="Shots" note="zones shaded by percentile">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          <Court title="Its shots" x={x} delay={0} rim={{ l: 'Rim/FTA Share', name: 'rim + ft share' }} three={{ l: '3p', name: '3p%' }}
            notes={[{ l: 'LayupAst', name: 'Assists for layups', pct: true }, { l: 'ORTG v Top Def', name: 'v top-8 defenses' }]} />
          <Court title="What it allows" x={x} delay={200} rim={{ l: 'Opp Rim Share', name: 'opp rim share' }} three={{ l: 'Opp 3p', name: 'opp 3p%' }} corner={{ l: 'Opp Corner3 share' }}
            notes={[{ l: 'Opp Rim FG', name: 'Opp FG at the rim', pct: true }, { l: 'Opp Wide Open 3s/g', name: 'Opp wide-open 3s a game' }]} />
        </div>
      </Section>
      <Section n={5} title="Tempo" note="the 30 as ticks · long tick: league">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <Dial x={x} l="OPace" name="Its offense" unit="sec a poss" faster="low" />
          <Dial x={x} l="Pace" name="Pace" unit="poss / 48" faster="high" />
          <Dial x={x} l="DPace" name="Opp offense" unit="sec a poss" faster="low" />
        </div>
      </Section>
      <Section n={6} title="Splits" note="net rating · dashed: league"><Splits x={x} /></Section>
      <Section n={7} title="Starts" note="each possession by what it starts after"><Pads x={x} /></Section>
      <Section n={8} title="Starting five" note="depth chart"><Five team={t.team} /></Section>
    </div>
  )
}
