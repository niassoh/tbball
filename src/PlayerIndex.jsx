import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPlayers, headshotUrl } from './api.js'
import { MONO } from './lib/format.js'
import { TEAM_COLORS } from './lib/teams.js'
import TeamInitials from './components/TeamInitials.jsx'
import SeasonToggle from './components/SeasonToggle.jsx'
import { useSeasonType } from './useSeasonType.js'

// The player index, laid out like a piece of hardware: a spec sheet, a display to type a
// name into, a keypad of the 30 teams, then the illustrated portraits as a catalogue and
// everyone else as a parts list. The mode accent (green; gold in the playoffs) lights
// whatever is on.
const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const PANEL = '#2c2a28'
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
  const c = TEAM_COLORS[team]
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
// Long surnames step down so they fit the narrowest tile (up to ~0.8em a character in
// this face, for the wide letters), to 10px at the least.
const nameSize = name => Math.max(10, Math.min(17, Math.floor(130 / (0.8 * name.length))))
const low = v => v !== null && v < 0

// Latest-season BPM as a 10-segment meter from −4 to +10.
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

// A key on the keypad: a square cap with a colour code along its foot, lit when on.
function Key({ on, onClick, children, code }) {
  return (
    <button type="button" className="idx-key" aria-pressed={on} onClick={onClick}
      style={{ position: 'relative', height: 32, padding: '0 8px', background: on ? INK : 'transparent', color: on ? '#1f1d1c' : '#b8b2ab', border: `1px solid ${on ? INK : EDGE}`, fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.06em', cursor: 'pointer' }}>
      {children}
      {code && <span aria-hidden="true" style={{ position: 'absolute', left: 3, right: 3, bottom: 3, height: 2, background: code }} />}
    </button>
  )
}

function Face({ player, size, square }) {
  const [failed, setFailed] = useState(false)
  const show = player.headshot && !failed
  return (
    <span className="idx-face" style={{ display: 'block', width: square ? '100%' : size, height: square ? 'auto' : size, aspectRatio: '1 / 1', overflow: 'hidden', background: show ? PORTRAIT_BG : '#34312e', flex: 'none' }}>
      {show
        ? <img src={headshotUrl(player.slug, square ? 400 : 100, player.headshotVersion, player.headshot)} alt="" loading="lazy" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%', display: 'block' }} />
        : <TeamInitials name={player.name} team={player.team} fontSize={square ? 40 : 9} />}
    </span>
  )
}

// A portrait in the catalogue: team and seasons over the portrait, then the name and his
// latest BPM on the meter. The LED is lit for players in the latest season.
function Tile({ player: p, to }) {
  return (
    <Link to={to} className="idx-tile" style={{ display: 'flex', flexDirection: 'column', background: '#262422', color: INK, minWidth: 0, border: `1px solid ${RULE}`, margin: '0 -1px -1px 0' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
        <TeamChip team={p.team} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, color: DIM }}>
          {span(p)}
          <span title={p.active ? 'Active' : 'Not active'} style={{ width: 6, height: 6, borderRadius: '50%', background: p.active ? 'var(--accent)' : 'transparent', border: `1px solid ${p.active ? 'var(--accent)' : FAINT}` }} />
        </span>
      </span>
      <Face player={p} square />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 10px 12px', borderTop: `1px solid ${RULE}` }}>
        <span style={{ ...label, letterSpacing: '.08em' }}>{firstName(p.name)}</span>
        <span style={{ fontSize: nameSize(lastName(p.name)), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-.01em', lineHeight: '20px', height: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastName(p.name)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={label}>BPM</span>
          <Meter value={p.recentBpm} />
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, fontWeight: 600, color: low(p.recentBpm) ? '#fa962a' : INK }}>{signed(p.recentBpm)}</span>
        </span>
      </span>
    </Link>
  )
}

// A line in the parts list.
function Row({ player: p, to }) {
  return (
    <Link to={to} className="idx-row" style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) 48px 30px 44px', gap: 10, alignItems: 'center', height: 32, padding: '0 4px', borderBottom: `1px solid ${RULE}`, color: INK }}>
      <Face player={p} size={22} />
      <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
      <TeamChip team={p.team} />
      <span style={{ fontFamily: MONO, fontSize: 10, color: DIM }}>{yy(p.seasons[1])}</span>
      <span style={{ fontFamily: MONO, fontSize: 10, textAlign: 'right', color: low(p.recentBpm) ? '#fa962a' : '#b8b2ab' }}>{signed(p.recentBpm)}</span>
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
  const [activeOnly, setActiveOnly] = useState(false)
  useEffect(() => { fetchPlayers().then(list => setPlayers(list || [])) }, [])

  const spec = useMemo(() => {
    const all = players || []
    const seasons = all.flatMap(p => p.seasons).sort()
    return [
      ['Players', all.length.toLocaleString()],
      ['Active', all.filter(p => p.active).length.toLocaleString()],
      ['Portraits', all.filter(p => ILLUSTRATED.has(p.headshot)).length.toLocaleString()],
      ['Seasons', seasons.length ? `${seasons[0].slice(0, 4)}–${seasons[seasons.length - 1].slice(-2)}` : '—']
    ]
  }, [players])

  // A team code typed into the display works like its key.
  const q = fold(query.trim())
  const typedTeam = TEAMS.find(t => fold(t) === q)
  const matches = (players || []).filter(p => (!team || p.team === team) && (!activeOnly || p.active) && (!q || fold(p.name).includes(q) || (typedTeam && p.team === typedTeam)))
  const portraits = matches.filter(p => ILLUSTRATED.has(p.headshot))
  const rest = matches.filter(p => !ILLUSTRATED.has(p.headshot))

  return (
    <main style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 32px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={label}>Thinking Basketball · Player Index</span>
        <SeasonToggle />
      </div>

      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', padding: '28px 0 14px', borderBottom: '2px solid var(--trim)' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(48px, 9vw, 112px)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: 0.82, textTransform: 'uppercase' }}>Players</h1>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 18, rowGap: 3, fontFamily: MONO, fontSize: 11 }}>
          {spec.map(([k, v]) => [
            <dt key={`${k}-k`} style={{ ...label, fontSize: 10, alignSelf: 'center' }}>{k}</dt>,
            <dd key={`${k}-v`} style={{ margin: 0, textAlign: 'right', color: INK, fontWeight: 600 }}>{players ? v : '…'}</dd>
          ])}
        </dl>
      </header>

      {/* The control panel: the display and its readout, then the keypad. */}
      <div style={{ marginTop: 18, border: `1px solid ${EDGE}`, background: PANEL }}>
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${EDGE}` }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 14px', minWidth: 0 }}>
            <span style={label}>Search</span>
            <input className="idx-input" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="NAME OR TEAM CODE" spellCheck={false}
              style={{ width: '100%', padding: '10px 12px', background: '#1b1a19', border: `1px solid ${RULE}`, color: INK, fontFamily: MONO, fontSize: 'clamp(14px, 2.4vw, 18px)', letterSpacing: '.04em', outline: 'none', caretColor: 'var(--accent)' }} />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 4, padding: '10px 18px', borderLeft: `1px solid ${EDGE}`, minWidth: 120 }}>
            <span style={label}>Showing</span>
            <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, lineHeight: 1, color: INK }}>{players ? matches.length.toLocaleString() : '—'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 14px', flexWrap: 'wrap' }}>
          <span style={{ ...label, paddingTop: 10, width: 44 }}>Team</span>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: 4, minWidth: 260 }}>
            <Key on={!team} onClick={() => setTeam(null)}>ALL</Key>
            {TEAMS.map(t => <Key key={t} on={team === t} code={swatch(t)} onClick={() => setTeam(team === t ? null : t)}>{t}</Key>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={label}>Filter</span>
            <button type="button" className="idx-key" aria-pressed={activeOnly} onClick={() => setActiveOnly(a => !a)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, height: 32, padding: '0 10px', background: 'transparent', color: activeOnly ? INK : '#b8b2ab', border: `1px solid ${activeOnly ? INK : EDGE}`, fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', cursor: 'pointer' }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: activeOnly ? 'var(--accent)' : 'transparent', border: `1px solid ${activeOnly ? 'var(--accent)' : FAINT}`, boxShadow: activeOnly ? '0 0 6px var(--accent)' : 'none' }} />
              ACTIVE ONLY
            </button>
          </div>
        </div>
      </div>

      {portraits.length > 0 && (
        <Section title="Illustrated" count={portraits.length}>
          {/* Tiles share their 1px edges (each overlaps the next by 1px), so a short last row leaves empty cells blank. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', paddingRight: 1, paddingBottom: 1 }}>
            {portraits.map(p => <Tile key={p.slug} player={p} to={playerPath(p.slug)} />)}
          </div>
        </Section>
      )}

      {rest.length > 0 && (
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
        <span>BPM = latest season · meter {METER[0]} to +{METER[1]}</span>
        <span>thinkingbasketball.net</span>
      </footer>
    </main>
  )
}
