import { useEffect, useState } from 'react'
import { fetchPlayers, fetchTeamUnits, headshotUrl } from '../api.js'
import { MONO, col, colText, fmt, ord } from '../lib/format.js'
import { placeOf, tiedOf } from '../lib/teamboard.js'
import { asset } from '../lib/static.js'
import { initials } from '../lib/teams.js'
import { CountUp, Meter, Section } from './PlayerCard.jsx'

// A team's card on the Team board, in the chart's place, drawn as a player's card is: its
// head (logo, name, record and win pace, then ORTG, DRTG and net with their meters and
// places); its percentiles, offense beside defense; its splits and play types side by
// side; how its possessions start, offense beside defense; and its units. Blue is better than the league, orange worse, grey a style. It
// comes in on opening: the logo settles, the name wipes in, the numbers count up as their
// meters light, the bars wipe in and the units' faces arrive (index.css .pc-*, .tc-*).
// A row over many seasons (the board's spans and runs) reads its years in the head, its
// places among the board's rows, and its units are its last season's (`season`).
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const SOFT = '#b8b2ab'
const TRACK = '#34312e'
const MID = '#837d76'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const small = { ...label, fontSize: 8.5, letterSpacing: '.14em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const RELATIVE = /^Net|^r|^Adj r| Net$/
// A row's name in the card's tables, bright enough to read beside a strong bar.
const rowName = { ...label, fontSize: 9.5, letterSpacing: '.08em', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
// The intro's beats, ms from opening: the head's numbers, the percentile bars, the splits
// and play types, then the units.
const AT = { heroes: 350, bars: 650, rows: 950, units: 1200, step: 45 }
const NET_STAT = { dec: 1, relative: true }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'

// The team's numbers in a stat: value, percentile, league average, its place, and how to
// print and colour it (`tone` for bars, `ink` for text).
const reader = (doc, t) => {
  const k = l => doc.labels.indexOf(l)
  const has = l => k(l) >= 0
  const v = l => (has(l) ? t.v[k(l)] : null)
  const p = l => (has(l) ? t.p[k(l)] : null)
  const stat = l => ({ ...doc.stats[l], relative: RELATIVE.test(l) })
  const place = l => (v(l) === null ? '—' : `${tiedOf(doc, t, l) ? 'T-' : ''}${ord(placeOf(doc, t, l))}`)
  const tone = l => (p(l) === null ? FAINT : doc.stats[l].neutral ? MID : col(p(l)))
  const ink = l => (p(l) === null ? FAINT : doc.stats[l].neutral ? SOFT : colText(p(l)))
  const text = (l, n = v(l)) => fmt(stat(l), n)
  return { has, v, p, stat, place, tone, ink, text, lg: l => doc.league[l] ?? null }
}
const titleOf = (x, l) => [x.v(l) === null ? null : `${x.place(l)} of 30`, x.stat(l).desc].filter(Boolean).join(' · ') || undefined

// The head, as a player's card's: the logo on the banner's bokeh; the abbreviation,
// record, win pace and season (and the close button) over the name; then ORTG, DRTG and net, each with its meter and place.
const HEROES = ['ORTG', 'DRTG', 'Net']
const RADIAL = 'radial-gradient(circle closest-side, #000 35%, transparent)'
function Head({ t, x, season, intro, closeButton }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', columnGap: 14, padding: '12px 14px' }}>
      <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* The banner's bokeh as a glow that fades out around the logo, edgeless. */}
        <img src={asset('banner-bokeh.png')} alt="" style={{ position: 'absolute', inset: -14, width: 'calc(100% + 28px)', height: 'calc(100% + 28px)', objectFit: 'cover', objectPosition: '30% 0%', opacity: 0.75, WebkitMaskImage: RADIAL, maskImage: RADIAL }} />
        <img className="tc-logo" src={asset(`logos/color/${t.team}.png`)} alt="" width={60} height={60} style={{ position: 'relative' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pc-type" style={{ ...small, lineHeight: '13px' }}>{[t.team, x.v('Wins') !== null && `${x.v('Wins')}–${x.v('Losses')}`, x.v('LA Bayes Win-pace') !== null && `${x.text('LA Bayes Win-pace')}-win pace`, t.span || season.replace('-', '–')].filter(Boolean).join(' · ')}</span>
          {closeButton}
        </span>
        <span className="pc-name" style={{ marginTop: 1, fontFamily: 'Montserrat, sans-serif', fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-.01em', lineHeight: 1, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {HEROES.map((l, k) => {
            const delay = AT.heroes + k * 90
            return (
              <div key={l} title={titleOf(x, l)} style={{ padding: k ? '0 0 0 12px' : '0 12px 0 0', borderLeft: k ? `1px solid ${RULE}` : 'none', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span style={small}>{l}</span>
                <span style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}><CountUp stat={x.stat(l)} value={x.v(l)} delay={delay} instant={!intro} /></span>
                  <Meter pc={x.p(l)} delay={delay} />
                  <span style={{ fontSize: 9, color: x.ink(l) }}>{x.place(l)}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Its percentiles, as a player's card's but untitled: offense beside defense, each headed, each stat a bar to its
// percentile (the league's median marked) and its value.
const SIDES = [
  ['Offense', [['Adj rORTG', 'Opp-adjusted'], ['Half-Court PPP', 'Half court'], ['3p', '3P%'], ['Rim/FTA Share', 'Rim + FT'], ['LayupAst', 'Layup ast']]],
  ['Defense', [['Adj rDRTG', 'Opp-adjusted'], ['Opp 3p', 'Opp 3P%'], ['Opp Corner3 share', 'Corner 3s'], ['Opp Wide Open 3s/g', 'Open 3s / g'], ['Opp Rim Share', 'Rim share'], ['Opp Rim FG', 'Rim FG%']]]
]
function Percentiles({ x }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 16 }}>
      {SIDES.map(([side, rows], s) => (
        <div key={side} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ ...label, fontSize: 10.5, fontWeight: 700, color: INK, paddingBottom: 5, marginBottom: 2, borderBottom: `1px solid ${RULE}` }}>{side}</span>
          {rows.filter(([l]) => x.has(l)).map(([l, name], i) => {
            const pc = x.p(l)
            return (
              <div key={l} title={titleOf(x, l)} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) 42px', gap: 6, alignItems: 'center' }}>
                <span style={rowName}>{name}</span>
                <Bar w={pc === null ? null : Math.max(pc, 2)} c={x.tone(l)} mark={50} delay={AT.bars + (i * 2 + s) * AT.step} />
                <span style={{ fontSize: 11, textAlign: 'right', color: x.v(l) === null ? FAINT : INK, fontVariantNumeric: 'tabular-nums' }}>{x.text(l)}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
// A player's card's percentile bar: a track, a bar wiping in to `w`% and a mark at `mark`%.
function Bar({ w, c, mark, delay }) {
  return (
    <span style={{ position: 'relative', height: 8, background: TRACK }}>
      {w !== null && <span className="lb-bar-in" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${w}%`, background: c, animationDelay: `${delay}ms` }} />}
      {mark !== null && <span style={{ position: 'absolute', left: `${mark}%`, top: -2, bottom: -2, width: 1, background: MID }} />}
    </span>
  )
}

// A small table: each row's name, then its stats (`ls`) coloured by percentile under `heads`.
// Its splits are one (ORTG, DRTG and net at home, away and against the league's bottom and
// top 10); how its possessions start another (after a stop, a make or a set, the share of
// its possessions and its rating, on offense and on defense).
const SPLITS = [
  ['Home', 'Home ORTG', 'Home DRTG', 'Home Net'],
  ['Away', 'Away ORTG', 'Away DRTG', 'Away Net'],
  ['v Bottom 10', 'ORTG v Bot10', 'DRTG v Bot10', 'Net v Bot10'],
  ['v Top 10', 'ORTG v Top10', 'DRTG v Top10', 'Net v Top10']
]
const STARTS = [['stop', 'STOP'], ['make', 'MAKE'], ['set', 'SET']]
const startsOf = side => STARTS.map(([name, k]) => [`After ${name}`, `${side} after ${k}`, `${side === 'Off' ? 'ORTG' : 'DRTG'} after ${k}`])
function Rows({ x, heads, rows, delay }) {
  const cols = { display: 'grid', gridTemplateColumns: `92px repeat(${heads.length}, minmax(0, 1fr))`, gap: 6, alignItems: 'center' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={cols}>
        <span />
        {heads.map(h => <span key={h} style={{ ...label, fontSize: 8, color: FAINT, textAlign: 'right' }}>{h}</span>)}
      </div>
      {rows.map(([name, ...ls], i) => (
        <div key={name} className="tc-fade" style={{ ...cols, animationDelay: `${delay + i * AT.step}ms` }}>
          <span style={rowName}>{name}</span>
          {ls.map(l => <span key={l} title={titleOf(x, l)} style={{ fontSize: 11, textAlign: 'right', color: x.ink(l), fontVariantNumeric: 'tabular-nums' }}>{x.text(l)}</span>)}
        </div>
      ))}
    </div>
  )
}

// Its play types: each half-court type's share of the offense as a bar (the league's share
// marked) and its points a play, coloured by percentile; the rest (transition and the
// like) its share alone.
const TYPES = [['Off-Ball', 'Off-ball'], ['PnR Game', 'PnR'], ['Iso-Post', 'Iso / post']]
const TYPE_COLS = { display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 32px 36px', gap: 6, alignItems: 'center' }
function Playtypes({ x }) {
  const shown = TYPES.filter(([k]) => x.v(`${k} Share`) !== null)
  const rest = Math.max(0, 100 - shown.reduce((s, [k]) => s + x.v(`${k} Share`), 0))
  const rows = [...shown.map(([k, name]) => ({ name, share: x.v(`${k} Share`), lg: x.lg(`${k} Share`), l: `${k} PPP` })), { name: 'Transition', share: rest, lg: null, l: null, title: 'Transition and the rest' }]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={TYPE_COLS}>
        <span />
        <span style={{ ...label, fontSize: 8, color: FAINT }}>Share</span>
        <span />
        <span style={{ ...label, fontSize: 8, color: FAINT, textAlign: 'right' }}>PPP</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.name} title={r.title || titleOf(x, r.l)} style={TYPE_COLS}>
          <span style={rowName}>{r.name}</span>
          <Bar w={r.share} c={MID} mark={r.lg} delay={AT.rows + i * AT.step} />
          <span style={{ fontSize: 11, textAlign: 'right', color: DIM, fontVariantNumeric: 'tabular-nums' }}>{Math.round(r.share)}%</span>
          <span style={{ fontSize: 11, textAlign: 'right', color: r.l ? x.ink(r.l) : FAINT, fontVariantNumeric: 'tabular-nums' }}>{r.l ? x.text(r.l) : ''}</span>
        </div>
      ))}
    </div>
  )
}

// Its unit of one size (`n`) that season, most used or best by net (`pick`), from
// thinking-bball's team units (lib/lineups.js teamUnits): each player's face and surname,
// then the unit's net, minutes and rank among the league's units of that size (none under
// its minutes floor). Faces come from the players index. One height whether or not
// there's a unit, so the card never jumps.
const UNITS_H = 68
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
    <div key={`${n}${pick}`} style={{ height: UNITS_H, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8 }}>
        {u.mates.map((m, j) => {
          const p = m.slug && doc.bySlug.get(m.slug)
          return (
            <div key={m.slug || m.name || j} className="tc-pop" style={{ animationDelay: `${AT.units + j * AT.step}ms`, flex: '1 1 0', minWidth: 0, maxWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: `1px solid ${EDGE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: DIM, flex: 'none' }}>
                {p && p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(m.name || '?')}
              </span>
              <span title={m.name} style={{ ...rowName, maxWidth: '100%' }}>{(m.name || '?').split(' ').slice(1).join(' ') || m.name}</span>
            </div>
          )
        })}
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: u.net === null ? FAINT : u.net >= 0 ? '#8fb0e6' : '#fa962a', fontVariantNumeric: 'tabular-nums' }}><CountUp stat={NET_STAT} value={u.net} delay={AT.units} instant={!intro} /></span>
        <span style={{ ...label, fontSize: 9, color: SOFT }}>Net · {u.minutes.toLocaleString()} min</span>
        <span style={{ ...label, fontSize: 8.5 }}>{u.rank ? `#${u.rank.rank} of ${u.rank.of} ${n}-man units` : `Unranked under ${doc.floors[n]} min`}</span>
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
          style={{ height: 18, padding: '0 7px', border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: value === k ? '#3a3734' : 'transparent', color: value === k ? INK : DIM, fontFamily: MONO, fontSize: 8.5, fontWeight: value === k ? 700 : 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{text}</button>
      ))}
    </span>
  )
}
const SIZES = [[2, '2'], [3, '3'], [4, '4'], [5, '5']]
const PICKS = [['mostUsed', 'Most used'], ['best', 'Best net']]

// The intro (AT) plays as a team's card opens (TeamBoard keys the card by team); after it,
// unit sizes and the like show at once. A card opened in place of another (a team picked
// while one is open: `open` counts the mounted cards, and the old one is still mounted as
// the new one first renders) settles quickly instead: everything at once in a short fade
// (tc-quick), its numbers already there.
const INTRO_MS = 2000
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
  const [n, setN] = useState(5)
  const [pick, setPick] = useState('mostUsed')
  return (
    <div className={`pc-card${!settling ? ' tc-still' : quick ? ' tc-quick' : ' pc-intro'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <Head t={t} x={x} season={season} intro={intro} closeButton={<button type="button" aria-label="Close the card" onClick={onClose} style={{ marginLeft: 'auto', flex: 'none', width: 22, height: 22, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 12, cursor: 'pointer', lineHeight: 1 }}>×</button>} />
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${RULE}` }}><Percentiles x={x} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Section title="Splits" right="per 100"><Rows x={x} heads={['ORTG', 'DRTG', 'Net']} rows={SPLITS} delay={AT.rows} /></Section>
        <div style={{ borderLeft: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column' }}>
          <Section title="Play types" right={`half court ${x.text('Half-Court Share')}`}><Playtypes x={x} /></Section>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Section title="Offense by start" right="share · rating"><Rows x={x} heads={['Share', 'ORTG']} rows={startsOf('Off')} delay={AT.rows + 4 * AT.step} /></Section>
        <div style={{ borderLeft: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column' }}>
          <Section title="Defense by start" right="share · rating"><Rows x={x} heads={['Share', 'DRTG']} rows={startsOf('Def')} delay={AT.rows + 4 * AT.step} /></Section>
        </div>
      </div>
      {/* The last section takes the card's spare height, its unit centred in it. */}
      <Section title="Units" style={{ flex: '1 0 auto' }} right={<span style={{ display: 'flex', gap: 8 }}><Pick label="Unit size" options={SIZES} value={n} set={setN} /><Pick label="Unit shown" options={PICKS} value={pick} set={setPick} /></span>}><div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><Units team={t.team} season={season} n={n} pick={pick} intro={intro} /></div></Section>
    </div>
  )
}
