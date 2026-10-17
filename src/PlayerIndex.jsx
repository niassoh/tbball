import { startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPlayers, fetchProfile, headshotUrl, prefetchProfile } from './api.js'
import { MONO } from './lib/format.js'
import { TEAM_COLORS, teamColor } from './lib/teams.js'
import { asset } from './lib/static.js'
import TeamInitials from './components/TeamInitials.jsx'
import JerseyOverlay from './components/JerseyOverlay.jsx'
import { useSeasonType } from './useSeasonType.js'

// The player index: a search line (and the way to the Leaderboard) and the 30 teams'
// logos to filter by, then the
// illustrated portraits (the generated art) as a catalogue, by his best season's BPM (his
// regular season with the highest among those with 800+ minutes): a link opens on that
// season, or on his latest if he's active. Everyone else, a parts list, shows only for a
// search or a team. The accent lights what's on. It has no playoffs switch (lib/mode.js modeless); its links open
// player pages in the reader's last mode.
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
// Portraits are transparent cutouts; behind them sits the charcoal they were drawn on.
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const ILLUSTRATED = new Set(['portrait', 'jersey'])
const TEAMS = Object.keys(TEAM_COLORS).sort()
// Team colours as swatches on charcoal: black (BKN, SAS) turns silver, and the darkest
// navies are lifted toward ink so they still read.
const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const swatch = team => {
  const c = teamColor(team)
  if (!c) return FAINT
  if (c === '#000000') return '#c4ced4'
  return luminance(c) < 0.03 ? `color-mix(in oklab, ${c}, ${INK} 35%)` : c
}

const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
// '2015–16' -> '’16'
const yy = s => `’${s.slice(-2)}`
const span = p => (p.seasons[0] === p.seasons[1] ? yy(p.seasons[0]) : `${yy(p.seasons[0])}—${yy(p.seasons[1])}`)
const signed = v => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1).replace('-', '−')}`)
const firstName = name => name.split(' ')[0]
const lastName = name => name.split(' ').slice(1).join(' ') || name
// A surname at the tile's size, shrunk (to 10px at the least) to fit the tile: its width
// measured once on a canvas (no page layout) and the tile's width read from one shared
// ResizeObserver (whose callbacks come after layout), so 219 names cost no reflows.
// Re-fit when the webfont arrives and when a tile changes width.
const NAME_PX = 17
const canvas = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
const textWidth = text => {
  canvas.font = `800 ${NAME_PX}px Montserrat, sans-serif`
  // The name's -.01em letter spacing.
  return canvas.measureText(text.toUpperCase()).width - 0.01 * NAME_PX * text.length
}
const fitters = new WeakMap()
const sizer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(entries => entries.forEach(e => fitters.get(e.target)?.(e.contentRect.width))) : null
function FitName({ text }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    let width = 0
    const fit = w => {
      width = w ?? width
      if (!width) return
      el.style.fontSize = `${Math.max(10, Math.min(NAME_PX, Math.floor((2 * NAME_PX * width) / textWidth(text)) / 2))}px`
    }
    fitters.set(el, fit)
    sizer.observe(el)
    if (document.fonts) document.fonts.ready.then(() => fit())
    return () => sizer.unobserve(el)
  }, [text])
  return <span ref={ref} style={{ fontSize: NAME_PX, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-.01em', lineHeight: '20px', height: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
}
const low = v => v !== null && v < 0
const best = p => (p.bestSeason ? p.bestSeason.bpm : null)
const bestYear = p => (p.bestSeason ? yy(p.bestSeason.season) : '—')
const byBest = (a, b) => (best(b) ?? -99) - (best(a) ?? -99)
// A past player is shown as his best season: its team and year, marked PEAK in the bio
// card's ARCHIVE tone (RecentShift.jsx) where an active player has his span and live dot.
const PEAK = '#c9b994'
const pastBest = p => (!p.active && p.bestSeason) || null
const teamOf = p => (pastBest(p) ? pastBest(p).team : p.team)

// Best-season BPM as a 10-segment meter from −4 to +10.
const METER = [-4, 10]
const lit = v => (v === null ? 0 : Math.max(0, Math.min(10, Math.round(((v - METER[0]) / (METER[1] - METER[0])) * 10))))

function TeamChip({ team }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#b8b2ab' }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, background: swatch(team), flex: 'none' }} />
      {team || '—'}
    </span>
  )
}

function Meter({ value }) {
  const n = lit(value)
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ width: 4, height: 9, background: i < n ? (low(value) ? '#fa962a' : INK) : RULE }} />
      ))}
    </span>
  )
}

// A team's logo as its filter: the white logo at rest, the colour one on hover or when
// picked (pick it again to clear); while one is picked the rest fade back. The row uses
// the logos' 56px copies (logos/sm/): the full ones would come to 900KB, ahead of the faces.
function TeamLogo({ team, on, faded, onClick }) {
  const img = { position: 'absolute', inset: 0, margin: 'auto', width: 26, height: 26, objectFit: 'contain' }
  return (
    <button type="button" className="idx-logo" aria-pressed={on} aria-label={team} title={team} onClick={onClick}
      style={{ position: 'relative', height: 44, padding: 0, background: on ? '#2f2c2a' : 'transparent', border: `1px solid ${on ? INK : 'transparent'}`, cursor: 'pointer', opacity: faded ? 0.3 : 1 }}>
      <img className="idx-logo-mono" src={asset(`logos/sm/${team}.webp`)} alt="" style={img} />
      <img className="idx-logo-color" src={asset(`logos/color/sm/${team}.webp`)} alt="" style={img} />
    </button>
  )
}

// Headshots load small first: the 100px image (a sixth of the bytes) fades in as soon as
// it arrives, the first screen's eagerly and in order (`order` staggers the fade), the
// rest as they scroll near; a catalogue tile then swaps in its 400px image over it,
// fetched only once the small one shows, so the small ones never wait behind them. (The
// delay is the fade's only: a tile's image also transitions its hover zoom, index.css.)
const cover = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%', display: 'block' }
// Four rows of the widest grid (9 a row): a desktop's first screen.
const EAGER = 36
// `carry`: the portrait the view transition takes into the opened page's header.
function Face({ player, size, square, order = EAGER, onShown, carry = false }) {
  const [failed, setFailed] = useState(false)
  const [small, setSmall] = useState(false)
  const [large, setLarge] = useState(false)
  const show = player.headshot && !failed
  const url = px => headshotUrl(player.slug, px, player.headshotVersion, player.headshot)
  const eager = order < EAGER
  return (
    <span className="idx-face" style={{ position: 'relative', display: 'block', width: square ? '100%' : size, height: square ? 'auto' : size, aspectRatio: '1 / 1', overflow: 'hidden', background: show ? PORTRAIT_BG : '#34312e', flex: 'none', viewTransitionName: carry ? 'player-portrait' : undefined }}>
      {show
        ? <>
            <img src={url(100)} alt="" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" onLoad={() => { setSmall(true); onShown?.() }} onError={() => setFailed(true)}
              className={small ? 'idx-in' : 'idx-wait'} style={{ ...cover, transitionDelay: small && eager && square ? `${order * 8}ms, 0ms` : '0ms' }} />
            {square && small && <img src={url(400)} alt="" decoding="async" onLoad={() => setLarge(true)} className={large ? 'idx-in' : 'idx-wait'} style={cover} />}
            {/* Jersey art is drawn in one jersey; his team on the tile is laid over it. */}
            {small && player.layers && <JerseyOverlay slug={player.slug} size={square ? 400 : 100} layers={player.layers} id={teamOf(player)} />}
          </>
        : <TeamInitials name={player.name} team={player.team} fontSize={square ? 40 : 9} />}
    </span>
  )
}

// What a link hands the player's page: what to show while it loads (ProfileLoading), and
// the season to open on: his best, or none (his latest) if he's active.
const previewOf = p => ({ preview: { name: p.name, headshot: p.headshot, headshotVersion: p.headshotVersion }, season: p.active || !p.bestSeason ? undefined : p.bestSeason.season })

// Opening a player, app-like: his profile is fetched from the hover (or touch) on; the
// click waits for it (OPEN_WAIT_MS at most), the tile running a line of progress, and the
// page then arrives whole, his portrait carried from the tile into the header by a view
// transition (index.css; BioCard's portrait has the same name). A click meant for a new
// tab is left alone.
const OPEN_WAIT_MS = 1500
function useOpen(p, to) {
  const navigate = useNavigate()
  const { playoffs } = useSeasonType()
  const [opening, setOpening] = useState(false)
  const warm = () => prefetchProfile(p.slug, playoffs)
  const open = e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    if (opening) return
    setOpening(true)
    const wait = new Promise(resolve => setTimeout(resolve, OPEN_WAIT_MS))
    Promise.race([fetchProfile(p.slug, playoffs).catch(() => null), wait]).then(() => navigate(to, { state: previewOf(p), viewTransition: true }))
  }
  return { opening, events: { onPointerEnter: warm, onTouchStart: warm, onFocus: warm, onClick: open } }
}

// A portrait in the catalogue: team and seasons over the portrait (a past player's best
// season, its team and year), then the name and his best season's BPM on the meter. The LED is lit for players in the latest season.
function Tile({ player: p, to, order, onShown }) {
  const { opening, events } = useOpen(p, to)
  return (
    <Link to={to} state={previewOf(p)} {...events} className={order < EAGER ? 'idx-tile' : 'idx-tile idx-later'} style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: '#262422', color: INK, minWidth: 0, border: `1px solid ${RULE}`, margin: '0 -1px -1px 0' }}>
      <span className="idx-tile-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
        <TeamChip team={teamOf(p)} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, color: DIM }}>
          {pastBest(p)
            ? <span className="idx-tile-span" title="Not active: shown at his best season"><span style={{ fontSize: 8.5, letterSpacing: '.16em', color: PEAK, marginRight: 5 }}>PEAK</span>{bestYear(p)}</span>
            : <>
                <span className="idx-tile-span">{span(p)}</span>
                <span title={p.active ? 'Active' : 'Not active'} className={p.active ? 'idx-live' : undefined} style={{ width: 6, height: 6, borderRadius: '50%', background: p.active ? 'var(--accent)' : 'transparent', border: `1px solid ${p.active ? 'var(--accent)' : FAINT}` }} />
              </>}
        </span>
      </span>
      <Face player={p} square order={order} onShown={onShown} carry={opening} />
      <span className="idx-tile-foot" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 10px 12px', borderTop: `1px solid ${RULE}` }}>
        <span style={{ ...label, letterSpacing: '.08em' }}>{firstName(p.name)}</span>
        <FitName text={lastName(p.name)} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={label}>{pastBest(p) ? 'BPM' : `BPM ${bestYear(p)}`}</span>
          <span className="idx-tile-meter" style={{ display: 'contents' }}><Meter value={best(p)} /></span>
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, fontWeight: 600, color: low(best(p)) ? '#fa962a' : INK }}>{signed(best(p))}</span>
        </span>
      </span>
      {opening && <span aria-hidden="true" className="idx-opening" />}
    </Link>
  )
}

// A line in the parts list.
function Row({ player: p, to }) {
  const { opening, events } = useOpen(p, to)
  return (
    <Link to={to} state={previewOf(p)} {...events} className="idx-row idx-later-row" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) 48px 30px 44px', gap: 10, alignItems: 'center', height: 32, padding: '0 4px', borderBottom: `1px solid ${RULE}`, color: INK }}>
      <Face player={p} size={22} carry={opening} />
      <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
      <TeamChip team={teamOf(p)} />
      <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{bestYear(p)}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, textAlign: 'right', color: low(best(p)) ? '#fa962a' : '#b8b2ab' }}>{signed(best(p))}</span>
      {opening && <span aria-hidden="true" className="idx-opening" />}
    </Link>
  )
}

function Section({ title, count, children }) {
  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ ...label, color: INK, fontWeight: 600 }}>{title}</span>
        <span style={{ flex: 1, height: 1, background: RULE }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{count.toLocaleString()}</span>
      </div>
      {children}
    </section>
  )
}

export default function PlayerIndex() {
  const { playerPath } = useSeasonType()
  const [players, setPlayers] = useState(null)
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState(null)
  useEffect(() => { fetchPlayers().then(list => setPlayers(list || [])) }, [])
  // The first screen of tiles renders as soon as the list arrives; the rest of the tiles
  // wait for its faces to show (2.5s at the most), since the first faces otherwise wait on
  // rendering the rest, transition or not. A search or a team renders them at once.
  const [full, setFull] = useState(false)
  const shown = useRef(0)
  // The search takes the keyboard on arrival only where there's a pointer: on a phone a
  // focused box would open the on-screen keyboard over the portraits.
  const search = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) search.current?.focus()
  }, [])
  const showAll = () => startTransition(() => setFull(true))
  const onShown = () => {
    shown.current += 1
    if (shown.current === EAGER) showAll()
  }
  useEffect(() => {
    if (!players) return
    const t = setTimeout(showAll, 2500)
    return () => clearTimeout(t)
  }, [players])

  // A team code typed into the search works like its logo.
  const q = fold(query.trim())
  const typedTeam = TEAMS.find(t => fold(t) === q)
  // A team matches the team a tile shows: a past player's best season's.
  const matches = (players || []).filter(p => (!team || teamOf(p) === team) && (!q || fold(p.name).includes(q) || (typedTeam && teamOf(p) === typedTeam))).sort(byBest)
  const portraits = matches.filter(p => ILLUSTRATED.has(p.headshot))
  const rest = matches.filter(p => !ILLUSTRATED.has(p.headshot))
  const all = full || !!q || !!team

  return (
    <main className="page-main" style={{ maxWidth: 1440, margin: '0 auto', padding: '20px var(--page-pad) 64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${EDGE}` }}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none', color: DIM }}>
          <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.3 10.3 15 15" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <input ref={search} className="idx-input" aria-label="Search players" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" spellCheck={false}
          style={{ flex: 1, minWidth: 0, padding: '18px 0', background: 'transparent', border: 'none', color: INK, fontFamily: MONO, fontSize: 'clamp(16px, 2vw, 22px)', letterSpacing: '.02em', outline: 'none', caretColor: 'var(--accent)' }} />
        <Link to="/leaderboard" style={{ ...label, flex: 'none', color: INK, border: `1px solid ${EDGE}`, padding: '7px 10px' }}>Leaderboard →</Link>
      </div>
      <div className="idx-logos-wrap" style={{ padding: '12px 0 4px' }}>
        <div role="group" aria-label="Filter by team" className="idx-logos">
          {TEAMS.map(t => <TeamLogo key={t} team={t} on={team === t} faded={!!team && team !== t} onClick={() => setTeam(team === t ? null : t)} />)}
        </div>
      </div>

      {portraits.length > 0 && (
        <Section title="Illustrated" count={portraits.length}>
          {/* Tiles share their 1px edges (each overlaps the next by 1px), so a short last row leaves empty cells blank. */}
          <div className="idx-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', paddingRight: 1, paddingBottom: 1 }}>
            {(all ? portraits : portraits.slice(0, EAGER)).map((p, i) => <Tile key={p.slug} player={p} to={playerPath(p.slug)} order={i} onShown={onShown} />)}
          </div>
        </Section>
      )}

      {(q || team) && rest.length > 0 && (
        <Section title={portraits.length ? 'Everyone else' : 'Players'} count={rest.length}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', columnGap: 28 }}>
            {rest.map(p => <Row key={p.slug} player={p} to={playerPath(p.slug)} />)}
          </div>
        </Section>
      )}

      {players && matches.length === 0 && (
        <div style={{ marginTop: 36, padding: '28px 0', border: `1px dashed ${EDGE}`, textAlign: 'center', fontFamily: MONO, fontSize: 12, letterSpacing: '.08em', color: DIM }}>NO PLAYERS MATCH</div>
      )}

      <footer style={{ marginTop: 48, paddingTop: 14, borderTop: `1px solid ${EDGE}`, display: 'flex', gap: 22, flexWrap: 'wrap', ...label, fontSize: 9 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />Active (in the latest season)</span>
        <span>BPM = best season (800+ min) · <span style={{ color: PEAK }}>PEAK</span> = a past player, shown and opened at his best · meter {METER[0]} to +{METER[1]}</span>
        <span>thinkingbasketball.net</span>
      </footer>
    </main>
  )
}
