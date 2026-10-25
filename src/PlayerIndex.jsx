import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchLeaderboard, fetchLeaderboardSeasons, fetchPlayers, fetchProfile, headshotUrl, loadTeams, prefetchProfile } from './api.js'
import { MONO } from './lib/format.js'
import { jerseyIn, reducedMotion } from './lib/jersey.js'
import { TEAM_COLORS, teamColor } from './lib/teams.js'
import { asset } from './lib/static.js'
import TeamInitials from './components/TeamInitials.jsx'
import JerseyOverlay from './components/JerseyOverlay.jsx'
import Wink from './components/Wink.jsx'
import { useSeasonType } from './useSeasonType.js'
import BrandMark from './components/BrandMark.jsx'
import SiteNav from './components/SiteNav.jsx'
import ModeSwitch from './components/ModeSwitch.jsx'
import { depthTiers, seasonRows, topSeasons } from './lib/library.js'

// The player index: a search line (and the way to the Leaderboard) and the 30 teams'
// logos to filter by, then the
// illustrated portraits (the generated art) as a catalogue, each as his best season (his
// regular season with the highest BPM among those with 800+ minutes): its team, year,
// jersey and BPM, and a link opening on it. Everyone else, a parts list, shows only for a
// search or a team. A team shows its franchise's best players instead, each as his best
// season there, and a player with several of its best seasons as a collection that opens
// into them (lib/library.js). CURRENT is the players active now, as they are now; a team's,
// its depth chart, starters a row of their own. The accent lights what's on. It has no playoffs switch (lib/mode.js modeless); its links open
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
const span = p => (!p.seasons ? '' : p.seasons[0] === p.seasons[1] ? yy(p.seasons[0]) : `${yy(p.seasons[0])}—${yy(p.seasons[1])}`)
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
// A tile pinned to one season (ALL-TIME's; `bestSeason` is that season) shows it: its team
// and year.
const pastBest = p => (p.pinned && p.bestSeason) || null
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
      style={{ position: 'relative', height: 44, padding: 0, background: on ? '#2f2c2a' : 'transparent', border: `1px solid ${on ? INK : 'transparent'}`, cursor: 'pointer', opacity: faded ? 0.6 : 1 }}>
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
// The active dot's soft glow, in the accent.
const GLOW = '0 0 5px 1px color-mix(in srgb, var(--accent) 55%, transparent)'
// `carry`: the portrait the view transition takes into the opened page's header. A player
// no longer active is half greyed, so the current ones stand out without the rest going dead.
function Face({ player, size, square, order = EAGER, onShown, carry = false }) {
  const [failed, setFailed] = useState(false)
  const [small, setSmall] = useState(false)
  const [large, setLarge] = useState(false)
  const show = player.headshot && !failed
  const url = px => headshotUrl(player.slug, px, player.headshotVersion, player.headshot)
  const eager = order < EAGER
  return (
    <span className="idx-face" style={{ position: 'relative', display: 'block', width: square ? '100%' : size, height: square ? 'auto' : size, aspectRatio: '1 / 1', overflow: 'hidden', background: show ? PORTRAIT_BG : '#34312e', flex: 'none', viewTransitionName: carry ? 'player-portrait' : undefined, filter: player.active ? undefined : 'grayscale(.55)' }}>
      {show
        ? <>
            <img src={url(100)} alt="" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" onLoad={() => { setSmall(true); onShown?.() }} onError={() => setFailed(true)}
              className={small ? 'idx-in' : 'idx-wait'} style={{ ...cover, transitionDelay: small && eager && square ? `${order * 8}ms, 0ms` : '0ms' }} />
            {square && small && <img src={url(400)} alt="" decoding="async" onLoad={() => setLarge(true)} className={large ? 'idx-in' : 'idx-wait'} style={cover} />}
            {/* Jersey art is drawn in one jersey; his team on the tile (a pinned season's jersey) is laid over it. */}
            {small && player.layers && <JerseyOverlay slug={player.slug} size={square ? 400 : 100} layers={player.layers} id={player.jersey || teamOf(player)} />}
            {square && small && <Wink slug={player.slug} />}
          </>
        : <TeamInitials name={player.name} team={player.team} fontSize={square ? 40 : 9} />}
    </span>
  )
}

// What a link hands the player's page: what to show while it loads (ProfileLoading), and
// the season to open on: his best, or none (his latest) if he's active.
const previewOf = p => ({ preview: { name: p.name, headshot: p.headshot, headshotVersion: p.headshotVersion }, season: pastBest(p) ? p.bestSeason.season : undefined })

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

// A portrait in the catalogue: team and seasons over the portrait, then the name and his
// best season's BPM on the meter (none without a qualified season). A current player's
// tile has his span and the LED (lit for players in the latest season); a season's, its
// year (the year a live LED would misread). A collection's tile (`set`, his seasons) is his
// best season with the set's span and its key, which opens the set (`open`: pressed, its
// outline running on into the open set). In an open set (`of`, the franchise) the season
// is the headline, with no head: his team shows, in place of the BPM label, only where it
// isn't the franchise's code (SEA for OKC).
function Tile({ player: p, to, order, onShown, set, open, onSet, dim, of }) {
  const { opening, events } = useOpen(p, to)
  const tile = (
    <Link to={to} state={previewOf(p)} {...events} className={order < EAGER ? 'idx-tile' : 'idx-tile idx-later'} style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: '#262422', color: INK, minWidth: 0, border: `1px solid ${open ? INK : RULE}`, borderBottomColor: open ? 'transparent' : RULE, margin: '0 -1px -1px 0', opacity: dim && !set ? 0.35 : undefined }}>
      {!of && <span className="idx-tile-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
        <TeamChip team={teamOf(p)} />
        {!set && (pastBest(p)
          ? <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{bestYear(p)}</span>
          : <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, color: DIM }}>
              <span className="idx-tile-span">{span(p)}</span>
              <span title={p.active ? 'Active' : 'Not active'} style={{ width: 6, height: 6, borderRadius: '50%', background: p.active ? 'var(--accent)' : 'transparent', border: `1px solid ${p.active ? 'var(--accent)' : FAINT}`, boxShadow: p.active ? GLOW : 'none' }} />
            </span>)}
      </span>}
      <Face player={p} square order={order} onShown={onShown} carry={opening} />
      <span className="idx-tile-foot" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 10px 12px', borderTop: `1px solid ${RULE}` }}>
        {!of && <span style={{ ...label, letterSpacing: '.08em' }}>{firstName(p.name)}</span>}
        <FitName text={of ? p.bestSeason.season.replace('-', '–') : lastName(p.name)} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {of && teamOf(p) !== of
            ? <TeamChip team={teamOf(p)} />
            : <span style={label}>{best(p) === null || (pastBest(p) && !set) ? 'BPM' : `BPM ${bestYear(p)}`}</span>}
          {best(p) !== null && <span className="idx-tile-meter" style={{ display: 'contents' }}><Meter value={best(p)} /></span>}
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, fontWeight: 600, color: low(best(p)) ? '#fa962a' : INK }}>{signed(best(p))}</span>
        </span>
      </span>
      {opening && <span aria-hidden="true" className="idx-opening" />}
    </Link>
  )
  if (!set) return tile
  // The key sits over the tile's head (a button can't go inside its link); pressed, it's lit.
  return (
    <span className="idx-set" style={{ position: 'relative', zIndex: open ? 1 : undefined, display: 'flex', flexDirection: 'column', minWidth: 0, opacity: dim ? 0.35 : undefined }}>
      {tile}
      <button type="button" className="idx-tile-head" aria-expanded={open} aria-label={`${p.name}: ${set.length} seasons`} onClick={onSet}
        style={{ position: 'absolute', top: 1, right: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', background: open ? INK : 'transparent', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, color: open ? '#262422' : DIM }}>
        <span className="idx-tile-span">{yy(set[0].bestSeason.season)}—{yy(set[set.length - 1].bestSeason.season)}</span>
        <Stack ink={open ? '#262422' : INK} back={open ? '#262422' : FAINT} />
        <span style={{ fontWeight: 600, color: open ? '#262422' : INK }}>{String(set.length).padStart(2, '0')}</span>
      </button>
    </span>
  )
}

// A collection's key: three cards, hairline, the back two peeking up and right.
function Stack({ ink, back }) {
  return (
    <span aria-hidden="true" style={{ position: 'relative', width: 13, height: 10, flex: 'none' }}>
      {[4, 2].map(d => <span key={d} style={{ position: 'absolute', left: d, top: 4 - d, width: 9, height: 6, borderTop: `1px solid ${back}`, borderRight: `1px solid ${back}` }} />)}
      <span style={{ position: 'absolute', left: 0, top: 4, width: 9, height: 6, border: `1px solid ${ink}` }} />
    </span>
  )
}

// A collection opened, a full row under its tile's row (the grid packs dense, so the tiles
// after it fill that row first): a box just wide enough for its seasons (wrapping at the
// grid's columns), centred under the tile and kept inside the grid. Its ink outline meets
// the open tile's, its top rule stopping at the tile's edges, so the set reads as coming
// out of it; the tile (the element before it) and the grid's columns are measured as the
// grid reflows. Its seasons come out from under the tile, each from the tile's centre
// (`from`, measured once they're laid out, before the first paint), staggered in season
// order with the last under 120ms in, and clipped at the box's top so none crosses the
// tiles beside it; `out`, it fades and then goes (`onGone`).
function SetRow({ set, of, playerPath, out, onGone }) {
  const ref = useRef(null)
  const box = useRef(null)
  const [at, setAt] = useState(null)
  const [from, setFrom] = useState(null)
  useLayoutEffect(() => {
    const el = ref.current
    const fit = () => {
      const a = el.getBoundingClientRect()
      const t = el.previousElementSibling.getBoundingClientRect()
      const cols = getComputedStyle(el.parentElement).gridTemplateColumns.split(' ')
      setAt({ width: a.width, cols: cols.length, col: parseFloat(cols[0]), left: t.left - a.left, right: t.right - a.left })
    }
    fit()
    const watch = new ResizeObserver(fit)
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  useLayoutEffect(() => {
    if (!at || from) return
    const t = ref.current.previousElementSibling.getBoundingClientRect()
    setFrom([...box.current.children].slice(0, set.length).map(el => {
      const r = el.getBoundingClientRect()
      return [(t.left + t.right - r.left - r.right) / 2, (t.top + t.bottom - r.top - r.bottom) / 2]
    }))
  }, [at, from, set.length])
  const step = Math.min(25, 120 / (set.length - 1))
  const per = at && Math.min(set.length, at.cols)
  const width = at && per * at.col
  const x = at && Math.max(0, Math.min(at.width - width, (at.left + at.right) / 2 - width / 2))
  const line = { position: 'absolute', top: 0, height: 1, background: INK }
  return (
    <div ref={ref} style={{ gridColumn: '1 / -1', padding: '0 0 14px' }}>
      {at && (
        <div ref={box} className={out ? 'idx-set-out' : undefined} onAnimationEnd={e => e.animationName === 'idx-set-out' && onGone()}
          style={{ position: 'relative', width, marginLeft: x, display: 'grid', gridTemplateColumns: `repeat(${per}, ${at.col}px)`, padding: '14px 0', clipPath: 'inset(0 -2px -2px -2px)' }}>
          {set.map((s, k) => (
            <span key={s.bestSeason.season} className={from ? 'idx-set-in' : undefined}
              style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...(from && { '--dx': `${from[k][0]}px`, '--dy': `${from[k][1]}px`, animationDelay: `${k * step}ms` }) }}>
              <Tile player={s} to={playerPath(s.slug)} order={0} of={of} />
            </span>
          ))}
          <span aria-hidden="true" style={{ position: 'absolute', inset: '0 -1px -1px 0', zIndex: 2, pointerEvents: 'none' }}>
            <span className="idx-frame-in" style={{ position: 'absolute', inset: 0, borderLeft: `1px solid ${INK}`, borderRight: `1px solid ${INK}`, borderBottom: `1px solid ${INK}` }} />
            <span style={{ ...line, left: -1, width: Math.max(0, at.left - x) }} />
            <span style={{ ...line, left: at.right - x - 1, right: -1 }} />
          </span>
        </div>
      )}
    </div>
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

function Section({ title, count, controls, children }) {
  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ ...label, color: INK, fontWeight: 600 }}>{title}</span>
        <span style={{ flex: 1, height: 1, background: RULE }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{count.toLocaleString()}</span>
        {controls}
      </div>
      {children}
    </section>
  )
}

// Every season board's qualified seasons (lib/library.js), fetched once a session on a
// team's first pick: some 4MB gzipped, the 31 boards being the only export with every
// player's season by team.
let seasonsRequest = null
const loadSeasons = () => {
  seasonsRequest = seasonsRequest || fetchLeaderboardSeasons()
    .then(d => Promise.all(d.seasons.map(s => fetchLeaderboard(s).catch(() => null))))
    .then(docs => seasonRows(docs.filter(Boolean)))
    .catch(err => { seasonsRequest = null; throw err })
  return seasonsRequest
}
const MODES = [['all', 'All-time'], ['current', 'Current']]
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gridAutoFlow: 'dense', paddingRight: 1, paddingBottom: 1 }

export default function PlayerIndex() {
  const { playerPath } = useSeasonType()
  const [players, setPlayers] = useState(null)
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState(null)
  const [mode, setMode] = useState('all')
  // Each team's best seasons once built, and the depth charts.
  const [best, setBest] = useState({})
  const [teams, setTeams] = useState(null)
  useEffect(() => { fetchPlayers().then(list => setPlayers(list || [])) }, [])
  const bySlug = useMemo(() => new Map((players || []).map(p => [p.slug, p])), [players])
  // ALL-TIME without a team: each player as his best season, in its jersey where his own
  // jerseys tell which (jerseyIn), else his team's latest he has.
  const peaks = useMemo(() => (players || []).map(p => (p.bestSeason ? { ...p, pinned: true, jersey: jerseyIn(p.layers, p.bestSeason.team) } : p)), [players])
  // The collection open, as team|slug, and the one closing (fading out); another opened
  // closes the last at once.
  const [open, setOpen] = useState(null)
  const [closing, setClosing] = useState(null)
  const flip = at => {
    setClosing(open === at && !reducedMotion() ? at : null)
    setOpen(open === at ? null : at)
  }
  useEffect(() => {
    if (!open) return
    const close = e => {
      if (e.key !== 'Escape') return
      setClosing(reducedMotion() ? null : open)
      setOpen(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])
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
  const pick = team || typedTeam

  // A team's best seasons arrive whole: each player in that season's jersey, which only his
  // profile knows (the era a season fell in), so the dressed players' profiles come first
  // (warming their links too).
  useEffect(() => {
    if (mode !== 'all' || !pick || !players || best[pick]) return
    loadSeasons().then(rows => {
      const top = topSeasons(rows, pick).filter(r => bySlug.has(r.slug))
      const dressed = [...new Set(top.filter(r => bySlug.get(r.slug).layers).map(r => r.slug))]
      return Promise.all(dressed.map(s => fetchProfile(s).catch(() => null))).then(profiles => {
        const jerseys = new Map(dressed.map((s, k) => [s, profiles[k]]))
        const jerseyOf = r => jerseys.get(r.slug)?.seasons.find(s => s.season === r.season)?.jersey
        const pinned = r => ({ ...bySlug.get(r.slug), bestSeason: { season: r.season, bpm: r.bpm, team: r.team }, pinned: true, jersey: jerseyOf(r) })
        setBest(b => ({ ...b, [pick]: top.map(r => ({ ...pinned(r), set: r.set.length > 1 ? r.set.map(pinned) : null })) }))
      })
    }).catch(() => setBest(b => ({ ...b, [pick]: [] })))
  }, [mode, pick, players, bySlug, best])
  useEffect(() => {
    if (mode === 'current' && pick && !teams) loadTeams().then(setTeams, () => setTeams([]))
  }, [mode, pick, teams])

  const named = p => !q || typedTeam || fold(p.name).includes(q)
  const chart = mode === 'current' && pick && teams ? teams.find(t => t.team === pick) : null
  // On the depth chart he's on its team, whichever the index last saw him with; one with
  // no headshot yet is left off, as the chart is a wall of faces.
  const tiers = chart ? depthTiers(chart.depth).map(tier => tier.map(d => bySlug.get(d.slug)).filter(p => p && p.headshot && named(p)).map(p => ({ ...p, team: pick }))) : null
  const pool = mode === 'current' ? (pick ? null : players?.filter(p => p.active)) : pick ? best[pick] : peaks
  const matches = (pool || []).filter(named).sort(byBest)
  const portraits = matches.filter(p => ILLUSTRATED.has(p.headshot))
  const rest = matches.filter(p => !ILLUSTRATED.has(p.headshot))
  const all = full || !!q || !!team
  const key = p => (p.pinned ? `${p.slug}|${p.bestSeason.season}` : p.slug)
  // No caption: All-time or Current, in the first section's line, standing no taller than it.
  const toggle = <span style={{ display: 'flex', margin: '-6px 0' }}><ModeSwitch name="Players" options={MODES} mode={mode} setMode={setMode} height={22} /></span>

  return (
    <main className="page-main" style={{ maxWidth: 1600, margin: '0 auto', padding: '0 var(--page-pad) 64px' }}>
      <div className="head-row" style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 'var(--head-h)', borderBottom: `1px solid ${EDGE}` }}>
        <BrandMark />
        <SiteNav at="players" />
        <span aria-hidden="true" style={{ flex: 'none', width: 1, height: 20, margin: '0 8px 0 auto', background: RULE }} />
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none', color: DIM }}>
          <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.3 10.3 15 15" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <input ref={search} className="idx-input" aria-label="Search players" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" spellCheck={false}
          style={{ width: 'clamp(110px, 22vw, 300px)', minWidth: 0, padding: '10px 0', background: 'transparent', border: 'none', color: INK, fontFamily: MONO, fontSize: 'clamp(16px, 2vw, 22px)', letterSpacing: '.02em', outline: 'none', caretColor: 'var(--accent)' }} />
      </div>
      <div className="idx-logos-wrap" style={{ padding: '12px 0 4px' }}>
        <div role="group" aria-label="Filter by team" className="idx-logos">
          {TEAMS.map(t => <TeamLogo key={t} team={t} on={team === t} faded={!!team && team !== t} onClick={() => setTeam(team === t ? null : t)} />)}
        </div>
      </div>

      {tiers && (
        <Section title={chart.name} count={tiers[0].length + tiers[1].length} controls={toggle}>
          {/* The bench starts a row of its own, under the starters. */}
          {tiers.map((tier, k) => (
            <div key={k} className="idx-grid" style={{ ...grid, marginTop: k ? 12 : 0 }}>
              {tier.map((p, i) => <Tile key={p.slug} player={p} to={playerPath(p.slug)} order={i} />)}
            </div>
          ))}
        </Section>
      )}

      {!tiers && players && (portraits.length > 0 || !rest.length) && (
        <Section title="Illustrated" count={portraits.length} controls={toggle}>
          {/* Tiles share their 1px edges (each overlaps the next by 1px), so a short last row leaves empty cells blank. */}
          <div className="idx-grid" style={grid}>
            {(all ? portraits : portraits.slice(0, EAGER)).map((p, i) => {
              const at = `${pick}|${p.slug}`
              const back = open && open.startsWith(`${pick}|`) && open !== at
              return [
                <Tile key={key(p)} player={p} to={playerPath(p.slug)} order={i} onShown={onShown} set={p.set} open={open === at} dim={back} onSet={() => flip(at)} />,
                (open === at || closing === at) && p.set && <SetRow key={`${key(p)}+`} set={p.set} of={pick} playerPath={playerPath} out={closing === at} onGone={() => setClosing(null)} />
              ]
            })}
          </div>
        </Section>
      )}

      {!tiers && (q || pick) && rest.length > 0 && (
        <Section title={portraits.length ? 'Everyone else' : 'Players'} count={rest.length} controls={portraits.length ? null : toggle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', columnGap: 28 }}>
            {rest.map(p => <Row key={key(p)} player={p} to={playerPath(p.slug)} />)}
          </div>
        </Section>
      )}

      {pool && !tiers && matches.length === 0 && (
        <div style={{ marginTop: 36, padding: '28px 0', border: `1px dashed ${EDGE}`, textAlign: 'center', fontFamily: MONO, fontSize: 12, letterSpacing: '.08em', color: DIM }}>NO PLAYERS MATCH</div>
      )}

      <footer style={{ marginTop: 48, paddingTop: 14, borderTop: `1px solid ${EDGE}`, display: 'flex', gap: 22, flexWrap: 'wrap', ...label, fontSize: 9 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: GLOW }} />Active (in the latest season)</span>
        <span>BPM = the season shown (800+ min) · meter {METER[0]} to +{METER[1]}</span>
        <span>thinkingbasketball.net</span>
      </footer>
    </main>
  )
}
