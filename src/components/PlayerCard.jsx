import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLonestar, fetchProfile, headshotUrl } from '../api.js'
import { chartModel } from '../lib/chart.js'
import { MONO, col, fmt, ord } from '../lib/format.js'
import { pctlOf, valueOf } from '../lib/leaderboard.js'
import { rollingStat } from '../lib/span.js'
import { starsText } from '../lib/lonestar.js'
import { initials } from '../lib/teams.js'
import { useSeasonType } from '../useSeasonType.js'
import FootprintGlyph from './FootprintGlyph.jsx'

// A player's card on the Leaderboard, in the scatter's place: a snapshot of his profile
// for the season on show. His portrait, name, team and minutes; three numbers (the stat
// the table is sorted by, then BPM, Load and rTS% as room allows) with their percentiles;
// his footprint as the Footprint tab's icons, those whose swing clears the noise lit in
// its colour (hover one for its swing); his percentiles across the profile's headline
// stats; two small charts, his career (BPM as a moving average against the league's, as
// his profile charts it) and
// Lonestar's that season (Load and Net with both his stars on and off); and his best and
// most-used two- and three-man units that season. The career and units come from his
// profile, Lonestar from its own document, both fetched on opening. Its charts move: the
// percentile bars wipe in, the career line and Lonestar's arrow draw (index.css).
const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const BLUE = '#8fb0e6'
const ORANGE = '#fa962a'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
// The headline stats, as on his profile's percentile card: impact, offense, defense.
const CARD_STATS = ['BPM', 'Net On/Off', 'Load', 'Box Creation', 'Pts / 75', 'rTS%', 'Passer Rating', 'cTOV%', 'DRTG On', 'Def FGA Diff%']
// Lonestar's small chart: its frame (a viewBox; it scales to the card's half-width) and
// its tab's axes (Load 0–80 split at 40, Net −25 to +25 split at 0). The career chart is
// the profile's season chart's (lib/chart.js).
const CW = 236
const CH = 108
const CM = { l: 20, r: 6, t: 8, b: 16 }
const LOAD = [0, 80]
const NET_AXIS = [-25, 25]
// The career line's window: a 3-season moving average, as the profile's ROLLING 3-YR.
const ROLL = 3
const UNITS = { pct: 'pct pts', pts: 'pts/100', pace: 'poss/48' }
const lastName = name => (name || '').split(' ').slice(1).join(' ') || name

function Section({ title, children, right }) {
  return (
    <div style={{ padding: '9px 14px', borderTop: `1px solid ${RULE}`, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ ...label, color: '#b8b2ab' }}>{title}</span>
        {right && <span style={{ ...label, color: FAINT }}>{right}</span>}
      </div>
      {children}
    </div>
  )
}

// His footprint that season: an icon per effect, lit in the swing's colour (blue a lift,
// orange a cost, ink a style effect) when it clears the noise, dim otherwise; the readout
// under them names the one under the pointer.
function Footprint({ doc, player: pl, group }) {
  const [at, setAt] = useState(null)
  const lit = new Set(pl.lit || [])
  const items = group.stats.map(l => {
    const k = doc.labels.indexOf(l)
    const stat = doc.stats[l]
    const v = pl.v[k]
    const tone = stat.neutral ? INK : (v > 0) !== !!stat.lowerBetter ? BLUE : ORANGE
    return { l, k, stat, v, on: lit.has(k), tone }
  })
  const shown = at && items.find(x => x.l === at)
  const none = items.every(x => x.v === null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }} onMouseLeave={() => setAt(null)}>
        {items.map(x => (
          <span key={x.l} onMouseEnter={() => setAt(x.l)} title={`${x.l}: ${x.v === null ? '—' : fmt(x.stat, x.v)}`}
            style={{ width: 24, height: 24, color: x.on ? x.tone : x.v === null ? '#3d3a37' : FAINT, cursor: 'default', outline: at === x.l ? `1px solid ${EDGE}` : 'none', outlineOffset: 2 }}>
            <span style={{ display: 'block', transform: 'scale(.86)', transformOrigin: '0 0' }}><FootprintGlyph stat={x.stat.key} /></span>
          </span>
        ))}
      </div>
      <span style={{ ...label, fontSize: 8.5, color: shown ? INK : FAINT, minHeight: 11 }}>
        {shown
          ? <>{shown.l} <span style={{ color: shown.v === null ? FAINT : shown.on ? shown.tone : '#b8b2ab' }}>{shown.v === null ? '—' : `${fmt(shown.stat, shown.v)} ${UNITS[shown.stat.swing] || ''}`}</span>{shown.v !== null && (shown.on ? ' · clears the noise' : ' · within the noise')}</>
          : none ? 'Too few minutes on or off' : `${lit.size} of ${items.length} clear the noise · hover an icon`}
      </span>
    </div>
  )
}

// A small chart's frame: its box, its split lines (where given and in view), the across
// axis's labels (its ends and name), and the up axis's name and ends' values.
const frac = (axis, v) => Math.max(0, Math.min(1, (v - axis[0]) / (axis[1] - axis[0])))
const px = (axis, v) => CM.l + frac(axis, v) * (CW - CM.l - CM.r)
const py = (axis, v) => CM.t + (1 - frac(axis, v)) * (CH - CM.t - CM.b)
const tiny = { fontFamily: MONO, fontSize: 7, letterSpacing: '.08em', fill: FAINT }
const end = v => `${v > 0 ? '+' : ''}${Math.round(v)}`.replace('-', '−')
function Frame({ x, y, splitX, splitY, xLabels, yName, children }) {
  const inside = (axis, v) => v !== undefined && v > axis[0] && v < axis[1]
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <rect x={CM.l} y={CM.t} width={CW - CM.l - CM.r} height={CH - CM.t - CM.b} fill="none" stroke={RULE} />
      {inside(x, splitX) && <line x1={px(x, splitX)} x2={px(x, splitX)} y1={CM.t} y2={CH - CM.b} stroke={EDGE} strokeDasharray="1 3" />}
      {inside(y, splitY) && <line x1={CM.l} x2={CW - CM.r} y1={py(y, splitY)} y2={py(y, splitY)} stroke={EDGE} strokeDasharray="1 3" />}
      <text x={CM.l} y={CH - 5} style={tiny}>{xLabels[0]}</text>
      <text x={(CM.l + CW - CM.r) / 2} y={CH - 5} textAnchor="middle" style={tiny}>{xLabels[1]}</text>
      <text x={CW - CM.r} y={CH - 5} textAnchor="end" style={tiny}>{xLabels[2]}</text>
      <text x={CM.l - 4} y={CM.t + 6} textAnchor="end" style={tiny}>{end(y[1])}</text>
      <text transform={`translate(${CM.l - 6} ${(CM.t + CH - CM.b) / 2}) rotate(-90)`} textAnchor="middle" style={tiny}>{yName}</text>
      <text x={CM.l - 4} y={CH - CM.b} textAnchor="end" style={tiny}>{end(y[0])}</text>
      {children}
    </svg>
  )
}

// His career as his profile charts it (lib/chart.js chartModel), small: BPM as a 3-season
// moving average (each season averaging itself and the two before; plain seasons for a
// career shorter than that), dots in the window's percentile colour, against the
// league's average dashed, the gap shaded blue where he's above it and orange below; the
// season on show ringed and its value shown. The dots pop in season by season.
function Career({ profile: p, season, n }) {
  const stat = n > 1 ? rollingStat(p, 'BPM', n) : p.stats.BPM
  const m = chartModel(stat, p.seasons)
  const k = p.seasons.findIndex(x => x.season === season)
  const pct = (v, of) => `${(v / of) * 100}%`
  const tick = i => `’${p.seasons[i].season.slice(5)}`
  return (
    <div style={{ position: 'relative', height: 96 }}>
      <svg viewBox="0 0 330 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        {m.bands.map((b, i) => <path key={i} d={b.d} fill={b.fill} />)}
        <line x1="0" x2="330" y1="134" y2="134" stroke="#6b655f" vectorEffect="non-scaling-stroke" />
        {m.leagueLines.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke={DIM} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />)}
        {m.playerLines.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
      </svg>
      {m.pts.filter(q => q.has).map(q => {
        const on = q.i === k
        const r = on ? 4.5 : 2.5
        return (
          <span key={q.i} className="ls-pop" style={{ position: 'absolute', left: pct(q.x, 330), top: pct(q.y, 150), width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: '50%', background: q.color, border: on ? `1.5px solid ${INK}` : 'none', boxSizing: 'border-box', animationDelay: `${q.i * 40}ms` }} />
        )
      })}
      {k >= 0 && m.pts[k].has && <span style={{ position: 'absolute', left: pct(m.pts[k].x, 330), top: pct(m.pts[k].valueY, 150), transform: 'translate(-50%, -50%)', fontSize: 9.5, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>{m.pts[k].value}</span>}
      <span style={{ ...label, fontSize: 7.5, position: 'absolute', left: 0, top: '100%', marginTop: 3 }}>{tick(0)}</span>
      {k > 0 && k < p.seasons.length - 1 && <span style={{ ...label, fontSize: 7.5, color: INK, position: 'absolute', left: pct(m.pts[k].x, 330), top: '100%', marginTop: 3, transform: 'translateX(-50%)' }}>{tick(k)}</span>}
      <span style={{ ...label, fontSize: 7.5, position: 'absolute', right: 0, top: '100%', marginTop: 3, color: k === p.seasons.length - 1 ? INK : DIM }}>{tick(p.seasons.length - 1)}</span>
    </div>
  )
}

// Lonestar's that season: a hollow square where he is with his stars on, an arrow to
// where he is with them off, in the colour of his Net change (blue up, orange down).
function Alone({ scenario: s }) {
  const ok = v => v !== null && v !== undefined
  if (!ok(s.on.load) || !ok(s.on.net) || !ok(s.off.load) || !ok(s.off.net)) return <span style={{ ...label, color: FAINT }}>—</span>
  const [ax, ay, bx, by] = [px(LOAD, s.on.load), py(NET_AXIS, s.on.net), px(LOAD, s.off.load), py(NET_AXIS, s.off.net)]
  const color = s.off.net > s.on.net ? BLUE : s.off.net < s.on.net ? ORANGE : DIM
  const length = Math.hypot(bx - ax, by - ay)
  const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
  return (
    <Frame x={LOAD} y={NET_AXIS} splitX={40} splitY={0} xLabels={['0', 'LOAD →', '80']} yName="NET">
      {length > 6 && (
        <>
          <line className="ls-draw" x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={1.25} style={{ strokeDasharray: length, strokeDashoffset: length }} />
          {/* Placed by its group: the pop's scale (a CSS transform) would undo a transform on the head itself. */}
          <g transform={`translate(${bx} ${by}) rotate(${angle})`}>
            <polygon className="ls-pop" points="0,0 -7,-3.5 -7,3.5" fill={color} />
          </g>
        </>
      )}
      <rect x={ax - 3.5} y={ay - 3.5} width={7} height={7} fill="#262422" stroke={INK} strokeWidth={1.25} />
    </Frame>
  )
}

// One unit: his teammates in it (faces and surnames), its net rating, minutes and rank
// among the league's units of its size.
function Unit({ unit, title }) {
  if (!unit) return <span style={{ ...label, color: FAINT }}>{title} · —</span>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ ...label, fontSize: 8 }}>{title}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ display: 'flex', flex: 'none' }}>
          {unit.mates.map((m, i) => (
            <span key={m.slug || m.name} style={{ width: 20, height: 20, marginLeft: i ? -6 : 0, borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: '1px solid #544f4b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 7, color: DIM }}>
              {m.headshot ? <img src={headshotUrl(m.slug, 100, m.headshotVersion, m.headshot)} alt="" width={20} height={20} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(m.name || '?')}
            </span>
          ))}
        </span>
        <span style={{ fontSize: 10.5, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.mates.map(m => lastName(m.name)).join(' · ')}</span>
      </span>
      <span style={{ fontSize: 10, color: DIM, whiteSpace: 'nowrap' }}>
        <span style={{ color: unit.net >= 0 ? BLUE : ORANGE, fontWeight: 600 }}>{unit.net >= 0 ? '+' : '−'}{Math.abs(unit.net).toFixed(1)}</span> net · {unit.minutes.toLocaleString()} min{unit.rank ? ` · #${unit.rank.rank}/${unit.rank.of}` : ''}
      </span>
    </div>
  )
}

export default function PlayerCard({ doc, player: pl, rank, sortLabel, onClose }) {
  const { playoffs, playerPath } = useSeasonType()
  const [profile, setProfile] = useState(null)
  const [lonestar, setLonestar] = useState(null)
  useEffect(() => {
    let live = true
    fetchProfile(pl.slug, playoffs).then(d => live && setProfile(d || false), () => live && setProfile(false))
    if (!playoffs) fetchLonestar(pl.slug).then(d => live && setLonestar(d || false), () => live && setLonestar(false))
    return () => { live = false }
  }, [pl.slug, playoffs])
  useEffect(() => {
    const escape = e => { if (e.key === 'Escape' && !document.querySelector('[role=dialog]')) onClose() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])

  const season = doc.season
  const at = profile ? profile.seasons.findIndex(s => s.season === season) : -1
  const heroes = [...new Set([sortLabel, 'BPM', 'Load', 'rTS%'])].filter(l => doc.labels.includes(l)).slice(0, 3)
  const rows = CARD_STATS.filter(l => doc.labels.includes(l))
  const fp = doc.groups.find(g => g.id === 'footprint')
  // His units that season: its bio card's, or for the depth chart's season (which has no
  // card) the profile's own.
  const lineups = at < 0 ? null : profile.seasons[at].card ? profile.seasons[at].card.lineups : profile.lineups && profile.lineups.season === season ? profile.lineups : null
  const units = lineups && lineups.units
  // Lonestar's stretch that season without both his stars, or his top one alone.
  const view = lonestar && lonestar.views.find(v => v.id === season)
  const star = view && (view.scenarios.find(x => x.kind === 'two') || view.scenarios.find(x => x.kind === 'one'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <span aria-hidden="true" style={{ width: 7, height: 7, background: 'var(--accent)' }} />
        <span style={{ ...label, color: INK }}>Player card · {season.replace('-', '–')}{playoffs ? ' playoffs' : ''}</span>
        <Link to={playerPath(pl.slug)} state={{ season }} style={{ ...label, marginLeft: 'auto', color: INK, border: `1px solid ${EDGE}`, padding: '5px 8px' }}>Full profile →</Link>
        <button type="button" aria-label="Close the card" onClick={onClose} style={{ width: 26, height: 26, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr)', gap: 14, padding: '0 14px 12px' }}>
        <div style={{ width: 104, height: 104, background: PORTRAIT_BG, border: `1px solid ${RULE}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DIM }}>
          {pl.headshot
            ? <img src={headshotUrl(pl.slug, 400, pl.headshotVersion, pl.headshot)} alt="" width={104} height={104} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 15%' }} />
            : initials(pl.name)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 21, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-.01em', lineHeight: 1.05, color: INK }}>{pl.name}</span>
          <span style={label}>{[pl.teams ? pl.teams.join(' · ') : pl.team, pl.pos, pl.age !== null && `age ${Math.floor(pl.age)}`, pl.gp !== null && `${pl.gp} gp`, pl.mp !== null && `${pl.mp.toLocaleString()} min`].filter(Boolean).join(' · ')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${heroes.length}, minmax(0, 1fr))`, gap: 1, background: RULE, border: `1px solid ${RULE}`, marginTop: 'auto' }}>
            {heroes.map(l => {
              const v = valueOf(doc, pl, l)
              const pc = pctlOf(doc, pl, l)
              return (
                <div key={l} style={{ background: '#262422', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ ...label, fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}{l === sortLabel && rank ? ` · #${rank}` : ''}</span>
                  <span style={{ fontSize: 19, fontWeight: 600, lineHeight: 1, color: INK }}>{fmt(doc.stats[l], v)}</span>
                  <span style={{ fontSize: 9, color: pc === null ? FAINT : col(pc) }}>{pc === null ? '—' : `${ord(pc)} pctl`}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {fp && <Section title="Footprint" right="on − off, that season"><Footprint doc={doc} player={pl} group={fp} /></Section>}

      <Section title="Percentiles" right={season.replace('-', '–')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 16, rowGap: 5 }}>
          {rows.map((l, i) => {
            const pc = pctlOf(doc, pl, l)
            return (
              <div key={l} style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr) 26px', gap: 6, alignItems: 'center' }}>
                <span style={{ ...label, fontSize: 8, color: '#b8b2ab', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
                <span style={{ position: 'relative', height: 8, background: '#34312e' }}>
                  {pc !== null && <span className="lb-bar-in" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(pc, 2)}%`, background: col(pc), animationDelay: `${80 + i * 30}ms` }} />}
                  <span style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#6b655f' }} />
                </span>
                <span style={{ fontSize: 10, textAlign: 'right', color: pc === null ? FAINT : INK }}>{pc ?? '—'}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: playoffs ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', borderTop: `1px solid ${RULE}` }}>
        <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ ...label, color: '#b8b2ab' }}>BPM <span style={{ color: FAINT }}>· {profile && profile.seasons.length >= ROLL ? `${ROLL}-yr avg` : 'by season'} vs lg</span></span>
          {profile ? <Career profile={profile} season={season} n={profile.seasons.length >= ROLL ? ROLL : 1} /> : <span style={{ ...label, color: FAINT, height: 96 }}>{profile === false ? 'Unavailable' : 'Loading'}</span>}
        </div>
        {!playoffs && (
          <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, borderLeft: `1px solid ${RULE}` }}>
            <span style={{ ...label, color: '#b8b2ab', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Lonestar <span style={{ color: FAINT }}>· w/o {star ? starsText(star.stars) : '—'}</span></span>
            {star ? <Alone scenario={star} /> : <span style={{ ...label, color: FAINT, height: 96 }}>{lonestar === null ? 'Loading' : 'No star stretch this season'}</span>}
          </div>
        )}
      </div>

      <Section title="Units" right={lineups ? `${lineups.team} · with him` : null}>
        {units
          ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 16, rowGap: 10 }}>
              <Unit title="Best 2-man" unit={units['2'] && units['2'].best} />
              <Unit title="Most-used 2-man" unit={units['2'] && units['2'].mostUsed} />
              <Unit title="Best 3-man" unit={units['3'] && units['3'].best} />
              <Unit title="Most-used 3-man" unit={units['3'] && units['3'].mostUsed} />
            </div>
          )
          : <span style={{ ...label, color: FAINT }}>{profile === null ? 'Loading' : 'No units on file this season'}</span>}
      </Section>
    </div>
  )
}
