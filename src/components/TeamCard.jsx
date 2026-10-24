import { useEffect, useState } from 'react'
import { fetchPlayers, fetchTeamUnits, headshotUrl } from '../api.js'
import { MONO, col, fmt, ord } from '../lib/format.js'
import { placeOf, tiedOf } from '../lib/teamboard.js'
import { asset } from '../lib/static.js'
import { initials } from '../lib/teams.js'
import { CountUp, Meter } from './PlayerCard.jsx'

// A team's card on the Team board, in the chart's place, sized to fit a laptop's screen.
// Its head: logo, name, record, win pace and net. Then one of its units that season (five-
// man unless picked), most used or best by net (as the players' cards show theirs); its
// ratings, the season's and its splits', as a table of percentile sliders; its play types as a mosaic, each as wide as its
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
  const text = (l, n = v(l)) => fmt(stat(l), n)
  return { has, v, p, stat, all, place, tone, text, lg: l => doc.league[l] ?? null }
}

function Section({ title, note, right, children, style }) {
  return (
    <section style={{ padding: '10px 16px 14px', borderTop: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...label, color: INK, fontWeight: 700 }}>{title}</span>
        {right && <span style={{ marginLeft: 'auto' }}>{right}</span>}
        {note && <span style={{ ...label, fontSize: 8, marginLeft: right ? 10 : 'auto', color: FAINT, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note}</span>}
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
          <span className="tc-wipe" style={{ ...big, fontSize: Math.min(28, Math.floor(230 / t.name.length)), textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
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

// Its unit of one size (`n`) that season, most-played or best by net rating (`pick`), from
// thinking-bball's team units (lib/lineups.js teamUnits): each player's face and surname,
// then the unit's net, minutes and rank among the league's units of that size (none under
// its minutes floor). Faces come from the players index.
// One height whether or not there's a unit to show, so the card never jumps.
const UNITS_H = 86
function Units({ team, season, n, pick }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    let live = true
    Promise.all([fetchTeamUnits(season), fetchPlayers()]).then(([d, players]) => {
      const bySlug = new Map((players || []).map(p => [p.slug, p]))
      if (live) setDoc({ ...d, bySlug })
    }, () => live && setDoc(false))
    return () => { live = false }
  }, [season])
  const u = doc && doc.teams[team] && doc.teams[team][n] && doc.teams[team][n][pick]
  if (!u) {
    const why = doc === null ? '' : !(doc && doc.teams[team]) ? 'No lineups yet' : pick === 'best' ? `No ${n}-man unit at ${doc.floors[n]}+ min yet` : '—'
    return <div style={{ ...label, color: FAINT, height: UNITS_H, display: 'flex', alignItems: 'center' }}>{why}</div>
  }
  return (
    <div key={`${n}${pick}`} style={{ height: UNITS_H, display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 10 }}>
        {u.mates.map((m, j) => {
          const p = m.slug && doc.bySlug.get(m.slug)
          return (
            <div key={m.slug || m.name || j} className="tc-fade" style={{ animationDelay: `${40 + j * 60}ms`, flex: '1 1 0', minWidth: 0, maxWidth: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ width: '100%', maxWidth: 56, aspectRatio: '1', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: `1px solid ${EDGE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: DIM, flex: 'none' }}>
                {p && p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={56} height={56} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(m.name || '?')}
              </span>
              <span title={m.name} style={{ ...label, fontSize: 9, color: INK, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(m.name || '?').split(' ').slice(1).join(' ') || m.name}</span>
            </div>
          )
        })}
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: u.net === null ? FAINT : u.net >= 0 ? '#8fb0e6' : '#fa962a', fontVariantNumeric: 'tabular-nums' }}>{u.net === null ? '—' : `${u.net >= 0 ? '+' : '−'}${Math.abs(u.net).toFixed(1)}`}</span>
        <span style={{ ...label, fontSize: 8 }}>Net · {u.minutes.toLocaleString()} min</span>
        <span style={{ ...label, fontSize: 8, color: FAINT }}>{u.rank ? `#${u.rank.rank} of ${u.rank.of} ${n}-man units` : `Unranked under ${doc.floors[n]} min`}</span>
      </div>
    </div>
  )
}

// A small segmented switch for a heading (ModeSwitch's look).
function Pick({ options, value, set, label: name }) {
  return (
    <span role="group" aria-label={name} style={{ display: 'inline-flex', border: `1px solid ${EDGE}` }}>
      {options.map(([k, text], i) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => set(k)}
          style={{ height: 20, padding: '0 8px', border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: value === k ? '#3a3734' : 'transparent', color: value === k ? INK : DIM, fontFamily: MONO, fontSize: 8.5, fontWeight: value === k ? 700 : 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{text}</button>
      ))}
    </span>
  )
}
const SIZES = [[2, '2'], [3, '3'], [4, '4'], [5, '5']]
const PICKS = [['mostUsed', 'Most used'], ['best', 'Best net']]

// Its ratings as a table, the Team board's way: offense, defense and net across; the
// season and adjusted, then home and away and against the bottom and top 10, down. Each
// cell is the number and its percentile as a slider, the profile's Percentiles way (its
// place among the 30 on hover).
const RATINGS = [
  ['Season', 'ORTG', 'DRTG', 'Net'],
  ['Adjusted', 'Adj rORTG', 'Adj rDRTG', null],
  ['Home', 'Home ORTG', 'Home DRTG', 'Home Net'],
  ['Away', 'Away ORTG', 'Away DRTG', 'Away Net'],
  ['v Bottom 10', 'ORTG v Bot10', 'DRTG v Bot10', 'Net v Bot10'],
  ['v Top 10', 'ORTG v Top10', 'DRTG v Top10', 'Net v Top10']
]
const GRID = { display: 'grid', gridTemplateColumns: '92px repeat(3, minmax(0, 1fr))', columnGap: 3 }
function Ratings({ x }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ ...GRID, marginBottom: 2 }}>
        <span />
        {['Offense', 'Defense', 'Net'].map(h => <span key={h} style={{ ...label, fontSize: 10, fontWeight: 700, color: '#d6d1cb', padding: '0 10px' }}>{h}</span>)}
      </div>
      {RATINGS.map(([name, ...ls], i) => (
        <div key={name} style={{ ...GRID, height: 26, ...(i === 2 ? { marginTop: 8 } : null) }}>
          <span style={{ ...label, fontSize: 10, fontWeight: 600, color: '#d6d1cb', alignSelf: 'center', whiteSpace: 'nowrap' }}>{name}</span>
          {ls.map((l, j) => {
            const v = l && x.has(l) ? x.v(l) : null
            return (
              <span key={j} className="tc-fade" title={l && v !== null ? `${x.place(l)} · ${x.stat(l)?.desc || l}` : undefined} style={{ animationDelay: `${i * 40}ms`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', fontVariantNumeric: 'tabular-nums' }}>
                {l && <span style={{ width: 44, flexShrink: 0, fontSize: 13, fontWeight: 700, color: v === null ? FAINT : INK }}>{v === null ? '—' : x.text(l)}</span>}
                {l && <Slider p={v === null ? null : x.p(l)} c={x.tone(l)} />}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// A percentile as the profile's Percentiles cards draw it: a bar to it on a track, the
// league's median marked, its number on the knob; an empty track without one (no home
// games yet).
function Slider({ p, c }) {
  const at = `${Math.max(p, 1)}%`
  return (
    <span style={{ position: 'relative', flex: 1, height: 17, display: 'flex', alignItems: 'center', marginRight: 8, opacity: p === null ? 0.45 : 1 }}>
      <span style={{ position: 'absolute', left: 0, right: 0, height: 12, background: '#34312e' }} />
      <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#837d76' }} />
      {p !== null && <span style={{ position: 'absolute', left: 0, height: 12, width: at, background: c }} />}
      {p !== null && <span style={{ position: 'absolute', left: at, transform: 'translateX(-50%)', width: 17, height: 17, borderRadius: '50%', background: c, border: '1.5px solid #ece8e3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8, fontWeight: 600, color: '#1f1d1c' }}>{p}</span>}
    </span>
  )
}

// The play types as a mosaic across all of the offense: each half-court type as wide as its
// share, its bar as tall as its points a play above (blue) or below (orange) the league's
// for it, the rest (transition and the like) hatched; the half court's own numbers above.
const TYPES = [['Off-Ball', 'Off-ball'], ['PnR Game', 'PnR'], ['Iso-Post', 'Iso/post']]
const REACH = 0.14
function Playtypes({ x }) {
  const cols = TYPES.filter(([k]) => x.v(`${k} Share`) !== null)
  const at = cols.reduce((s, [k]) => s + x.v(`${k} Share`), 0)
  const rest = Math.max(0, 100 - at)
  const hc = 'Half-Court'
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      <span style={{ fontSize: 11, color: DIM }}>
        Half court <span style={{ color: INK, fontWeight: 700 }}>{x.text(`${hc} Share`)}%</span> · <span style={{ color: x.tone(`${hc} PPP`), fontWeight: 700 }}>{x.text(`${hc} PPP`)}</span> a play · {x.place(`${hc} PPP`)}
      </span>
      <div style={{ flex: 1, display: 'flex', gap: 2, minHeight: 90 }}>
        {cols.map(([k, name], i) => {
          const ppp = x.v(`${k} PPP`)
          const lg = x.lg(`${k} PPP`) ?? ppp
          const d = ppp === null ? 0 : Math.max(-REACH, Math.min(REACH, ppp - lg)) / REACH
          return (
            <div key={k} style={{ flex: `${x.v(`${k} Share`)} 1 0`, minWidth: 74, display: 'flex', flexDirection: 'column', gap: 4, background: PAD, padding: '7px 8px' }}>
              <span style={{ ...label, fontSize: 8.5, color: INK, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>{x.text(`${k} PPP`)}</span>
              <span style={{ ...label, fontSize: 8 }}>{x.place(`${k} PPP`)}</span>
              <span style={{ position: 'relative', flex: 1, minHeight: 30 }}>
                <span style={{ position: 'absolute', left: -8, right: -8, top: '50%', borderTop: `1px dashed ${DIM}` }} />
                <span className="tc-grow" style={{ position: 'absolute', left: 0, right: 0, top: d >= 0 ? `${50 - d * 50}%` : '50%', height: `${Math.max(1, Math.abs(d) * 50)}%`, background: x.tone(`${k} PPP`), opacity: 0.85, transformOrigin: d >= 0 ? '0 100%' : '0 0', animationDelay: `${150 + i * 110}ms` }} />
              </span>
              <span style={{ ...label, fontSize: 8.5, color: DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ color: INK }}>{x.text(`${k} Share`)}%</span><br />lg {x.lg(`${k} Share`) ?? '—'}%</span>
            </div>
          )
        })}
        {rest > 0 && (
          <div title="Transition and the rest" style={{ flex: `${rest} 1 0`, minWidth: 26, background: 'repeating-linear-gradient(45deg, #3d3a37 0 2px, transparent 2px 6px)', padding: '7px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ ...label, fontSize: 8, color: FAINT, writingMode: 'vertical-rl' }}>Transition</span>
            <span style={{ ...label, fontSize: 8.5, color: DIM }}>{Math.round(rest)}%</span>
          </div>
        )}
      </div>
    </div>
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
        <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
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
  const [pick, setPick] = useState('mostUsed')
  const [n, setN] = useState(5)
  const close = <button type="button" aria-label="Close the card" onClick={onClose} style={{ alignSelf: 'start', width: 26, height: 26, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
  // The last row takes the height the rest leave.
  const pair = { flex: '1 0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }
  return (
    <div className="pc-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <Head t={t} x={x} season={season} closeButton={close} />
      <Section title="Units" right={<span style={{ display: 'flex', gap: 8 }}><Pick label="Unit size" options={SIZES} value={n} set={setN} /><Pick label="Units shown" options={PICKS} value={pick} set={setPick} /></span>}><Units team={t.team} season={season} n={n} pick={pick} /></Section>
      <Section title="Ratings" note="bar: percentile"><Ratings x={x} /></Section>
      <div style={pair}>
        <Section title="Play types" note="width: share · bar: v league"><Playtypes x={x} /></Section>
        <Section title="Shots" note="meters: percentile" style={{ borderLeft: `1px solid ${RULE}` }}><Shots x={x} /></Section>
      </div>
    </div>
  )
}
