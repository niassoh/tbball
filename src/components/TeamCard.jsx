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
// The card's intro, when a team opens: the head settles, then the unit's faces arrive one
// by one and its net counts up, then the ratings fill row by row, then the play types and
// shots (ms from opening). Every number counts up as its bar or knob arrives.
const AT = { faces: 150, face: 110, ratings: 900, row: 110, col: 45, rest: 1650 }
const NET_STAT = { dec: 1, relative: true }
const WHOLE = { dec: 0 }
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
function Head({ t, x, season, closeButton, intro }) {
  const big = { fontFamily: 'Montserrat, sans-serif', fontWeight: 800, lineHeight: 0.9, color: INK, fontVariantNumeric: 'tabular-nums' }
  // Called, not rendered as a component: one defined in here would remount each render.
  const hero = (l, name, delay) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 96 }}>
      <span style={label}>{name}</span>
      <span style={{ ...big, fontSize: 26 }}><CountUp stat={x.stat(l)} value={x.v(l)} delay={delay} instant={!intro} /></span>
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
          <span style={{ ...big, fontSize: 18, flex: 'none' }}><CountUp stat={WHOLE} value={x.v('Wins')} delay={150} instant={!intro} />–<CountUp stat={WHOLE} value={x.v('Losses')} delay={150} instant={!intro} /></span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {hero('LA Bayes Win-pace', 'Win pace', 200)}
        {hero('Net', 'Net rating', 320)}
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
function Units({ team, season, n, pick, intro }) {
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
            <div key={m.slug || m.name || j} className="tc-pop" style={{ animationDelay: `${AT.faces + j * AT.face}ms`, flex: '1 1 0', minWidth: 0, maxWidth: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ width: '100%', maxWidth: 56, aspectRatio: '1', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: `1px solid ${EDGE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: DIM, flex: 'none' }}>
                {p && p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={56} height={56} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(m.name || '?')}
              </span>
              <span title={m.name} style={{ ...label, fontSize: 9, color: INK, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(m.name || '?').split(' ').slice(1).join(' ') || m.name}</span>
            </div>
          )
        })}
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: u.net === null ? FAINT : u.net >= 0 ? '#8fb0e6' : '#fa962a', fontVariantNumeric: 'tabular-nums' }}><CountUp stat={NET_STAT} value={u.net} delay={AT.faces + u.mates.length * AT.face} instant={!intro} /></span>
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

// Its ratings: offense, defense and net each as a tile (what it counts, the number, its
// percentile as a slider and its place, then the opponent-adjusted figure); then its
// splits as a table that reads across: ORTG, DRTG and net, the net drawn either side
// of zero. Every number is coloured by its percentile (blue better).
const TILES = [['Offense', 'ORTG', 'Adj rORTG', 'ORTG'], ['Defense', 'DRTG', 'Adj rDRTG', 'DRTG'], ['Net', 'Net', null, 'Net rating']]
const SPLITS = [
  ['At home', 'Home ORTG', 'Home DRTG', 'Home Net'],
  ['Away', 'Away ORTG', 'Away DRTG', 'Away Net'],
  ['v Bottom 10', 'ORTG v Bot10', 'DRTG v Bot10', 'Net v Bot10'],
  ['v Top 10', 'ORTG v Top10', 'DRTG v Top10', 'Net v Top10']
]
const SPLIT_GRID = { display: 'grid', gridTemplateColumns: '108px 70px 70px 62px minmax(0, 1fr)', columnGap: 12, alignItems: 'center' }
// The splits' net bar runs to this many points either side of zero.
const NET_REACH = 25
function Ratings({ x, intro }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 3 }}>
        {TILES.map(([name, l, adj, what], j) => {
          const delay = AT.ratings + j * AT.row
          return (
            <div key={l} title={x.stat(l)?.desc || undefined} style={{ background: PAD, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ ...label, fontSize: 10, fontWeight: 700, color: INK }}>{name}</span>
                <span style={{ ...label, fontSize: 8.5, color: '#c9c3bc', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{x.place(l)} of 30</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="tc-fade" style={{ animationDelay: `${delay}ms`, width: 64, flexShrink: 0, fontSize: 22, fontWeight: 700, lineHeight: 1, color: x.tone(l), fontVariantNumeric: 'tabular-nums' }}>{x.text(l)}</span>
                <Slider p={x.p(l)} c={x.tone(l)} delay={delay} intro={intro} />
              </span>
              <span style={{ fontSize: 9.5, color: DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {what}{adj && x.v(adj) !== null && <> · opp-adj <span style={{ color: x.tone(adj), fontWeight: 700 }}>{x.text(adj)}</span></>}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...SPLIT_GRID, paddingBottom: 4 }}>
          <span style={{ ...label, fontSize: 10, fontWeight: 700, color: INK }}>Splits</span>
          {['ORTG', 'DRTG'].map(h => <span key={h} style={{ ...label, fontSize: 9.5, color: '#c9c3bc', textAlign: 'right' }}>{h}</span>)}
          <span style={{ ...label, fontSize: 9.5, color: '#c9c3bc', textAlign: 'right' }}>Net</span>
          <span />
        </div>
        {SPLITS.map(([name, o, d, n], i) => {
          const delay = AT.ratings + 3 * AT.row + i * AT.row
          const net = x.v(n)
          return (
            <div key={name} className="tc-fade" style={{ ...SPLIT_GRID, animationDelay: `${delay}ms`, height: 30, borderTop: `1px dashed ${RULE}`, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ ...label, fontSize: 11, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>{name}</span>
              {[o, d].map(l => <span key={l} title={x.v(l) === null ? undefined : `${x.place(l)} of 30`} style={{ fontSize: 15, fontWeight: 700, textAlign: 'right', color: x.v(l) === null ? FAINT : x.tone(l) }}>{x.text(l)}</span>)}
              <span style={{ fontSize: 15, fontWeight: 700, textAlign: 'right', color: net === null ? FAINT : x.tone(n) }}>{x.text(n)}</span>
              {net === null ? <span style={{ ...label, fontSize: 9.5, color: FAINT }}>No games yet</span> : <NetBar v={net} c={x.tone(n)} delay={delay} title={`${x.place(n)} of 30`} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
// A net either side of zero, NET_REACH points to an end.
function NetBar({ v, c, delay, title }) {
  const w = (Math.min(NET_REACH, Math.abs(v)) / NET_REACH) * 50
  return (
    <span title={title} style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 0, right: 0, height: 16, background: '#34312e' }} />
      <span className="tc-grow-x" style={{ position: 'absolute', height: 16, width: `${w}%`, left: v >= 0 ? '50%' : `${50 - w}%`, background: c, transformOrigin: v >= 0 ? '0 50%' : '100% 50%', animationDelay: `${delay}ms` }} />
      <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#837d76' }} />
    </span>
  )
}

// A percentile as the profile's Percentiles cards draw it: a bar to it on a track, the
// league's median marked, its number on the knob; an empty track without one (no home
// games yet).
function Slider({ p, c, delay, intro }) {
  const at = `${Math.max(p, 1)}%`
  return (
    <span style={{ position: 'relative', flex: 1, height: 17, display: 'flex', alignItems: 'center', marginRight: 8, opacity: p === null ? 0.45 : 1 }}>
      <span style={{ position: 'absolute', left: 0, right: 0, height: 12, background: '#34312e' }} />
      <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#837d76' }} />
      {p !== null && <span className="tc-grow-x" style={{ position: 'absolute', left: 0, height: 12, width: at, background: c, transformOrigin: '0 50%', animationDelay: `${delay}ms` }} />}
      {p !== null && <span className="tc-knob" style={{ '--from': '0%', animationDelay: `${delay}ms`, position: 'absolute', left: at, transform: 'translateX(-50%)', width: 17, height: 17, borderRadius: '50%', background: c, border: '1.5px solid #ece8e3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8, fontWeight: 600, color: '#1f1d1c' }}><CountUp stat={WHOLE} value={p} delay={delay} instant={!intro} /></span>}
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
                <span className="tc-grow" style={{ position: 'absolute', left: 0, right: 0, top: d >= 0 ? `${50 - d * 50}%` : '50%', height: `${Math.max(1, Math.abs(d) * 50)}%`, background: x.tone(`${k} PPP`), opacity: 0.85, transformOrigin: d >= 0 ? '0 100%' : '0 0', animationDelay: `${AT.rest + i * 110}ms` }} />
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
              <span style={{ gridColumn: '1 / -1' }}><Meter pc={x.p(l)} delay={AT.rest + 150 + (s * 3 + i) * 60} /></span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// The intro (AT) plays as a team's card opens (TeamBoard keys the card by team); after it,
// unit sizes, Most used and the like show at once. A card opened in place of another (a
// team picked while one is open: `open` counts the mounted cards, and the old one is
// still mounted as the new one first renders) settles quickly instead: everything at
// once in a short fade (tc-quick), its numbers already there.
const INTRO_MS = 2600
const QUICK_MS = 300
let open = 0
export default function TeamCard({ doc, team: t, season, onClose }) {
  const [quick] = useState(() => open > 0)
  const [settling, setSettling] = useState(true)
  useEffect(() => {
    open++
    const id = setTimeout(() => setSettling(false), quick ? QUICK_MS : INTRO_MS)
    return () => { open--; clearTimeout(id) }
  }, [quick])
  const intro = settling && !quick
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
    <div className={`pc-card${!settling ? ' tc-still' : quick ? ' tc-quick' : ''}`} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <Head t={t} x={x} season={season} closeButton={close} intro={intro} />
      <Section title="Units" right={<span style={{ display: 'flex', gap: 8 }}><Pick label="Unit size" options={SIZES} value={n} set={setN} /><Pick label="Units shown" options={PICKS} value={pick} set={setPick} /></span>}><Units team={t.team} season={season} n={n} pick={pick} intro={intro} /></Section>
      <Section title="Ratings" note="slider: percentile · blue better"><Ratings x={x} intro={intro} /></Section>
      <div style={pair}>
        <Section title="Play types" note="width: share · bar: v league"><Playtypes x={x} /></Section>
        <Section title="Shots" note="meters: percentile" style={{ borderLeft: `1px solid ${RULE}` }}><Shots x={x} /></Section>
      </div>
    </div>
  )
}
