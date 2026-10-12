import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProfile, headshotUrl } from '../api.js'
import { MONO, col, fmt, ord } from '../lib/format.js'
import { pctlOf, valueOf } from '../lib/leaderboard.js'
import { initials } from '../lib/teams.js'
import { useSeasonType } from '../useSeasonType.js'
import FootprintGlyph from './FootprintGlyph.jsx'

// A player's card on the Leaderboard, in the scatter's place: a snapshot of his profile
// for the season on show. His portrait, name, team and minutes; three numbers (the stat
// the table is sorted by, then BPM, Load and rTS% as room allows) with their percentiles;
// his footprint as the Footprint tab's icons, those whose swing clears the noise lit in
// its colour (hover one for its swing); his percentiles across the profile's headline
// stats; BPM in every season of his career, this one marked; and his best and most-used
// two- and three-man units that season. The career and units come from his profile,
// fetched on opening. Its charts move: the percentile bars wipe in and the seasons rise
// in turn (index.css).
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
const ARC_H = 48
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

// BPM in each season of his career, bars from zero (up for plus, down for minus), coloured
// by its percentile that season; the season on show outlined.
function Arc({ profile: p, season }) {
  const s = p.stats.BPM
  const vals = p.seasons.map((x, i) => ({ season: x.season, v: s.vals[i] }))
  const ns = vals.filter(x => x.v).map(x => x.v.n)
  const hi = Math.max(8, ...ns)
  const lo = Math.min(-4, ...ns)
  const zero = (hi / (hi - lo)) * ARC_H
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'stretch' }}>
      {vals.map((x, i) => {
        const n = x.v ? x.v.n : 0
        const hgt = (Math.abs(n) / (hi - lo)) * ARC_H
        const on = x.season === season
        return (
          <div key={x.season} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ position: 'relative', height: ARC_H }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: zero, height: 1, background: EDGE }} />
              {x.v && (
                <div className={`lb-rise${n < 0 ? ' lb-down' : ''}`} title={`${x.season.replace('-', '–')}: BPM ${fmt(s, n)}`}
                  style={{ position: 'absolute', left: 0, right: 0, top: n >= 0 ? zero - hgt : zero + 1, height: Math.max(1, hgt), background: x.v.p === null ? FAINT : col(x.v.p), outline: on ? `1.5px solid ${INK}` : 'none', outlineOffset: 1, animationDelay: `${120 + i * 40}ms` }} />
              )}
            </div>
            <span style={{ ...label, fontSize: 7.5, letterSpacing: '.02em', textAlign: 'center', color: on ? INK : FAINT, fontWeight: on ? 700 : 400 }}>’{x.season.slice(5)}</span>
          </div>
        )
      })}
    </div>
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
  useEffect(() => {
    let live = true
    fetchProfile(pl.slug, playoffs).then(d => live && setProfile(d || false), () => live && setProfile(false))
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <span aria-hidden="true" style={{ width: 7, height: 7, background: 'var(--accent)' }} />
        <span style={{ ...label, color: INK }}>Player card · {season.replace('-', '–')}{playoffs ? ' playoffs' : ''}</span>
        <Link to={playerPath(pl.slug)} state={{ season }} style={{ ...label, marginLeft: 'auto', color: INK, border: `1px solid ${EDGE}`, padding: '5px 8px' }}>Full profile →</Link>
        <button type="button" aria-label="Close the card" onClick={onClose} style={{ width: 26, height: 26, border: `1px solid ${EDGE}`, background: 'transparent', color: INK, fontFamily: MONO, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', gap: 14, padding: '0 14px 12px' }}>
        <div style={{ width: 112, height: 112, background: PORTRAIT_BG, border: `1px solid ${RULE}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DIM }}>
          {pl.headshot
            ? <img src={headshotUrl(pl.slug, 400, pl.headshotVersion, pl.headshot)} alt="" width={112} height={112} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 15%' }} />
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

      <Section title="BPM by season" right={profile && at >= 0 ? `${profile.seasons.length} seasons` : null}>
        {profile ? <Arc profile={profile} season={season} /> : <span style={{ ...label, height: ARC_H + 14, color: FAINT }}>{profile === false ? 'Unavailable' : 'Loading'}</span>}
      </Section>

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
