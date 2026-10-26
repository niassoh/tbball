import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchLeaderboard, fetchLeaderboardSeasons, fetchPlayers, fetchProfile, headshotUrl, loadTeams, prefetchProfile } from './api.js'
import { fmt, MONO } from './lib/format.js'
import { jerseyIn } from './lib/jersey.js'
import { TEAM_COLORS, teamColor } from './lib/teams.js'
import { asset } from './lib/static.js'
import TeamInitials from './components/TeamInitials.jsx'
import JerseyOverlay from './components/JerseyOverlay.jsx'
import Wink from './components/Wink.jsx'
import { useSeasonType } from './useSeasonType.js'
import BrandMark from './components/BrandMark.jsx'
import SiteNav from './components/SiteNav.jsx'
import ModeSwitch from './components/ModeSwitch.jsx'
import { depthTiers, franchisePlayers, PEAKS, peakSeasons, seasonRows, topSeasons } from './lib/library.js'
import Popover from './components/Popover.jsx'

// The player index: a search line (and the way to the Leaderboard) and the 30 teams'
// logos to filter by, then the
// illustrated portraits (the generated art) as a catalogue, each as his best season (his
// regular season with the highest BPM among those with 800+ minutes): its team, year,
// jersey and BPM, and a link opening on it. Everyone else, a parts list, shows only for a
// search or a team. A team shows its franchise's best players instead, each as his best
// season there, and a player with several of its best seasons as a collection that opens
// into them (lib/library.js), and under them everyone else who had a qualified season
// there, by decade. CURRENT is the players active now, as they are now; a team's,
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
// The value shown: a board season's stat (`v`), else his profile's best-season BPM.
const best = p => (p.bestSeason ? (p.bestSeason.v ?? p.bestSeason.bpm) : null)
const bestYear = p => (p.bestSeason ? yy(p.bestSeason.season) : '—')
// A tile pinned to one season (ALL-TIME's; `bestSeason` is that season) shows it: its team
// and year.
const pastBest = p => (p.pinned && p.bestSeason) || null
const teamOf = p => (pastBest(p) ? pastBest(p).team : p.team)

// What the tiles measure (`m`): BPM, or the stat ALL-TIME ranks peaks by. Its 10-segment
// meter runs over `scale`, in rank terms (higher better: −v where lower is better), BPM's
// from −4 to +10, another stat's from the 2nd percentile of qualified seasons to the best.
// A relative stat below average shows orange.
const BPM = { label: 'BPM', meta: { dec: 1, relative: true }, down: false, scale: [-4, 10] }
const rank = (v, m) => (v === null ? -1e9 : m.down ? -v : v)
const lit = (v, m) => (v === null ? 0 : Math.max(0, Math.min(10, Math.round(((rank(v, m) - m.scale[0]) / (m.scale[1] - m.scale[0])) * 10))))
const low = (v, m) => m.meta.relative && v !== null && v < 0
const shown = (v, m) => fmt(m.meta, v)
const byValue = m => (a, b) => rank(best(b), m) - rank(best(a), m)

function TeamChip({ team }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#b8b2ab' }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, background: swatch(team), flex: 'none' }} />
      {team || '—'}
    </span>
  )
}

// `small`: the roster's, at half the width.
function Meter({ value, m, small = false }) {
  const n = lit(value, m)
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: small ? 1 : 2 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ width: small ? 2 : 4, height: small ? 8 : 9, background: i < n ? (low(value, m) ? '#fa962a' : INK) : RULE }} />
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
// best season's BPM on the meter (none without a qualified season), or the stat ALL-TIME
// ranks by (`m`), named only by the picker above. A current player's
// tile has his span and the LED (lit for players in the latest season); a season's, its
// year (the year a live LED would misread), and a team's seasons (`season`) carry it as a
// headline, a player's several tiles told apart by it.
function Tile({ player: p, to, order, onShown, season, carry, m = BPM }) {
  const { opening, events } = useOpen(p, to)
  return (
    <Link to={to} state={previewOf(p)} {...events} className={order < EAGER ? 'idx-tile' : 'idx-tile idx-later'} style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: '#262422', color: INK, minWidth: 0, border: `1px solid ${RULE}`, margin: '0 -1px -1px 0' }}>
      <span className="idx-tile-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
        <TeamChip team={teamOf(p)} />
        {season
          ? <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1, color: INK }}>{bestYear(p)}</span>
          : pastBest(p)
            ? <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{bestYear(p)}</span>
            : <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, color: DIM }}>
                <span className="idx-tile-span">{span(p)}</span>
                <span title={p.active ? 'Active' : 'Not active'} style={{ width: 6, height: 6, borderRadius: '50%', background: p.active ? 'var(--accent)' : 'transparent', border: `1px solid ${p.active ? 'var(--accent)' : FAINT}`, boxShadow: p.active ? GLOW : 'none' }} />
              </span>}
      </span>
      <Face player={p} square order={order} onShown={onShown} carry={opening || carry} />
      <span className="idx-tile-foot" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 10px 12px', borderTop: `1px solid ${RULE}` }}>
        <span style={{ ...label, letterSpacing: '.08em' }}>{firstName(p.name)}</span>
        <FitName text={lastName(p.name)} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {m === BPM && <span style={label}>{best(p) === null || pastBest(p) ? 'BPM' : `BPM ${bestYear(p)}`}</span>}
          {best(p) !== null && <span className="idx-tile-meter" style={{ display: 'contents' }}><Meter value={best(p)} m={m} /></span>}
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, fontWeight: 600, color: low(best(p), m) ? '#fa962a' : INK }}>{shown(best(p), m)}</span>
        </span>
      </span>
      {opening && <span aria-hidden="true" className="idx-opening" />}
    </Link>
  )
}

// A line in the parts list.
function Row({ player: p, to, m = BPM }) {
  const { opening, events } = useOpen(p, to)
  return (
    <Link to={to} state={previewOf(p)} {...events} className="idx-row idx-later-row" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) 48px 30px 44px', gap: 10, alignItems: 'center', height: 32, padding: '0 4px', borderBottom: `1px solid ${RULE}`, color: INK }}>
      <Face player={p} size={22} carry={opening} />
      <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
      <TeamChip team={teamOf(p)} />
      <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{bestYear(p)}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, textAlign: 'right', color: low(best(p), m) ? '#fa962a' : '#b8b2ab' }}>{shown(best(p), m)}</span>
      {opening && <span aria-hidden="true" className="idx-opening" />}
    </Link>
  )
}

// A team's everyone else (ALL-TIME): every player with a qualified season there, as his
// best one, best first, each row keeping his rank in the whole list (`rank`, a search or
// not): a dense index of rows, each with his face. Split, a column per decade of that
// season (on a phone two abreast); collapsed, one list down four columns (two on a phone).
// The switch is the heading's dim type, the view on in ink.
const VIEWS = [['split', 'Decades'], ['all', 'All-time']]
function Roster({ list, playerPath, m }) {
  const [view, setView] = useState('split')
  const decades = [...new Set(list.map(decadeOf))].sort()
  const head = (title, count) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 4px 8px', borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${EDGE}` }}>
      <span style={{ fontSize: 'clamp(20px, 1.7vw, 24px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1, color: INK }}>{title}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{count}</span>
    </div>
  )
  return (
    <>
      <div role="group" aria-label="Roster view" style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginBottom: 8 }}>
        {VIEWS.map(([v, name]) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
            style={{ ...label, padding: 0, border: 0, background: 'transparent', color: view === v ? INK : DIM, fontWeight: view === v ? 600 : 400, cursor: 'pointer' }}>{name}</button>
        ))}
      </div>
      {view === 'all'
        ? (
          <div className="idx-roster">
            {head('All-time', list.length)}
            <div className="idx-alltime" style={{ columns: 4, columnGap: 24 }}>
              {list.map(p => <ListRow key={p.slug} player={p} to={playerPath(p.slug)} m={m} />)}
            </div>
          </div>
        )
        : (
          <div className="idx-roster idx-decades" style={{ display: 'grid', gridTemplateColumns: `repeat(${decades.length}, minmax(0, 1fr))`, columnGap: 24, alignItems: 'start' }}>
            {decades.map(d => {
              const own = list.filter(p => decadeOf(p) === d)
              return (
                <div key={d} style={{ minWidth: 0 }}>
                  {head(`’${d.slice(2)}s`, own.length)}
                  {own.map(p => <ListRow key={p.slug} player={p} to={playerPath(p.slug)} m={m} />)}
                </div>
              )
            })}
          </div>
        )}
    </>
  )
}
const decadeOf = p => `${p.bestSeason.season.slice(0, 3)}0`

// A line in a team's roster: his rank, face, initial and surname, best season and its
// value (`m`). The face is the one carried into his page when it opens.
function ListRow({ player: p, to, m }) {
  const { opening, events } = useOpen(p, to)
  const Root = p.stub ? 'span' : Link
  const link = p.stub ? {} : { to, state: previewOf(p), ...events }
  return (
    <Root {...link} className="idx-row idx-list-row"
      style={{ position: 'relative', display: 'grid', gridTemplateColumns: '18px 28px minmax(0, 1fr) 24px 29px 30px', gap: 8, alignItems: 'center', height: 34, padding: '0 4px', borderBottom: `1px solid ${RULE}`, color: p.stub ? DIM : INK }}>
      <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT }}>{String(p.rank).padStart(2, '0')}</span>
      <Face player={p} size={28} carry={opening} />
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{firstName(p.name)[0]}. </span>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-.01em' }}>{lastName(p.name)}</span>
      </span>
      <span className="idx-list-year" style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{bestYear(p)}</span>
      <span className="idx-tile-meter" style={{ display: 'flex' }}><Meter value={best(p)} m={m} small /></span>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, textAlign: 'right', color: low(best(p), m) ? '#fa962a' : INK }}>{shown(best(p), m)}</span>
      {opening && <span aria-hidden="true" className="idx-opening" />}
    </Root>
  )
}

function Section({ title, lead, count, controls, children }) {
  return (
    <section style={{ marginTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ ...label, color: INK, fontWeight: 600 }}>{title}</span>
        {lead}
        <span style={{ flex: 1, height: 1, background: RULE }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{count.toLocaleString()}</span>
        {controls}
      </div>
      {children}
    </section>
  )
}

// Every season board (lib/library.js), fetched once a session on the first team or stat
// picked: some 4MB gzipped, the 31 boards being the only export with every player's season
// by team.
let seasonsRequest = null
const loadSeasons = () => {
  seasonsRequest = seasonsRequest || fetchLeaderboardSeasons()
    .then(d => Promise.all(d.seasons.map(s => fetchLeaderboard(s).catch(() => null))))
    .then(docs => docs.filter(Boolean))
    .catch(err => { seasonsRequest = null; throw err })
  return seasonsRequest
}
const MODES = [['all', 'All-time'], ['current', 'Current']]

// The stat ALL-TIME ranks peaks by, beside the first section's title and in its type, dim
// and unboxed (only its caret says it opens): a short list, the one picked lit; a pick
// closes it. It stands no taller than the line.
function StatPicker({ stat, setStat }) {
  return (
    <span style={{ display: 'flex', margin: '-4px 0 -4px -12px' }}>
      <Popover name={`Peaks by ${stat}`} minWidth={0} accent="transparent" trigger={<span style={{ ...label, fontWeight: 400 }}>{stat}</span>}>
        {close => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 }}>
            {PEAKS.map(l => (
              <button key={l} type="button" className="idx-row" aria-pressed={l === stat} onClick={() => { setStat(l); close() }}
                style={{ padding: '5px 8px', border: 0, background: l === stat ? INK : 'transparent', color: l === stat ? '#262422' : INK, fontFamily: MONO, fontSize: 11, fontWeight: l === stat ? 700 : 400, textAlign: 'left', whiteSpace: 'nowrap', cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        )}
      </Popover>
    </span>
  )
}
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gridAutoFlow: 'dense', paddingRight: 1, paddingBottom: 1 }

export default function PlayerIndex() {
  const { playerPath } = useSeasonType()
  const [players, setPlayers] = useState(null)
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState(null)
  const [mode, setMode] = useState('all')
  const [stat, setStat] = useState('BPM')
  // The season boards, each team's best seasons by a stat once built ('LAL|BPM'), and the
  // depth charts.
  const [docs, setDocs] = useState(null)
  const [best, setBest] = useState({})
  const [teams, setTeams] = useState(null)
  useEffect(() => { fetchPlayers().then(list => setPlayers(list || [])) }, [])
  const bySlug = useMemo(() => new Map((players || []).map(p => [p.slug, p])), [players])
  // ALL-TIME without a team: each player as his best season, in its jersey where his own
  // jerseys tell which (jerseyIn), else his team's latest he has.
  const peaks = useMemo(() => (players || []).map(p => (p.bestSeason ? { ...p, pinned: true, jersey: jerseyIn(p.layers, p.bestSeason.team) } : p)), [players])
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

  // ALL-TIME's peaks by a stat other than BPM, and a team's, come from the boards; BPM's
  // without a team from the profiles.
  const boards = mode === 'all' && (!!pick || stat !== 'BPM')
  useEffect(() => {
    if (boards && !docs) loadSeasons().then(setDocs, () => setDocs([]))
  }, [boards, docs])
  const rows = useMemo(() => docs && seasonRows(docs, stat), [docs, stat])
  const measure = useMemo(() => {
    if (stat === 'BPM' || !rows?.length) return BPM
    const meta = docs[docs.length - 1].stats[stat]
    const ranks = rows.map(r => r.s).sort((a, b) => a - b)
    return { label: stat, meta, down: !!meta.lowerBetter, scale: [ranks[Math.floor(ranks.length * 0.02)], ranks[ranks.length - 1]] }
  }, [stat, rows, docs])
  const m = mode === 'all' ? measure : BPM
  const at = `${pick}|${stat}`
  // A team's best seasons arrive whole: each player in that season's jersey, which only his
  // profile knows (the era a season fell in), so the dressed players' profiles come first
  // (warming their links too).
  useEffect(() => {
    if (mode !== 'all' || !pick || !rows || !players || best[at]) return
    const top = topSeasons(rows, pick).filter(r => bySlug.has(r.slug))
    const dressed = [...new Set(top.filter(r => bySlug.get(r.slug).layers).map(r => r.slug))]
    Promise.all(dressed.map(s => fetchProfile(s).catch(() => null))).then(profiles => {
      const jerseys = new Map(dressed.map((s, k) => [s, profiles[k]]))
      const jerseyOf = r => jerseys.get(r.slug)?.seasons.find(s => s.season === r.season)?.jersey
      const pinned = r => ({ ...bySlug.get(r.slug), bestSeason: { season: r.season, v: r.v, team: r.team }, pinned: true, jersey: jerseyOf(r) })
      setBest(b => ({ ...b, [at]: top.map(pinned) }))
    })
  }, [mode, pick, rows, players, bySlug, best, at])
  const roster = useMemo(() => (pick && rows ? franchisePlayers(rows, pick) : null), [pick, rows])
  // Without a team, each player at his peak by the stat, in its jersey as `peaks`.
  const statPeaks = useMemo(() => (stat === 'BPM' || !rows ? null : peakSeasons(rows).filter(r => bySlug.has(r.slug)).map(r => {
    const p = bySlug.get(r.slug)
    return { ...p, bestSeason: { season: r.season, v: r.v, team: r.team }, pinned: true, jersey: jerseyIn(p.layers, r.team) }
  })), [stat, rows, bySlug])
  useEffect(() => {
    if (mode === 'current' && pick && !teams) loadTeams().then(setTeams, () => setTeams([]))
  }, [mode, pick, teams])

  const named = p => !q || typedTeam || fold(p.name).includes(q)
  const chart = mode === 'current' && pick && teams ? teams.find(t => t.team === pick) : null
  // On the depth chart he's on its team, whichever the index last saw him with; one with
  // no headshot yet is left off, as the chart is a wall of faces.
  const tiers = chart ? depthTiers(chart.depth).map(tier => tier.map(d => bySlug.get(d.slug)).filter(p => p && p.headshot && named(p)).map(p => ({ ...p, team: pick }))) : null
  const pool = mode === 'current' ? (pick ? null : players?.filter(p => p.active)) : pick ? best[at] : stat === 'BPM' ? peaks : statPeaks
  const matches = (pool || []).filter(named).sort(byValue(m))
  const portraits = matches.filter(p => ILLUSTRATED.has(p.headshot))
  const rest = matches.filter(p => !ILLUSTRATED.has(p.headshot))
  const all = full || !!q || !!team
  const key = p => (p.pinned ? `${p.slug}|${p.bestSeason.season}` : p.slug)
  // A team's everyone else: the franchise's whole roster but the tiles' players.
  const tiled = new Set(portraits.map(p => p.slug))
  const listed = mode === 'all' && pick && best[at] && roster
    ? roster.filter(r => !tiled.has(r.slug)).map((r, i) => ({ ...(bySlug.get(r.slug) || { slug: r.slug, name: r.name, headshot: null, stub: true }), bestSeason: { season: r.season, v: r.v, team: r.team }, pinned: true, jersey: jerseyIn(bySlug.get(r.slug)?.layers, r.team), rank: i + 1 })).filter(named)
    : null
  // No caption: All-time or Current, in the first section's line, standing no taller than it.
  const toggle = <span style={{ display: 'flex', margin: '-6px 0' }}><ModeSwitch name="Players" options={MODES} mode={mode} setMode={setMode} height={22} /></span>
  const picker = mode === 'all' && <StatPicker stat={stat} setStat={setStat} />
  const edge = k => fmt({ ...m.meta, dec: 0 }, m.down ? -m.scale[k] : m.scale[k])

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

      {!tiers && players && (portraits.length > 0 || !rest.length || (mode === 'all' && pick)) && (
        <Section title="Illustrated" lead={picker} count={portraits.length} controls={toggle}>
          {/* Tiles share their 1px edges (each overlaps the next by 1px), so a short last row leaves empty cells blank. */}
          <div className="idx-grid" style={grid}>
            {(all ? portraits : portraits.slice(0, EAGER)).map((p, i) => <Tile key={key(p)} player={p} to={playerPath(p.slug)} order={i} onShown={onShown} season={!!pick} m={m} />)}
          </div>
        </Section>
      )}

      {listed && listed.length > 0 && (
        <section aria-label="Everyone else" style={{ marginTop: 36 }}>
          <Roster list={listed} playerPath={playerPath} m={m} />
        </section>
      )}

      {!tiers && !listed && (q || pick) && rest.length > 0 && (
        <Section title={portraits.length ? 'Everyone else' : 'Players'} lead={portraits.length ? null : picker} count={rest.length} controls={portraits.length ? null : toggle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', columnGap: 28 }}>
            {rest.map(p => <Row key={key(p)} player={p} to={playerPath(p.slug)} m={m} />)}
          </div>
        </Section>
      )}

      {pool && !tiers && matches.length === 0 && (
        <div style={{ marginTop: 36, padding: '28px 0', border: `1px dashed ${EDGE}`, textAlign: 'center', fontFamily: MONO, fontSize: 12, letterSpacing: '.08em', color: DIM }}>NO PLAYERS MATCH</div>
      )}

      <footer style={{ marginTop: 48, paddingTop: 14, borderTop: `1px solid ${EDGE}`, display: 'flex', gap: 22, flexWrap: 'wrap', ...label, fontSize: 9 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: GLOW }} />Active (in the latest season)</span>
        <span>{m.label} = the season shown (800+ min) · meter {edge(0)} to {edge(1)}</span>
        <span>thinkingbasketball.net</span>
      </footer>
    </main>
  )
}
