import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPlayers, fetchTeamUnits, headshotUrl, loadTeams } from '../api.js'
import { MONO, col, colText, fmt, ord } from '../lib/format.js'
import { shortSeason, spanYears } from '../lib/seasons.js'
import { placeOf, tiedOf } from '../lib/teamboard.js'
import { asset } from '../lib/static.js'
import { initials, teamColor } from '../lib/teams.js'
import { useSeasonType } from '../useSeasonType.js'
import { CountUp, Meter, Section } from './PlayerCard.jsx'
import { Trophy } from './TrophyCase.jsx'

// A team's card on the Team board, in the chart's place, drawn as a player's card is: its
// head (logo, name, record and win pace, then ORTG, DRTG and net with their meters and
// places); its percentiles, offense beside defense; its splits and play types side by
// side; how its possessions start, offense beside defense; and its depth chart and units. Blue is better than the league, orange worse, grey a style. It
// comes in on opening: the logo settles, the name wipes in, the numbers count up as their
// meters light, the bars wipe in and the units' faces arrive (index.css .pc-*, .tc-*).
// A row over many seasons (the board's spans and runs) reads its years in the head, its
// places among the board's rows, and its units are its last season's (`season`). On the
// board's Δ (`against`: the seasons it's set against, [first, last]) every stat is the
// change, its percentile among the changes; the record and units stay the season's own,
// and there are no play types (a change in shares leaves no transition share).
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
  // A season's sheet can lack a stat (2025-26 has no "Def after SET"): it reads as a blank.
  const stat = l => ({ ...doc.stats[l], relative: !!(doc.stats[l] || {}).relative || RELATIVE.test(l) })
  const place = l => (v(l) === null ? '—' : `${tiedOf(doc, t, l) ? 'T-' : ''}${ord(placeOf(doc, t, l))}`)
  const tone = l => (p(l) === null ? FAINT : doc.stats[l].neutral ? MID : col(p(l)))
  const ink = l => (p(l) === null ? FAINT : doc.stats[l].neutral ? SOFT : colText(p(l)))
  const text = (l, n = v(l)) => fmt(stat(l), n)
  return { has, v, p, stat, place, tone, ink, text, lg: l => doc.league[l] ?? null }
}
const titleOf = (x, l) => [x.v(l) === null ? null : `${x.place(l)} of 30`, x.stat(l).desc].filter(Boolean).join(' · ') || undefined

// The head, as a player's card's: the logo on the banner's bokeh; the abbreviation,
// record, win pace and season (and the close button) over the name, its deep playoff runs
// at the name's end (Trophies); then ORTG, DRTG and net, each with its meter and place.
const HEROES = ['ORTG', 'DRTG', 'Net']
// Its deep playoff runs (lib/teamboard.js trophiesOf) as trophies on their plinths, in the
// head's top right beside the close button, as tall as the season line and the name
// together (RUNS_H): one season's named beside it (CHAMPIONS), a span's smaller, each over
// its year; the series on hover. They pop in after the name, which keeps clear of them.
const RUNS_H = 36
const RUN_NAMES = { champion: 'Champions', finals: 'Finals', conf: 'Conf finals' }
const RUN_INK = { champion: '#d4af37', finals: '#c9ced3', conf: '#b8794a' }
const runsWidth = n => (n === 0 ? 0 : n === 1 ? 120 : n * 30)
function Trophies({ trophies, intro }) {
  if (!trophies.length) return null
  const one = trophies.length === 1
  return (
    <span style={{ position: 'absolute', top: 0, right: 32, height: RUNS_H, display: 'flex', alignItems: 'flex-end', gap: one ? 0 : 4 }}>
      {trophies.map((t, i) => (
        <span key={t.season} className={intro ? 'tc-pop' : undefined} title={`${RUN_NAMES[t.kind]} · ${t.season.replace('-', '–')}\n${t.path}`}
          style={{ display: 'flex', flexDirection: one ? 'row' : 'column', alignItems: one ? 'flex-end' : 'center', gap: one ? 7 : 2, animationDelay: `${AT.heroes + i * AT.step}ms` }}>
          {one && <span style={{ ...small, fontSize: 9, fontWeight: 700, color: RUN_INK[t.kind], paddingBottom: 4 }}>{RUN_NAMES[t.kind]}</span>}
          <Trophy award={t.kind} scale={one ? 0.86 : 0.6} />
          {!one && <span style={{ ...small, fontSize: 7.5, lineHeight: 1, color: RUN_INK[t.kind] }}>{shortSeason(t.season)}</span>}
        </span>
      ))}
    </span>
  )
}
const RADIAL = 'radial-gradient(circle closest-side, #000 35%, transparent)'
function Head({ t, x, season, against, trophies, intro, closeButton }) {
  const when = t.span || season.replace('-', '–')
  const mark = against ? ' Δ' : ''
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', columnGap: 14, padding: '12px 14px' }}>
      <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* The banner's bokeh as a glow that fades out around the logo, edgeless. */}
        <img src={asset('banner-bokeh.png')} alt="" style={{ position: 'absolute', inset: -14, width: 'calc(100% + 28px)', height: 'calc(100% + 28px)', objectFit: 'cover', objectPosition: '30% 0%', opacity: 0.75, WebkitMaskImage: RADIAL, maskImage: RADIAL }} />
        <img className="tc-logo" src={asset(`logos/color/${t.team}.png`)} alt="" width={60} height={60} style={{ position: 'relative' }} />
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Trophies trophies={trophies} intro={intro} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pc-type" style={{ ...small, lineHeight: '13px' }}>{[t.team, x.v('Wins') !== null && `${x.v('Wins')}–${x.v('Losses')}`, x.v('LA Bayes Win-pace') !== null && (against ? `${x.text('LA Bayes Win-pace')} win pace` : `${x.text('LA Bayes Win-pace')}-win pace`), against ? `${t.span || shortSeason(season)} − ${against[0] === against[1] ? shortSeason(against[0]) : spanYears(against[0], against[1])}` : when].filter(Boolean).join(' · ')}</span>
          {closeButton}
        </span>
        <span className="pc-name" style={{ marginTop: 1, paddingRight: trophies.length ? runsWidth(trophies.length) + 44 : 0, fontFamily: 'Montserrat, sans-serif', fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-.01em', lineHeight: 1, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {HEROES.map((l, k) => {
            const delay = AT.heroes + k * 90
            return (
              <div key={l} title={titleOf(x, l)} style={{ padding: k ? '0 0 0 12px' : '0 12px 0 0', borderLeft: k ? `1px solid ${RULE}` : 'none', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span style={small}>{l}{mark}</span>
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
function Percentiles({ x, change }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 16 }}>
      {SIDES.map(([side, rows], s) => (
        <div key={side} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ ...label, fontSize: 10.5, fontWeight: 700, color: INK, paddingBottom: 5, marginBottom: 2, borderBottom: `1px solid ${RULE}` }}>{side}{change ? ' Δ' : ''}</span>
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
// like) its share alone. Without any of them (the sheet's play types not loaded), no
// section: the rest would read as 100% transition.
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

// The season's team units (thinking-bball profile.js teamUnitsDoc) with the players index
// (for faces) and the teams list (for today's depth chart): fetched once a season.
function useUnits(season) {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    let live = true
    Promise.all([fetchTeamUnits(season), fetchPlayers(), loadTeams().catch(() => null)]).then(([d, players, teams]) => {
      const bySlug = new Map((players || []).map(p => [p.slug, p]))
      if (live) setDoc({ ...d, bySlug, today: teams })
    }, () => live && setDoc(false))
    return () => { live = false }
  }, [season])
  return doc
}
const surname = name => (name || '?').split(' ').slice(1).join(' ') || name || '?'
// A player's name or face, linked to his profile at this season when he has one.
function ToPlayer({ who, season, style, children }) {
  const { playerPath } = useSeasonType()
  if (!who.slug || who.hasProfile === false) return <span title={who.name} style={style}>{children}</span>
  return <Link to={playerPath(who.slug)} state={{ season }} title={who.name} className="depth-link" style={{ ...style, borderBottom: '2px solid transparent' }}>{children}</Link>
}

// Its depth chart, as on a player's page (BioCard): today's (ESPN's, with injuries) in the
// season it's for, else the season's rotation (its most-used five across the top, then
// everyone with an hour on the floor by minutes), three deep so the card fits a laptop's screen.
const INJURY = { OUT: '#fa962a', DTD: '#e6c27a' }
function Depth({ team, season, doc }) {
  const today = doc && doc.today && (doc.today.find(t => t.team === team) || {}).depth
  const chart = today && today.season === season ? today : doc && doc.rotations && doc.rotations[team]
  if (!chart) return <div style={{ ...label, color: FAINT, height: DEPTH_H, display: 'flex', alignItems: 'center' }}>{doc === null ? '' : 'No depth chart'}</div>
  return (
    <div className="tc-fade" style={{ minHeight: DEPTH_H, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0 3px', '--team': teamColor(team) || INK, animationDelay: `${AT.units}ms` }}>
      {chart.rows.map(row => (
        <div key={row.pos} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ ...label, fontSize: 8.5, color: FAINT, textAlign: 'center', paddingBottom: 1 }}>{row.pos}</span>
          {row.players.slice(0, 3).map((pl, i) => (
            <ToPlayer key={pl.slug || `${pl.name}-${i}`} who={pl} season={season} style={{ fontSize: 10.5, lineHeight: 1.25, fontWeight: 500, color: pl.status || i > 1 ? DIM : '#d6d1cb', textAlign: 'center', padding: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {surname(pl.name)}
              {pl.status && <span title={pl.status} style={{ display: 'inline-block', width: 5, height: 5, marginLeft: 4, verticalAlign: 'middle', background: INJURY[pl.status] }} />}
            </ToPlayer>
          ))}
        </div>
      ))}
    </div>
  )
}
const DEPTH_H = 60

// Its unit of one size (`n`) that season, most used or best by net (`pick`), from
// thinking-bball's team units (lib/lineups.js teamUnits): each player's face and surname,
// then the unit's net, minutes and rank among the league's units of that size (none under
// its minutes floor). Faces come from the players index. One height whether or not
// there's a unit, so the card never jumps.
const UNITS_H = 40
function Units({ team, season, doc, n, pick, intro }) {
  const u = doc && doc.teams[team] && doc.teams[team][n] && doc.teams[team][n][pick]
  if (!u) {
    const why = doc === null ? '' : !(doc && doc.teams[team]) ? 'No lineups yet' : pick === 'best' ? `No ${n}-man unit at ${doc.floors[n]}+ min yet` : '—'
    return <div style={{ ...label, color: FAINT, flex: 1, height: UNITS_H, display: 'flex', alignItems: 'center' }}>{why}</div>
  }
  return (
    <div key={`${n}${pick}`} style={{ flex: 1, minWidth: 0, height: UNITS_H, display: 'flex', alignItems: 'center', gap: 12, '--team': teamColor(team) || INK }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4 }}>
        {u.mates.map((m, j) => {
          const p = m.slug && doc.bySlug.get(m.slug)
          return (
            <ToPlayer key={m.slug || m.name || j} who={{ ...m, hasProfile: !!p }} season={season} style={{ flex: '1 1 0', minWidth: 0, maxWidth: 110, display: 'block' }}>
              <span className="tc-pop" style={{ animationDelay: `${AT.units + j * AT.step}ms`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: `1px solid ${EDGE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: DIM, flex: 'none' }}>
                  {p && p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={26} height={26} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(m.name || '?')}
                </span>
                <span style={{ ...rowName, fontSize: 8.5, letterSpacing: '.02em', maxWidth: '100%' }}>{surname(m.name)}</span>
              </span>
            </ToPlayer>
          )
        })}
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: u.net === null ? FAINT : u.net >= 0 ? '#8fb0e6' : '#fa962a', fontVariantNumeric: 'tabular-nums' }}><CountUp stat={NET_STAT} value={u.net} delay={AT.units} instant={!intro} /></span>
        <span title={u.rank ? `Net rating · #${u.rank.rank} of ${u.rank.of} ${n}-man units` : `Net rating · unranked under ${doc.floors[n]} min`} style={{ ...label, fontSize: 8.5, color: SOFT }}>{u.minutes.toLocaleString()} min · {u.rank ? `#${u.rank.rank} of ${u.rank.of}` : 'unranked'}</span>
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
export default function TeamCard({ doc, team: t, season, against, trophies = [], onClose, onUnits }) {
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
  const units = useUnits(season)
  const today = units && units.today && (units.today.find(u => u.team === t.team) || {}).depth
  return (
    <div className={`pc-card${!settling ? ' tc-still' : quick ? ' tc-quick' : ' pc-intro'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <Head t={t} x={x} season={season} against={against} trophies={trophies} intro={intro} closeButton={<button type="button" aria-label="Close the card" onClick={onClose} style={{ marginLeft: 'auto', flex: 'none', width: 22, height: 22, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 12, cursor: 'pointer', lineHeight: 1 }}>×</button>} />
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${RULE}` }}><Percentiles x={x} change={!!against} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Section title="Splits" right="per 100"><Rows x={x} heads={['ORTG', 'DRTG', 'Net']} rows={SPLITS} delay={AT.rows} /></Section>
        <div style={{ borderLeft: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column' }}>
          {!against && TYPES.some(([k]) => x.v(`${k} Share`) !== null) && <Section title="Play types" right={`half court ${x.text('Half-Court Share')}`}><Playtypes x={x} /></Section>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Section title="Offense by start" right="share · rating"><Rows x={x} heads={['Share', 'ORTG']} rows={startsOf('Off')} delay={AT.rows + 4 * AT.step} /></Section>
        <div style={{ borderLeft: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column' }}>
          <Section title="Defense by start" right="share · rating"><Rows x={x} heads={['Share', 'DRTG']} rows={startsOf('Def')} delay={AT.rows + 4 * AT.step} /></Section>
        </div>
      </div>
      {/* The last section takes the card's spare height, its chart and units at its top. */}
      <Section title="Depth" style={{ flex: '1 0 auto', paddingBottom: 6 }} right={today && today.season === season ? 'Today' : <span title="First row: the team's most-used five. Then everyone with an hour on the floor, by minutes">Rotation · by min</span>}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Depth team={t.team} season={season} doc={units} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 5, borderTop: `1px solid ${RULE}` }}>
            <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><button type="button" className="tc-units-all" onClick={onUnits} title="All of the team's units" style={{ ...label, padding: 0, border: 0, background: 'transparent', color: '#b8b2ab', cursor: 'pointer' }}>All units →</button><Pick label="Unit size" options={SIZES} value={n} set={setN} /></span>
              <Pick label="Unit shown" options={PICKS} value={pick} set={setPick} />
            </span>
            <Units team={t.team} season={season} doc={units} n={n} pick={pick} intro={intro} />
          </div>
        </div>
      </Section>
    </div>
  )
}
