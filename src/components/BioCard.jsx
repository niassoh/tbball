import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { headshotUrl, loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { recentLine } from '../lib/gamelog.js'
import TeamInitials from './TeamInitials.jsx'
import TeamPicker from './TeamPicker.jsx'
import { TEAM_COLORS } from '../lib/teams.js'

const card = { border: '1px solid #544f4b', background: '#2c2a28', display: 'flex', flexDirection: 'column', minWidth: 0 }
const logGrid = { display: 'grid', gridTemplateColumns: '28px 58px 12px repeat(3,minmax(0,1fr)) 30px', columnGap: 3, fontFamily: MONO }
const INJURY = { OUT: '#fa962a', DTD: '#e6c27a' }
const LAST_GAMES = 7

const lastName = name => name.split(' ').slice(1).join(' ') || name
const shortDate = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
const rankColor = r => (r === null ? '#8a847e' : r <= 10 ? '#e6c27a' : r <= 20 ? '#d6d1cb' : '#8a847e')
const tsColor = ts => (ts === null ? '#ece8e3' : ts >= 60 ? '#8fb0e6' : ts < 52 ? '#fa962a' : '#ece8e3')

const HERO_H = 128
const PORTRAIT = 116
// Our illustrated portraits fill their frame more than the NBA.com fallbacks, so they
// sit a touch smaller (the hover zoom scales from this).
const GENERATED_PORTRAIT = 108
// The portrait (or team-initials block) sits in the banner's bottom-right corner,
// standing on the rule like a thumbnail subject, and fades into the bokeh on its
// left and top edges; portraits share the banner's charcoal, so no edge shows.
// An ellipse centred right of the face: the face and right side stay solid while the
// left edge and lower-left corner fall off in an arc, so shoulders taper instead of
// being cut by a straight line.
// A second, small arc centred on the bottom-left corner tapers an arm or shoulder that
// the source crop cut off at the box's left edge, so it doesn't end in a straight line.
const fadeIn = size => `radial-gradient(ellipse 80% 115% at 76% 72%, #000 70%, transparent 100%), radial-gradient(circle ${size}px at 0% 100%, transparent 8%, #000 38%)`
// Without a portrait, the team-initials panel runs the banner's full height and
// fades in from the left, dimmed so it reads as a backdrop rather than a box.
const panelFade = 'linear-gradient(90deg, transparent 0%, #000 55%)'

function Headshot({ slug, version, source, name, team }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: PORTRAIT + 24, opacity: 0.55, WebkitMaskImage: panelFade, maskImage: panelFade }}>
        <TeamInitials name={name} team={team} fontSize={32} />
      </div>
    )
  }
  const size = source === 'portrait' ? GENERATED_PORTRAIT : PORTRAIT
  const mask = fadeIn(size)
  return (
    // The hover zoom scales this whole box (mask included), not the image inside it:
    // transparent portraits run to the top of the frame, so a zoom inside the box
    // would clip the hair flat.
    <div className="hero-face fade-in" style={{ position: 'absolute', right: 0, bottom: 0, width: size, height: size, WebkitMaskImage: mask, WebkitMaskComposite: 'source-in', maskImage: mask, maskComposite: 'intersect' }}>
      <img src={headshotUrl(slug, 400, version, source)} alt={name} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%', display: 'block' }} />
    </div>
  )
}

// First name on one line, the rest below; long surnames get a smaller size so they
// stop short of the portrait (~0.62em per character in this face).
const nameLines = name => {
  const [first, ...rest] = name.split(' ')
  return rest.length ? [first, rest.join(' ')] : [name]
}
const nameSize = lines => Math.min(30, Math.floor(240 / (0.62 * Math.max(...lines.map(l => l.length)))))

// A game-log summary row (last-N average or season line), set off like the stat tables'
// span and career rows; dashes when there's no line.
const avg = n => (n === null || n === undefined ? '—' : n.toFixed(1))
function SummaryRow({ label, line, first = false }) {
  return (
    <div style={{ ...logGrid, fontSize: 10.5, padding: '5px 2px', alignItems: 'center', fontWeight: 700, background: '#262422', borderTop: first ? '1px solid #6b655f' : 'none', borderBottom: '1px solid #3d3a37', color: line ? '#ece8e3' : '#3d3a37' }}>
      <span style={{ gridColumn: '1 / 4', fontSize: 9, fontWeight: 600, letterSpacing: '.08em', color: '#a8a29c', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ textAlign: 'right' }}>{avg(line && line.pts)}</span>
      <span style={{ textAlign: 'right' }}>{avg(line && line.reb)}</span>
      <span style={{ textAlign: 'right' }}>{avg(line && line.ast)}</span>
      <span style={{ textAlign: 'right', color: line && line.ts !== null ? tsColor(line.ts) : undefined }}>{avg(line && line.ts)}</span>
    </div>
  )
}

// "2017 DRAFT · R1 #30 · UTA", or UNDRAFTED.
const draftLine = d => (!d ? null : d.undrafted ? 'UNDRAFTED' : `${d.year} DRAFT · R${d.round} #${d.overall} · ${d.team}`)

export default function BioCard({ profile: p, loading = false }) {
  // Spec strip: team logo, then position / height / age split by hard rules (labels as tooltips).
  const specs = [['POS', p.bio.position], ['HT', p.bio.height], ['AGE', p.bio.age !== null ? p.bio.age.toFixed(1) : null]].filter(([, v]) => v)
  const lines = nameLines(p.name)
  const games = (p.gameLog && p.gameLog.games) || []
  const season = (p.gameLog && p.gameLog.seasonLine) || null
  const color = TEAM_COLORS[p.team]
  // Black (BKN, SAS) would vanish on the dark banner, so those teams' bar is silver.
  const accent = color === '#000000' ? '#c4ced4' : color
  // Hover line: the draft pick, e.g. "2017 DRAFT · R1 #30 · UTA".
  const draft = draftLine(p.bio.draft)
  // The header logo and the depth chart's team name toggle the team switcher, which
  // opens just below whichever was clicked (picking holds that element).
  const [picking, setPicking] = useState(null)
  const closePicker = useCallback(() => setPicking(null), [])
  const open = e => setPicking(picking ? null : e.currentTarget)
  const switcher = { onClick: open, onPointerEnter: () => { loadTeams().catch(() => {}) }, title: 'Switch team' }

  return (
    <div style={card}>
      <div className={loading ? 'hero loading' : 'hero'} style={{ position: 'relative', height: HERO_H, background: '#1f1d1c', borderBottom: '2px solid #ece8e3', overflow: 'hidden' }}>
        <img className="hero-bokeh" src="/banner-bokeh.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55, display: 'block' }} />
        <Headshot key={p.slug} slug={p.slug} version={p.headshotVersion} source={p.headshot} name={p.name} team={p.team} />
        {/* A soft overhead light along the top-right hides the seam where the headshot box begins. */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 42% 60% at 84% -8%, rgba(236,232,227,.16), rgba(236,232,227,.06) 45%, transparent 75%)' }} />
        <div key={`specs-${p.slug}`} className="swap-in" style={{ position: 'absolute', left: 14, top: 12, display: 'flex', alignItems: 'stretch', fontFamily: MONO }}>
          {color && (
            // The real logo, muted at rest (index.css); full colour on hover.
            <div style={{ paddingRight: 10, borderRight: '1px solid #6b655f', margin: '-5px 10px -5px 0' }}>
              <button type="button" className="team-switch" aria-label={`${p.teamName || p.team}: switch team`} {...switcher} style={{ display: 'block', padding: 0, margin: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
                <img className="hero-logo" src={`/logos/color/${p.team}.png`} alt={p.team} style={{ display: 'block', width: 44, height: 44, objectFit: 'contain' }} />
              </button>
            </div>
          )}
          {specs.map(([label, value], i) => (
            <span key={label} title={label} style={{ display: 'flex', alignItems: 'center', padding: '0 10px', paddingLeft: i === 0 && !TEAM_COLORS[p.team] ? 0 : 10, borderRight: i < specs.length - 1 ? '1px solid #6b655f' : 'none', fontSize: 13, fontWeight: 600, color: '#ece8e3' }}>
              {value}
            </span>
          ))}
        </div>
        {draft && (
          <span key={`draft-${p.slug}`} className="hero-more" style={{ position: 'absolute', left: color ? 89 : 14, top: 43, fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#a8a29c', whiteSpace: 'nowrap' }}>{draft}</span>
        )}
        {accent && <div className="hero-bar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: accent }} />}
        <h1 key={`name-${p.slug}`} className="swap-in" style={{ position: 'absolute', left: 14, bottom: 12, margin: 0, fontSize: nameSize(lines), lineHeight: 1.02, fontWeight: 600, letterSpacing: '-.005em', textShadow: '0 1px 8px rgba(0,0,0,.5)' }}>
          {lines.map(l => <span key={l} style={{ display: 'block', whiteSpace: 'nowrap' }}>{l}</span>)}
        </h1>
      </div>

      {/* Always LAST_GAMES rows (dash rows fill in when there are fewer, with a stamp when
          there are none), then his average over them and his season line. The block takes
          the card's spare height (the cards in a row match the tallest), sharing it
          evenly across its rows, so the card has no empty space at the bottom. */}
      <div key={`games-${p.slug}`} className="swap-in" style={{ flex: '1 0 auto', padding: '12px 14px 4px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '2px 8px', paddingBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', whiteSpace: 'nowrap' }}>LAST {LAST_GAMES} GAMES</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#8a847e', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#e6c27a' }}>TOP-10</span><span style={{ color: '#d6d1cb' }}>MID</span><span>BOTTOM-10</span>
          </span>
        </div>
        <div style={{ ...logGrid, fontSize: 9, letterSpacing: '.06em', color: '#8a847e', borderBottom: '1px solid #6b655f', padding: '4px 2px' }}>
          <span>DATE</span><span>OPP</span><span /><span style={{ textAlign: 'right' }}>PTS</span><span style={{ textAlign: 'right' }}>REB</span><span style={{ textAlign: 'right' }}>AST</span><span style={{ textAlign: 'right' }}>TS%</span>
        </div>
        <div style={{ position: 'relative', flex: 1, display: 'grid', gridAutoRows: '1fr' }}>
          {Array.from({ length: LAST_GAMES }, (_, i) => games[i]).map((g, i) => g ? (
            <div key={g.gameId} style={{ ...logGrid, fontSize: 10.5, padding: '5px 2px', borderBottom: '1px solid #3d3a37', alignItems: 'center' }}>
              <span style={{ color: '#a8a29c' }}>{shortDate(g.date)}</span>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: rankColor(g.oppRank) }}>{g.home ? g.opp : '@' + g.opp}</span>
              <span style={{ fontWeight: 600, color: g.result === 'W' ? '#97c197' : '#fa962a' }}>{g.result}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{g.pts}</span>
              <span style={{ textAlign: 'right' }}>{g.reb}</span>
              <span style={{ textAlign: 'right' }}>{g.ast}</span>
              <span style={{ textAlign: 'right', color: tsColor(g.ts) }}>{g.ts === null ? '—' : g.ts.toFixed(1)}</span>
            </div>
          ) : (
            <div key={`empty-${i}`} aria-hidden="true" style={{ ...logGrid, fontSize: 10.5, padding: '5px 2px', borderBottom: '1px solid #3d3a37', alignItems: 'center', color: '#3d3a37' }}>
              <span>—</span><span>—</span><span /><span style={{ textAlign: 'right' }}>—</span><span style={{ textAlign: 'right' }}>—</span><span style={{ textAlign: 'right' }}>—</span><span style={{ textAlign: 'right' }}>—</span>
            </div>
          ))}
          <SummaryRow first label={`LAST ${games.length || LAST_GAMES} AVG`} line={recentLine(games)} />
          <SummaryRow label={season ? `SEASON · ${season.gp} GP` : 'SEASON'} line={season} />
          {games.length === 0 && (
            <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: '#a8a29c', background: '#2c2a28', border: '1px solid #544f4b', padding: '4px 8px', whiteSpace: 'nowrap' }}>NO GAMES THIS SEASON</span>
          )}
        </div>
      </div>

      {p.depth && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, '--team': accent || '#ece8e3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #544f4b', paddingBottom: 5 }}>
            <button type="button" className="team-switch" {...switcher} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, background: 'none', border: 'none', color: '#ece8e3', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800, letterSpacing: '.12em' }}>
              {(p.teamName || p.team).toUpperCase()}
              <span aria-hidden="true" style={{ fontFamily: MONO, fontSize: 9, color: '#8a847e' }}>▾</span>
            </button>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>DEPTH</span>
              {Object.entries(INJURY).map(([k, c]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, background: c }} />{k}</span>
              ))}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: '0 3px' }}>
            {p.depth.rows.map(row => (
              <div key={row.pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#a8a29c', textAlign: 'center', paddingBottom: 3 }}>{row.pos}</span>
                {row.players.map((pl, i) => {
                  const me = pl.slug === p.slug
                  const Name = pl.hasProfile && !me ? Link : 'span'
                  return (
                    <Name key={pl.espnId} {...(Name === Link && { to: `/player/${pl.slug}`, className: 'depth-link' })} title={pl.name} style={{ fontSize: 10.5, lineHeight: 1.3, fontWeight: me ? 700 : 500, color: me ? '#ece8e3' : pl.status ? '#8a847e' : i > 2 ? '#8a847e' : '#d6d1cb', textAlign: 'center', padding: '3px 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: me ? '2px solid #97c197' : '2px solid transparent', background: me ? 'rgba(151,193,151,.12)' : 'transparent' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {lastName(pl.name)}
                        {pl.status && <span title={pl.status} style={{ width: 5, height: 5, background: INJURY[pl.status], flex: 'none' }} />}
                      </span>
                    </Name>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      {picking && <TeamPicker profile={p} anchor={picking} onClose={closePicker} />}
    </div>
  )
}
