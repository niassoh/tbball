import { useEffect, useState } from 'react'
import { fetchPlayers, headshotUrl, loadLineupLeague } from '../api.js'
import { MONO, col, fmt, heat, ord } from '../lib/format.js'
import { placeOf, tiedOf } from '../lib/teamboard.js'
import { asset } from '../lib/static.js'
import { initials } from '../lib/teams.js'
import { CountUp, Meter } from './PlayerCard.jsx'

// A team's card on the Team board, in the chart's place, sized to fit a laptop's screen.
// Its head: logo, name, record, win pace and net. Then its best two- to five-man units
// that season (as the players' cards show theirs); its ratings as strips of the 30 teams
// with it marked, better always to the right; its splits (home and away, against the
// bottom and top 10) as net-rating bars; its play types as a mosaic, each as wide as its
// share of the offense and as tall as its points a play above or below the league's; its
// shots and its opponents' as numbers with meters. Blue is better than the league,
// orange worse, grey a style. It comes in on opening, and again for another team: the
// numbers count up, marks slide out from the league's average and bars grow (index.css .tc-*).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const PAD = '#2c2a28'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const tiny = { fontFamily: MONO, fontSize: 7.5, letterSpacing: '.1em', fill: FAINT, textTransform: 'uppercase' }
const RELATIVE = /^Net|^r|^Adj r| Net$/
// A style stat's shade, in grey (TeamBoard's).
const plain = p => `rgba(201,195,188,${((Math.abs(p - 50) / 50) * 0.32).toFixed(2)})`
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'

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
  const shade = l => (p(l) === null ? PAD : doc.stats[l].neutral ? plain(p(l)) : heat(p(l)))
  const text = (l, n = v(l)) => fmt(stat(l), n)
  return { has, v, p, stat, all, place, tone, shade, text, lg: l => doc.league[l] ?? null }
}

function Section({ title, note, children, style }) {
  return (
    <section style={{ padding: '9px 16px 11px', borderTop: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...label, color: INK, fontWeight: 700 }}>{title}</span>
        {note && <span style={{ ...label, fontSize: 8, marginLeft: 'auto', color: FAINT, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note}</span>}
      </div>
      {children}
    </section>
  )
}

// The head: logo, name and record; win pace and net, each with its place and a meter.
function Head({ t, x, season, closeButton }) {
  const big = { fontFamily: 'Montserrat, sans-serif', fontWeight: 800, lineHeight: 0.9, color: INK, fontVariantNumeric: 'tabular-nums' }
  const Hero = ({ l, name, delay }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 96 }}>
      <span style={label}>{name}</span>
      <span style={{ ...big, fontSize: 26 }}><CountUp stat={x.stat(l)} value={x.v(l)} delay={delay} /></span>
      <Meter pc={x.p(l)} delay={delay} />
      <span style={{ ...label, fontSize: 8, color: FAINT }}>{x.place(l)} of 30</span>
    </div>
  )
  return (
    <div className="tc-head" style={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr) auto auto', alignItems: 'center', columnGap: 18, rowGap: 12, padding: '12px 16px' }}>
      <img className="tc-logo" src={asset(`logos/color/${t.team}.png`)} alt="" width={64} height={64} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
        <span style={label}>{t.team} · {season.replace('-', '–')} · regular season</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
          <span className="tc-wipe" style={{ ...big, fontSize: 28, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
          <span style={{ ...big, fontSize: 18, flex: 'none' }}><CountUp stat={{ dec: 0 }} value={x.v('Wins')} delay={150} />–<CountUp stat={{ dec: 0 }} value={x.v('Losses')} delay={150} /></span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <Hero l="LA Bayes Win-pace" name="Win pace" delay={200} />
        <Hero l="Net" name="Net rating" delay={320} />
      </div>
      {closeButton}
    </div>
  )
}

// Its best unit of each size that season by net rating, from the league's qualified units
// (lineups-league-<season>.json): faces, surnames, net, minutes and rank among the league's
// units of that size. Faces come from the players index, matched by name.
function Units({ team, season }) {
  const [units, setUnits] = useState(null)
  useEffect(() => {
    let live = true
    Promise.all([loadLineupLeague(false, season), fetchPlayers()]).then(([lg, players]) => {
      const byName = new Map((players || []).map(p => [p.name, p]))
      const best = [2, 3, 4, 5].map(n => {
        const mine = ((lg && lg.pool[n]) || []).filter(u => u[3] === team).sort((a, b) => b[1] - a[1])
        if (!mine.length) return { n, floor: lg && lg.floors[n] }
        const [minutes, net, ids] = mine[0]
        const nets = lg.nets[n] || []
        return { n, minutes, net, rank: nets.filter(v => v > net).length + 1, of: nets.length, mates: ids.map(id => { const name = lg.people[id] || '?'; return { name, p: byName.get(name) } }) }
      })
      if (live) setUnits(best)
    }, () => live && setUnits([]))
    return () => { live = false }
  }, [team, season])
  if (!units) return <div style={{ height: 58 }} />
  if (!units.length) return <span style={{ ...label, color: FAINT, height: 58 }}>No lineups yet</span>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
      {units.map((u, i) => (
        <div key={u.n} className="tc-fade" style={{ animationDelay: `${120 + i * 80}ms`, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          <span style={{ ...label, fontSize: 8 }}>{u.n}-man</span>
          {u.mates
            ? (
              <>
                <span style={{ display: 'flex' }}>
                  {u.mates.map((m, j) => (
                    <span key={m.name} style={{ width: 26, height: 26, marginLeft: j ? -8 : 0, borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: `1px solid ${EDGE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: DIM, flex: 'none' }}>
                      {m.p && m.p.headshot ? <img src={headshotUrl(m.p.slug, 100, m.p.headshotVersion, m.p.headshot)} alt="" width={26} height={26} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(m.name)}
                    </span>
                  ))}
                </span>
                <span style={{ fontSize: 9.5, lineHeight: '12px', height: 24, color: INK, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={u.mates.map(m => m.name).join(', ')}>{u.mates.map(m => m.name.split(' ').slice(1).join(' ') || m.name).join(' · ')}</span>
                <span style={{ fontSize: 10, color: DIM, whiteSpace: 'nowrap' }}>
                  <span style={{ color: u.net >= 0 ? '#8fb0e6' : '#fa962a', fontWeight: 700 }}>{u.net >= 0 ? '+' : '−'}{Math.abs(u.net).toFixed(1)}</span> · {u.minutes.toLocaleString()} min<br /><span style={{ color: FAINT }}>#{u.rank} of {u.of} {u.n}-man units</span>
                </span>
              </>
              )
            : <span style={{ ...label, fontSize: 8, color: FAINT }}>none at {u.floor || '—'}+ min yet</span>}
        </div>
      ))}
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
    <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr) 46px 34px', alignItems: 'center', columnGap: 10, height: 22 }} title={x.stat(l).desc || undefined}>
      <span style={{ ...label, fontSize: 8.5, color: '#c9c3bc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || l}</span>
      <span style={{ position: 'relative', height: 20 }}>
        <span style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 1, background: RULE }} />
        {vs.map((n, i) => <span key={i} style={{ position: 'absolute', left: pos(n), top: 5, width: 1, height: 11, background: '#57524d' }} />)}
        <span style={{ position: 'absolute', left: pos(lg), top: 1, height: 19, borderLeft: `1px dashed ${DIM}` }} />
        {v !== null && <span className="tc-slide" style={{ position: 'absolute', left: pos(v), top: 2, width: 5, height: 17, marginLeft: -2, background: x.tone(l), boxShadow: '0 0 0 1px #262422', '--from': pos(lg) }} />}
      </span>
      <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>{x.text(l)}</span>
      <span style={{ ...label, fontSize: 8, textAlign: 'right' }}>{x.place(l)}</span>
    </div>
  )
}

// The splits as net-rating bars from zero, on one axis: home and away, then against the
// bottom 10 and the top 10; the league's average for each a dashed tick, each bar's ORTG
// and DRTG beside it. The bars grow out from zero.
const SPLITS = [
  ['Venue', [['Home', 'Home Net', 'Home ORTG', 'Home DRTG'], ['Away', 'Away Net', 'Away ORTG', 'Away DRTG']]],
  ['Opponent', [['v Bottom 10', 'Net v Bot10', 'ORTG v Bot10', 'DRTG v Bot10'], ['v Top 10', 'Net v Top10', 'ORTG v Top10', 'DRTG v Top10']]]
]
function Splits({ x }) {
  const W = 300
  const L = 58
  const R = 124
  const BAR = 14
  const vals = SPLITS.flatMap(([, rows]) => rows.flatMap(r => [...x.all(r[1]), x.lg(r[1]) ?? 0]))
  const reach = Math.max(5, ...vals.map(Math.abs))
  const px = n => L + ((n + reach) / (2 * reach)) * (W - L - R)
  let y = 4
  const out = []
  SPLITS.forEach(([, rows], g) => {
    if (g) y += 12
    rows.forEach(([name, net, o, d], i) => {
      const v = x.v(net)
      const lg = x.lg(net)
      const cy = y + BAR / 2
      out.push(
        <g key={name}>
          <text x={0} y={cy + 3} style={{ ...tiny, fill: '#c9c3bc' }}>{name}</text>
          {v !== null
            ? (
              <>
                <rect className="tc-grow-x" x={Math.min(px(0), px(v))} y={y} width={Math.max(1.5, Math.abs(px(v) - px(0)))} height={BAR} fill={x.tone(net)}
                  style={{ transformOrigin: `${px(0)}px 0`, animationDelay: `${150 + (g * 2 + i) * 90}ms` }} />
                <text x={W - R + 40} y={cy + 3.5} textAnchor="end" style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, fill: INK }}>{x.text(net)}</text>
              </>
              )
            : <text x={W - R + 40} y={cy + 3} textAnchor="end" style={tiny}>—</text>}
          {lg !== null && <line x1={px(lg)} x2={px(lg)} y1={y - 2} y2={y + BAR + 2} stroke={INK} strokeOpacity={0.6} strokeDasharray="2 2" />}
          <text x={W} y={cy + 3.5} textAnchor="end" style={{ fontFamily: MONO, fontSize: 9, fill: DIM }}>
            <tspan fill={x.tone(o)}>{x.text(o)}</tspan> / <tspan fill={x.tone(d)}>{x.text(d)}</tspan>
          </text>
        </g>
      )
      y += BAR + 7
    })
  })
  const H = y + 12
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <line x1={px(0)} x2={px(0)} y1={0} y2={H - 11} stroke={EDGE} />
      <text x={px(0)} y={H - 2} textAnchor="middle" style={tiny}>net 0</text>
      <text x={L} y={H - 2} style={tiny}>−{Math.round(reach)}</text>
      <text x={W - R} y={H - 2} textAnchor="end" style={tiny}>+{Math.round(reach)}</text>
      <text x={W - R + 40} y={H - 2} textAnchor="end" style={tiny}>net</text>
      <text x={W} y={H - 2} textAnchor="end" style={tiny}>o / d</text>
      {out}
    </svg>
  )
}

// The play types as a mosaic across all of the offense: each half-court type as wide as its
// share, as tall as its points a play above (blue) or below (orange) the league's for it,
// the rest (transition and the like) hatched; the half court bracketed with its own.
const TYPES = [['Off-Ball', 'Off-ball'], ['PnR Game', 'Pick & roll'], ['Iso-Post', 'Iso & post']]
function Playtypes({ x }) {
  const W = 300
  const H = 150
  const top = 22
  const foot = 14
  const mid = top + (H - top - foot) / 2
  const half = (H - top - foot) / 2
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
          <path d={`M1 ${top - 3} V${top - 7} H${(at / 100) * W - 1} V${top - 3}`} fill="none" stroke={DIM} />
          <text x={0} y={top - 11} style={{ ...tiny, fontSize: 7, fill: DIM }}>Half court {x.text(`${hc} Share`)}% · <tspan style={{ fill: x.tone(`${hc} PPP`), fontWeight: 700 }}>{x.text(`${hc} PPP`)}</tspan> a play · {x.place(`${hc} PPP`)}</text>
        </g>
      )}
      {cols.map((c, i) => {
        const ppp = x.v(`${c.k} PPP`)
        const lg = x.lg(`${c.k} PPP`) ?? ppp
        const yy = ppp === null ? mid : y(ppp, lg)
        const better = ppp !== null && ppp >= lg
        return (
          <g key={c.k}>
            <rect x={c.x0 + 1} y={top} width={c.w - 2} height={H - top - foot} fill={PAD} />
            <rect className="tc-grow" x={c.x0 + 1} y={Math.min(yy, mid)} width={c.w - 2} height={Math.max(1.5, Math.abs(mid - yy))} fill={x.tone(`${c.k} PPP`)} fillOpacity={0.85}
              style={{ transformOrigin: `0 ${mid}px`, animationDelay: `${150 + i * 110}ms` }} />
            <text x={c.x0 + 6} y={top + 11} style={{ ...tiny, fontSize: 7.5, fill: INK, fontWeight: 700 }}>{c.name}</text>
            <text x={c.x0 + 6} y={better ? H - foot - 16 : top + 25} style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, fill: INK }}>{x.text(`${c.k} PPP`)}</text>
            <text x={c.x0 + 6} y={better ? H - foot - 6 : top + 35} style={{ ...tiny, fontSize: 7, fill: DIM }}>{x.place(`${c.k} PPP`)}</text>
            <text x={c.x0 + 6} y={H - 3} style={{ ...tiny, fontSize: 7, fill: DIM }}>{x.text(`${c.k} Share`)}% <tspan style={{ fill: FAINT }}>lg {x.lg(`${c.k} Share`) ?? '—'}</tspan></text>
          </g>
        )
      })}
      {rest > 0 && (
        <g>
          <rect x={(at / 100) * W + 1} y={top} width={(rest / 100) * W - 2} height={H - top - foot} fill="url(#tc-hatch)" />
          {(rest / 100) * W >= 36 && <text x={(at / 100) * W + 5} y={top + 11} style={{ ...tiny, fontSize: 7 }}>Trans.</text>}
          <text x={W} y={H - 3} textAnchor="end" style={{ ...tiny, fontSize: 7 }}>{Math.round(rest)}%</text>
        </g>
      )}
      <line x1={0} x2={W} y1={mid} y2={mid} stroke={DIM} strokeDasharray="3 3" />
    </svg>
  )
}

// Its shots and its opponents', as numbers: each with its place and its percentile on a
// ten-step meter, the team's on the left and what it allows on the right.
const SHOTS = [
  [['3p', '3P%', '%'], ['Rim/FTA Share', 'Rim + FT', '%'], ['LayupAst', 'Layup ast', '%']],
  [['Opp 3p', '3P%', '%'], ['Opp Corner3 share', 'Corner 3s', '%'], ['Opp Wide Open 3s/g', 'Open 3s / g', ''], ['Opp Rim Share', 'Rim share', '%'], ['Opp Rim FG', 'Rim FG%', '%']]
]
function Shots({ x }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 18 }}>
      {SHOTS.map((side, s) => (
        <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
          <span style={{ ...label, fontSize: 8, color: FAINT }}>{s ? 'Defense' : 'Offense'}</span>
          {side.filter(([l]) => x.has(l)).map(([l, name, unit], i) => (
            <div key={l} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: 8, rowGap: 3, alignItems: 'baseline' }} title={x.stat(l).desc || undefined}>
              <span style={{ ...label, fontSize: 8, color: '#c9c3bc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>{x.text(l)}{x.v(l) === null ? '' : unit}<span style={{ ...label, fontSize: 8, fontWeight: 400, marginLeft: 6 }}>{x.place(l)}</span></span>
              <span style={{ gridColumn: '1 / -1' }}><Meter pc={x.p(l)} delay={200 + (s * 3 + i) * 60} /></span>
            </div>
          ))}
        </div>
      ))}
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
  const close = <button type="button" aria-label="Close the card" onClick={onClose} style={{ alignSelf: 'start', width: 26, height: 26, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
  const pair = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }
  return (
    <div className="pc-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <Head t={t} x={x} season={season} closeButton={close} />
      <Section title="Best units" note="best net of each size · rank in league"><Units team={t.team} season={season} /></Section>
      <div style={pair}>
        <Section title="Ratings" note="dashed: league · better →">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[['ORTG', 'Offense'], ['DRTG', 'Defense'], ['Net', 'Net'], ['Adj rORTG', 'Adj off'], ['Adj rDRTG', 'Adj def']].map(([l, n]) => <Strip key={l} x={x} l={l} name={n} />)}
          </div>
        </Section>
        <Section title="Splits" note="net rating · dashed: league" style={{ borderLeft: `1px solid ${RULE}` }}><Splits x={x} /></Section>
      </div>
      <div style={pair}>
        <Section title="Play types" note="width: share · height: v league"><Playtypes x={x} /></Section>
        <Section title="Shots" note="meters: percentile" style={{ borderLeft: `1px solid ${RULE}` }}><Shots x={x} /></Section>
      </div>
    </div>
  )
}
