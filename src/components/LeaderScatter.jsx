import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { headshotUrl } from '../api.js'
import { rowAge } from '../lib/age.js'
import { stintsOf as minutesBy } from '../lib/board.js'
import { MONO, col, fmt, ord } from '../lib/format.js'
import { define } from '../lib/glossary.js'
import { axisOf, median, pctlOf, quadrantOf, radiusOf, valueOf } from '../lib/leaderboard.js'
import { initials } from '../lib/teams.js'
import { asset } from '../lib/static.js'
import Popover from './Popover.jsx'

// The Leaderboard's scatter: any two stats of the season against each other, each axis
// running better toward the top and right (a lower-is-better stat reversed), split at the
// league's median into four equal quadrants (lib/leaderboard.js axisOf: each half runs
// from the median to its farthest player, so every dot is inside and no side is empty; a
// long-tailed stat like drives on a square-root scale, marked √). A dot is a player, its size his minutes (from the pool's
// fewest to its most), its colour how far toward the top right (blue) or bottom left
// (orange) he sits, grey between, on the site's percentile scale. The table's rows (`shown`)
// are live dots; everyone else on the board (the filters' others, the other pages of a long
// board) is a faint dot painted on one canvas behind them, so thousands cost one paint and
// none listens for the pointer. Live dots glide to their new places when an axis or the
// season changes (index.css .lb-dot). Hover a dot for his card in brief; the table's
// row under the pointer (`hot`) rings its dot with just his face and surname, so the chart
// stays in view as the table is read. A click opens his card. Under it: the season,
// both medians, how many players, and how many are in the top right.
// TEAMS in its header groups them (teamsOf): each team's logo at its players' minutes-weighted
// average, the dots ash behind (a player's dot or row answers nothing). A logo under the pointer lights
// its players white with a hairline from the logo to each, and the strip under the chart
// becomes that team's; a click on a logo keeps it lit. Turning TEAMS on gathers them (GATHER):
// each player's dot, in its colour, falls into his team's average as the field goes ash, and
// the team's logo lands where its players met, team after team.
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const TONE = { both: '#597ec1', neither: '#fa962a' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const TIP_W = 228
const TIP_H = 138
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: DIM, textTransform: 'uppercase' }
const M = { l: 30, r: 14, t: 16, b: 30 }
const ASH = '#6f6a64'
const LOGO = 22
// The gathering: each team MOTE ms after the one before; a dot's fall, its team's logo landing
// as its players arrive.
const GATHER = { fall: 720, step: 22, land: 380 }
const HALO = 'drop-shadow(0 0 1.5px rgba(20,19,18,.95)) drop-shadow(0 1px 3px rgba(0,0,0,.6))'

// The lit team's players: each his face (small, round, quiet) on his exact point, his initials
// under it. Laid out so none overlaps another or the team's logo: each starts on his point and
// is pushed apart from the rest and pulled back toward it, kept inside the chart; one pushed
// off his point leaves a small square there, joined to his face by a hairline (his own dot,
// sized by minutes, hidden under his face while his team is lit).
const FACE = 22
const CARD = { w: 44, h: FACE + 15 }
const facesOf = (ds, px, py, radius, logo, w, h) => {
  const cards = ds.map(d => {
    const x = px(d.vx)
    const y = py(d.vy)
    const home = { x, y: y + (CARD.h - FACE) / 2 }
    return { d, x, y, home, cx: home.x, cy: home.y }
  })
  const fixed = { cx: logo.x, cy: logo.y, w: LOGO * 1.45 + 10, h: LOGO * 1.45 + 10 }
  const push = (a, b, bw, bh, share) => {
    const dx = a.cx - b.cx || 0.01
    const dy = a.cy - b.cy || 0.01
    const ox = (CARD.w + bw) / 2 + 3 - Math.abs(dx)
    const oy = (CARD.h + bh) / 2 + 3 - Math.abs(dy)
    if (ox <= 0 || oy <= 0) return
    if (ox < oy) { a.cx += Math.sign(dx) * ox * share; if (b !== fixed) b.cx -= Math.sign(dx) * ox * (1 - share) }
    else { a.cy += Math.sign(dy) * oy * share; if (b !== fixed) b.cy -= Math.sign(dy) * oy * (1 - share) }
  }
  for (let k = 0; k < 160; k++) {
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) push(cards[i], cards[j], CARD.w, CARD.h, 0.5)
      push(cards[i], fixed, fixed.w, fixed.h, 1)
    }
    for (const c of cards) {
      c.cx += (c.home.x - c.cx) * 0.04
      c.cy += (c.home.y - c.cy) * 0.04
      c.cx = Math.max(M.l + CARD.w / 2 + 2, Math.min(w - M.r - CARD.w / 2 - 2, c.cx))
      c.cy = Math.max(M.t + CARD.h / 2 + 2, Math.min(h - M.b - CARD.h / 2 - 2, c.cy))
    }
  }
  // Initials teammates share run on into the surname (BCA, BCO), or, the surname shared too,
  // into the first name (JALW, JAYW): the shortest that tells them apart.
  const short = c => initials(c.d.p.name).toUpperCase()
  const tag = c => {
    const same = cards.filter(o => short(o) === short(c))
    if (same.length < 2) return short(c)
    const first = o => o.d.p.name.split(' ')[0].toUpperCase()
    const last = o => surname(o.d.p).toUpperCase()
    const ways = [...Array(8)].flatMap((_, i) => [o => first(o)[0] + last(o).slice(0, i + 2)]).concat([...Array(8)].map((_, i) => o => first(o).slice(0, i + 2) + last(o)[0]))
    const way = ways.find(f => new Set(same.map(f)).size === same.length)
    return way ? way(c) : short(c)
  }
  return cards.map(c => ({ ...c, tag: tag(c), moved: Math.hypot(c.cx - c.home.x, c.cy - c.home.y) > 4 }))
}
// No photo: the circle hatched, not left empty.
const HATCH = 'repeating-linear-gradient(45deg, #5a5550 0 1px, transparent 1px 4px)'
function Face({ p, tag, cx, cy }) {
  return (
    <div className="lb-enter" style={{ position: 'absolute', left: cx - CARD.w / 2, top: cy - CARD.h / 2, width: CARD.w, height: CARD.h, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none', zIndex: 4 }}>
      <span style={{ width: FACE, height: FACE, borderRadius: '50%', overflow: 'hidden', background: p.headshot ? PORTRAIT_BG : `${HATCH}, ${PORTRAIT_BG}`, boxShadow: '0 0 0 1.5px rgba(236, 232, 227, .8), 0 0 0 3px #141312', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8, color: DIM }}>
        {p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={FACE} height={FACE} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : null}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, lineHeight: 1, letterSpacing: '.1em', color: INK, background: 'rgba(20, 19, 18, .85)', padding: '2px 3px', whiteSpace: 'nowrap' }}>
        {tag}
      </span>
    </div>
  )
}

// A dot's teams and his minutes with each: a player who moved ('2 TM') counts for each of his
// teams by his minutes there (lib/board.js stintsOf), at his values over all of them; nothing
// that isn't a team's code.
const stintsOf = p => Object.entries(minutesBy(p)).filter(([team]) => /^[A-Z]{3}$/.test(team || ''))
const playsFor = (p, team) => stintsOf(p).some(([t]) => t === team)

// The live dots by team: each team's players and its minutes-weighted average on each axis,
// in the axes' own units, and each player's weight in it (`share`, by id: his minutes there
// over the team's).
const teamsOf = pts => {
  const by = new Map()
  for (const d of pts) for (const [team, mp] of stintsOf(d.p)) by.set(team, [...(by.get(team) || []), { d, mp: mp || 1e-6 }])
  return [...by].map(([team, xs]) => {
    const sum = xs.reduce((a, x) => a + x.mp, 0)
    return { team, ds: xs.map(x => x.d), share: new Map(xs.map(x => [x.d.p.id, x.mp / sum])), vx: xs.reduce((a, x) => a + x.mp * x.d.vx, 0) / sum, vy: xs.reduce((a, x) => a + x.mp * x.d.vy, 0) / sum }
  })
}

// The stats a board can chart: those with values in it (the last 30 days leave some out).
// `dim(label)`: a reason a stat is faint (Careers: none of the picked players has it),
// still pickable. The Team board's too, its rows `teams`. A fixed panel whatever the board
// carries: a find box (typing looks through every group; arrows move, Enter picks), the
// groups down the left with their counts, the open group's stats down the right (it opens
// on the axis's own; a group opens on a click, not under a passing pointer, so the way across
// to its stats never opens another), and the stat under the pointer's definition along the foot.
const PICK_W = 520
const PICK_H = 324
// A stat's line; a list longer than ROWS runs on in a second column, so no group scrolls
// (only a broad search, past two columns' worth).
const STAT_H = 24
const ROWS = 13
function AxisPanel({ groups, value, set, dim, close }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => (groups.find(g => g.stats.includes(value)) || groups[0]).id)
  const [at, setAt] = useState(0)
  const [over, setOver] = useState(value)
  const q = query.trim().toLowerCase()
  const match = l => !q || l.toLowerCase().includes(q)
  const counts = new Map(groups.map(g => [g.id, g.stats.filter(match).length]))
  const list = q ? groups.flatMap(g => g.stats.filter(match).map(l => ({ l, g }))) : (groups.find(g => g.id === open) || groups[0]).stats.map(l => ({ l }))
  const pick = l => { set(l); close() }
  const key = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.max(0, Math.min(list.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))
      setAt(next)
      if (list[next]) setOver(list[next].l)
    } else if (e.key === 'Enter' && list[at]) pick(list[at].l)
  }
  const shown = define(over)
  return (
    <div style={{ width: PICK_W, maxWidth: '100%', display: 'flex', flexDirection: 'column' }} onKeyDown={key}>
      <input autoFocus value={query} onChange={e => { setQuery(e.target.value); setAt(0) }} placeholder="FIND A STAT" aria-label="Find a stat" spellCheck={false}
        style={{ height: 30, padding: '0 10px', border: `1px solid ${EDGE}`, background: '#262422', color: INK, fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', outline: 'none' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '170px minmax(0, 1fr)', height: PICK_H, marginTop: 8, borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
        <div role="tablist" aria-label="Stat groups" className="lb-axis-pane" style={{ overflowY: 'auto', borderRight: `1px solid ${RULE}`, padding: '6px 0' }}>
          {groups.map(g => {
            const sel = !q && g.id === open
            const n = counts.get(g.id)
            return (
              <button key={g.id} type="button" role="tab" aria-selected={sel} className="lb-axis-group" onClick={() => { setQuery(''); setOpen(g.id); setAt(0) }}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '5px 10px', border: 0, borderLeft: `2px solid ${sel ? INK : 'transparent'}`, background: sel ? '#2e2b29' : 'transparent', color: sel ? INK : q && !n ? '#4f4b47' : DIM, fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                <span style={{ color: sel ? DIM : FAINT }}>{n}</span>
              </button>
            )
          })}
        </div>
        <div role="listbox" aria-label="Stats" className="lb-axis-pane"
          style={{ overflowY: 'auto', padding: '6px 0', display: 'grid', gridAutoFlow: 'column', gridTemplateRows: `repeat(${Math.max(1, Math.ceil(list.length / (list.length > ROWS ? 2 : 1)))}, ${STAT_H}px)`, gridTemplateColumns: list.length > ROWS ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)', alignContent: 'start' }}>
          {list.map(({ l, g }, i) => {
            const why = dim && l !== value ? dim(l) : null
            const cur = l === value
            const hot = i === at
            return (
              <button key={`${g ? g.id : ''}|${l}`} type="button" role="option" aria-selected={cur} title={why || undefined} className="lb-axis-stat"
                onClick={() => pick(l)} onMouseEnter={() => { setAt(i); setOver(l) }}
                style={{ width: '100%', height: STAT_H, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', border: 0, background: hot ? '#2e2b29' : 'transparent', color: cur ? INK : why ? FAINT : '#cfc9c2', fontFamily: MONO, fontSize: 11, fontWeight: cur ? 700 : 400, textAlign: 'left', cursor: 'pointer', textDecoration: why ? 'line-through' : 'none', textDecorationColor: '#5a5550' }}>
                <span aria-hidden="true" style={{ width: 6, height: 6, flex: 'none', background: cur ? INK : 'transparent', border: `1px solid ${cur ? INK : hot ? DIM : 'transparent'}` }} />
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
                {g && <span style={{ ...label, fontSize: 8, color: FAINT }}>{g.name}</span>}
              </button>
            )
          })}
          {!list.length && <div style={{ ...label, padding: '14px 12px', color: FAINT }}>No stat matches</div>}
        </div>
      </div>
      {/* Two lines kept, so the panel doesn't jump as the pointer moves. */}
      <div style={{ height: 34, paddingTop: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ ...label, flex: 'none', color: INK, fontWeight: 700 }}>{over}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.35, color: DIM, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{shown || ''}</span>
      </div>
    </div>
  )
}

export function AxisPicker({ doc, axis, value, set, dim }) {
  const charted = l => !doc.stats[l].na && (doc.players || doc.teams).some(p => valueOf(doc, p, l) !== null)
  // A name an earlier group has already (Lonestar's duo set) carries its variant: 'Lonestar · duo'.
  const groups = doc.groups.map(g => ({ ...g, stats: g.stats.filter(charted) })).filter(g => g.stats.length)
    .map((g, i, all) => (all.slice(0, i).some(o => o.name === g.name) ? { ...g, name: `${g.name} · ${g.id.split('-').pop()}` } : g))
  return (
    <Popover name={`${axis} axis: ${value}`} minWidth={PICK_W + 24} trigger={<><span style={{ ...label, fontWeight: 400 }}>{axis}</span>{value}</>}>
      {close => <AxisPanel groups={groups} value={value} set={set} dim={dim} close={close} />}
    </Popover>
  )
}

// A dot's player in brief: headshot, name, team, position, age and minutes, then each
// axis's stat with its value and a bar to its percentile.
function Tip({ doc, d, x, y, left, top }) {
  const row = (l, v) => {
    const pc = pctlOf(doc, d.p, l)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ ...label, fontSize: 8.5 }}>{l}</span>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: INK }}>{fmt(doc.stats[l], v)}</span>
        </span>
        <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 34px', gap: 8, alignItems: 'center' }}>
          <span style={{ position: 'relative', height: 5, background: '#34312e' }}>
            {pc !== null && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(pc, 2)}%`, background: col(pc) }} />}
            <span style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#837d76' }} />
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, textAlign: 'right', color: pc === null ? FAINT : col(pc) }}>{pc === null ? '—' : ord(pc)}</span>
        </span>
      </div>
    )
  }
  const p = d.p
  return (
    <div style={{ position: 'absolute', left, top, width: TIP_W, pointerEvents: 'none', zIndex: 5, background: 'rgba(31, 29, 28, .96)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid #837d76', boxShadow: '0 10px 28px rgba(0,0,0,.55)', padding: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, border: '1px solid #544f4b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 9, color: DIM }}>
          {p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(p.name)}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-.005em', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
          <span style={{ ...label, fontSize: 8 }}>{[(doc.many || doc.eras) && yearsOf(p), p.team, p.pos, rowAge(p) && `age ${rowAge(p)}`, p.mp !== null && `${p.mp.toLocaleString()} min`].filter(Boolean).join(' · ')}</span>
        </span>
      </div>
      <span style={{ height: 1, background: RULE }} />
      {row(x, d.vx)}
      {row(y, d.vy)}
    </div>
  )
}

// The table's row under the pointer, at its dot: his face and surname, no more. Beside the
// dot on its right, or, near the chart's right edge, on its left (`flip`: placed by its
// right edge, so it sits as close whatever the name's length).
const MINI_W = 160
// A row's seasons, as the table writes them: ’23–’27 for an era, ’25 for one season.
const yearsOf = p => (p.era ? `’${p.era[0].slice(5)}–’${p.era[1].slice(5)}` : p.season ? `’${p.season.slice(5)}` : '')
const surname = p => p.name.split(' ').slice(1).join(' ') || p.name
function Mini({ p, left, top, flip }) {
  return (
    <div style={{ position: 'absolute', left, top, maxWidth: MINI_W, transform: flip ? 'translateX(-100%)' : 'none', pointerEvents: 'none', zIndex: 5, display: 'flex', alignItems: 'center', gap: 5, padding: '2px 7px 2px 2px', background: 'rgba(31, 29, 28, .94)', border: '1px solid #837d76' }}>
      <span style={{ width: 18, height: 18, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 7, color: DIM }}>
        {p.headshot ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={18} height={18} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(p.name)}
      </span>
      <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surname(p)}</span>
    </div>
  )
}

export default function LeaderScatter({ doc, shown, hot, runOf, x, y, setAxis, onPick, seasonLabel, onHide }) {
  const box = useRef(null)
  const [size, setSize] = useState({ w: 480, h: 420 })
  const [hover, setHover] = useState(null)
  const [byTeam, setByTeam] = useState(false)
  const [teamHover, setTeamHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  // Set as TEAMS turns on: the gathering plays once, then its motes go.
  const [gather, setGather] = useState(false)
  const motes = useRef(null)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const sx = doc.stats[x]
  const sy = doc.stats[y]
  // The board's points and scales, kept between renders: the table's row under the pointer
  // (`hot`) changes as it scrolls, and on a long board (eras, many seasons) redoing these
  // and every dot for each row it passes made the table stutter.
  const { pts, byId, mx, my, xa, ya, most, least, order, top } = useMemo(() => {
    const pts = doc.players.map(p => ({ p, vx: valueOf(doc, p, x), vy: valueOf(doc, p, y) })).filter(d => d.vx !== null && d.vy !== null)
    const mx = median(pts.map(d => d.vx))
    const my = median(pts.map(d => d.vy))
    const minutes = doc.players.map(p => p.mp || 0)
    return {
      pts,
      byId: new Map(pts.map(d => [d.p.id, d])),
      mx,
      my,
      xa: axisOf(pts.map(d => d.vx), sx.lowerBetter),
      ya: axisOf(pts.map(d => d.vy), sy.lowerBetter),
      most: Math.max(...minutes),
      least: Math.min(...minutes),
      // Big dots first, so small ones stay on top; the filters' players over the rest.
      order: [...pts].sort((a, b) => (shown.has(a.p.id) - shown.has(b.p.id)) || (b.p.mp || 0) - (a.p.mp || 0)),
      top: pts.filter(d => quadrantOf(d.vx, d.vy, mx, my, sx.lowerBetter, sy.lowerBetter) === 'both').length
    }
  }, [doc, x, y, sx, sy, shown])
  const [x0, x1, y0, y1] = [xa.lo, xa.hi, ya.lo, ya.hi]
  const ax = xa.pos
  const ay = ya.pos
  const { w, h } = size
  const px = v => M.l + ax(v) * (w - M.l - M.r)
  const py = v => M.t + (1 - ay(v)) * (h - M.t - M.b)
  const cx = (M.l + w - M.r) / 2
  const cy = (M.t + h - M.b) / 2
  // The biggest dot scales with the plot, so a laptop's smaller chart isn't one blob.
  const biggest = Math.max(6, Math.min(11, Math.min(w, h) / 60))
  const radius = p => radiusOf(p.mp || 0, most, 2, biggest, least)
  // Toward the top right, bluer; toward the bottom left, more orange (the percentile scale,
  // from how far up and right he sits, each axis 0 to 1 with its median at the middle).
  const tint = d => col(50 + 50 * Math.max(-1, Math.min(1, 2 * (ax(d.vx) + ay(d.vy) - 1))))
  // Under TEAMS only a team answers the pointer: a player's dot (or row) under it does nothing.
  // On a board of a player's peaks (`runOf`), his other rows come out around the lit one, a
  // table row under the pointer lit where it sits.
  const key = !byTeam && (hover || hot)
  const run = key && runOf ? runOf.get(key) : null
  const at = run && run.find(p => p.id === key)
  const hv = key && (byId.get(key) || (at && valueOf(doc, at, x) !== null && valueOf(doc, at, y) !== null && { p: at, vx: valueOf(doc, at, x), vy: valueOf(doc, at, y) }))
  const trail = hv && run && run.length > 1 ? [...run].sort((a, b) => (a.season < b.season ? -1 : 1)).map(p => ({ p, vx: valueOf(doc, p, x), vy: valueOf(doc, p, y) })).filter(d => d.vx !== null && d.vy !== null) : null
  const teams = useMemo(() => (byTeam ? teamsOf(pts.filter(d => shown.has(d.p.id))) : []), [byTeam, pts, shown])
  const lit = byTeam ? teamHover || pinned : null
  const litTeam = teams.find(t => t.team === lit)
  const faces = litTeam ? facesOf(litTeam.ds, px, py, radius, { x: px(litTeam.vx), y: py(litTeam.vy) }, w, h) : []
  // Each mote from its player's dot into his team's average, quickening as it nears, shrinking
  // into it; the gathering cleared once the last team has landed.
  useLayoutEffect(() => {
    if (!gather || !motes.current) return
    const all = [...motes.current.children]
    for (const m of all) {
      const { x0, y0, x1, y1, k } = m.dataset
      m.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 0.95 },
        { transform: `translate(${x1}px, ${y1}px) scale(.25)`, opacity: 0.2 }
      ], { duration: GATHER.fall, delay: k * GATHER.step, easing: 'cubic-bezier(.55, 0, .75, .3)', fill: 'both' })
    }
    const done = setTimeout(() => setGather(false), GATHER.fall + teams.length * GATHER.step + GATHER.land)
    return () => clearTimeout(done)
  }, [gather]) // eslint-disable-line react-hooks/exhaustive-deps -- once a gathering
  // The same elements while only the lit dot changes, so React passes over them.
  const dots = useMemo(() => order.filter(d => shown.has(d.p.id)).map(d => (
    <circle key={d.p.id} className="lb-dot lb-dot-in" cx={0} cy={0} r={radius(d.p)}
      fill={!byTeam ? tint(d) : ASH} fillOpacity={!byTeam ? 0.82 : playsFor(d.p, lit) ? 0 : lit ? 0.2 : 0.3}
      style={{ transform: `translate(${px(d.vx)}px, ${py(d.vy)}px)`, cursor: 'pointer' }}
      onMouseEnter={() => setHover(d.p.id)} onMouseLeave={() => setHover(id => (id === d.p.id ? null : id))} onClick={() => onPick(d.p.id)} />
  )), [order, shown, xa, ya, most, least, w, h, onPick, byTeam, lit]) // eslint-disable-line react-hooks/exhaustive-deps -- px, py, radius and tint are these
  const faint = useRef(null)
  useEffect(() => {
    const c = faint.current
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr
    c.height = h * dpr
    const g = c.getContext('2d')
    g.scale(dpr, dpr)
    g.globalAlpha = 0.08
    for (const d of order) {
      if (shown.has(d.p.id)) continue
      g.fillStyle = tint(d)
      g.beginPath()
      g.arc(px(d.vx), py(d.vy), radius(d.p), 0, 2 * Math.PI)
      g.fill()
    }
  }, [order, shown, xa, ya, most, least, w, h]) // eslint-disable-line react-hooks/exhaustive-deps -- px, py, radius and tint are these
  // An axis's worse end on the left (or bottom), its better end on the right (or top).
  const ends = (stat, lo, hi) => (stat.lowerBetter ? [hi, lo] : [lo, hi])
  const [xl, xr] = ends(sx, x0, x1)
  const [yb, yt] = ends(sy, y0, y1)
  const cell = { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, borderLeft: `1px solid ${RULE}` }
  const cap = { ...label, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  const big = { fontFamily: MONO, fontSize: 18, fontWeight: 600, color: INK, lineHeight: 1 }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap' }}>
        <AxisPicker doc={doc} axis="X" value={x} set={v => setAxis('x', v)} />
        <AxisPicker doc={doc} axis="Y" value={y} set={v => setAxis('y', v)} />
        <span style={{ ...label, marginLeft: 'auto', fontSize: 8 }}>● = minutes · ┼ median</span>
        <button type="button" data-tour="teams" aria-pressed={byTeam} onClick={() => { setGather(!byTeam && !window.matchMedia('(prefers-reduced-motion: reduce)').matches); setByTeam(v => !v); setPinned(null) }} title="Each team at its players' minutes-weighted average"
          style={{ height: 26, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${byTeam ? INK : EDGE}`, background: byTeam ? '#3a3734' : 'transparent', color: byTeam ? INK : DIM, fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', cursor: 'pointer' }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, border: `1px solid currentColor`, background: byTeam ? 'currentColor' : 'transparent' }} />TEAMS
        </button>
        {/* Folds the chart away to the right, so the table takes the board's width. */}
        {onHide && (
          <button type="button" onClick={onHide} aria-label="Hide the chart" title="Hide the chart"
            style={{ width: 26, height: 26, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${EDGE}`, background: 'transparent', color: DIM, cursor: 'pointer' }}>
            <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true"><path d="M2 1l4 4-4 4M6 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
          </button>
        )}
      </div>
      {/* As tall as the panel allows, but never much taller than it's wide. */}
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 240, maxHeight: Math.round(w * 1.1) }}>
        <canvas ref={faint} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: w, height: h, pointerEvents: 'none' }} />
        <svg width={w} height={h} style={{ position: 'absolute', inset: 0, display: 'block' }} onMouseLeave={() => { setHover(null); setTeamHover(null) }}>
          <rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} fill="none" stroke={RULE} />
          {/* The medians cross at the centre: better-in-both up and right, worse-in-both down
              and left, each tinted. */}
          <rect x={cx} y={M.t} width={w - M.r - cx} height={cy - M.t} fill={TONE.both} fillOpacity={0.06} />
          <rect x={M.l} y={cy} width={cx - M.l} height={h - M.b - cy} fill={TONE.neither} fillOpacity={0.06} />
          <line x1={cx} x2={cx} y1={M.t} y2={h - M.b} stroke={EDGE} strokeDasharray="2 3" />
          <line x1={M.l} x2={w - M.r} y1={cy} y2={cy} stroke={EDGE} strokeDasharray="2 3" />
          <text x={w - M.r - 6} y={M.t + 12} textAnchor="end" style={{ ...label, fontSize: 9, fill: TONE.both }}>+ +</text>
          <text x={M.l + 6} y={h - M.b - 6} style={{ ...label, fontSize: 9, fill: TONE.neither }}>− −</text>
          <g style={{ opacity: trail ? 0.3 : 1, transition: 'opacity .2s' }}>{dots}</g>
          {/* His rows in season order, joined, each a small dot with its years. */}
          {trail && (
            <g pointerEvents="none">
              <clipPath id="lb-plot"><rect x={M.l} y={M.t} width={w - M.l - M.r} height={h - M.t - M.b} /></clipPath>
              <g clipPath="url(#lb-plot)">
                <polyline points={trail.map(d => `${px(d.vx)},${py(d.vy)}`).join(' ')} fill="none" stroke={INK} strokeOpacity={0.45} strokeWidth={1} />
                {trail.map(d => (
                  <g key={d.p.id}>
                    <circle cx={px(d.vx)} cy={py(d.vy)} r={3.5} fill={tint(d)} stroke="#1a1918" strokeWidth={1} />
                    <text x={px(d.vx) + 6} y={py(d.vy) + 3} style={{ ...label, fontSize: 8, fill: INK, paintOrder: 'stroke', stroke: '#1a1918', strokeWidth: 3 }}>{yearsOf(d.p)}</text>
                  </g>
                ))}
              </g>
            </g>
          )}
          {/* The lit team: a hairline from its logo to each of its players, glowing as strongly as
              his weight in its average (his share of its minutes, against the team's biggest).
              Squared: a rotation's shares sit close together, and a glow at half strength
              reads nearly as bright as a full one. The glow's region is the whole chart: a level or upright line's own box has no
              height or width, and the blur would vanish in it. */}
          <defs><filter id="lb-glow" filterUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}><feGaussianBlur stdDeviation={2} /></filter></defs>
          {litTeam && litTeam.ds.map(d => {
            const k = (litTeam.share.get(d.p.id) / Math.max(...litTeam.share.values())) ** 2
            const ends = { x1: px(litTeam.vx), y1: py(litTeam.vy), x2: px(d.vx), y2: py(d.vy) }
            return (
              <g key={d.p.id} pointerEvents="none">
                <line {...ends} stroke={INK} strokeOpacity={0.5 * k} strokeWidth={1 + 3 * k} filter="url(#lb-glow)" />
                <line {...ends} stroke={INK} strokeOpacity={0.12 + 0.78 * k} strokeWidth={1} />
              </g>
            )
          })}
          {/* A face pushed off its dot, joined to it. */}
          {faces.filter(f => f.moved).map(f => (
            <g key={f.d.p.id} pointerEvents="none">
              <line x1={f.x} y1={f.y} x2={f.cx} y2={f.cy - (CARD.h - FACE) / 2} stroke={INK} strokeOpacity={0.7} strokeWidth={1} />
              <rect x={f.x - 2} y={f.y - 2} width={4} height={4} fill={INK} />
            </g>
          ))}
          {/* Every team's logo at its average, the rest quieter while one is lit. They keep their
              order (a node moved under the pointer loses its mouseleave, and its team stayed lit);
              the lit one is drawn again over them, larger, above its players' faces. */}
          {gather && (
            <g ref={motes} pointerEvents="none">
              {teams.flatMap((t, k) => t.ds.map(d => (
                <circle key={`${t.team}|${d.p.id}`} r={Math.min(radius(d.p), 6)} fill={tint(d)}
                  data-x0={px(d.vx)} data-y0={py(d.vy)} data-x1={px(t.vx)} data-y1={py(t.vy)} data-k={k}
                  style={{ transform: `translate(${px(d.vx)}px, ${py(d.vy)}px)` }} />
              )))}
            </g>
          )}
          {teams.map((t, k) => (
            <g key={t.team} className="lb-dot lb-team" style={{ transform: `translate(${px(t.vx)}px, ${py(t.vy)}px)`, opacity: lit && t.team !== lit ? 0.12 : 1, cursor: 'pointer' }}
              onMouseEnter={() => setTeamHover(t.team)} onMouseLeave={() => setTeamHover(v => (v === t.team ? null : v))} onClick={() => setPinned(v => (v === t.team ? null : t.team))}>
              <image href={asset(`logos/color/${t.team}.png`)} x={-LOGO / 2} y={-LOGO / 2} width={LOGO} height={LOGO} className={gather ? 'lb-team-land' : undefined}
                style={{ filter: HALO, animationDelay: `${GATHER.fall * 0.82 + k * GATHER.step}ms`, animationDuration: `${GATHER.land}ms` }} />
            </g>
          ))}
          {hv && <circle cx={px(hv.vx)} cy={py(hv.vy)} r={radius(hv.p) + 2.5} fill="none" stroke={INK} strokeWidth={1.5} pointerEvents="none" />}
          {/* Each axis: its ends' values and its name, the better end up and to the right. */}
          <text x={M.l} y={h - M.b + 14} style={{ ...label, fill: FAINT }}>{fmt(sx, xl)}</text>
          <text x={(M.l + w - M.r) / 2} y={h - M.b + 14} textAnchor="middle" style={{ ...label, fill: DIM }}>{x}{xa.root ? ' · √ scale' : ''} →</text>
          <text x={w - M.r} y={h - M.b + 14} textAnchor="end" style={{ ...label, fill: FAINT }}>{fmt(sx, xr)}</text>
          <text x={M.l - 6} y={h - M.b} textAnchor="start" style={{ ...label, fill: FAINT }} transform={`rotate(-90 ${M.l - 6} ${h - M.b})`}>{fmt(sy, yb)}</text>
          <text x={M.l - 6} y={(M.t + h - M.b) / 2} textAnchor="middle" style={{ ...label, fill: DIM }} transform={`rotate(-90 ${M.l - 6} ${(M.t + h - M.b) / 2})`}>{y}{ya.root ? ' · √ scale' : ''} →</text>
          <text x={M.l - 6} y={M.t} textAnchor="end" style={{ ...label, fill: FAINT }} transform={`rotate(-90 ${M.l - 6} ${M.t})`}>{fmt(sy, yt)}</text>
        </svg>
        {hv && hover && <Tip doc={doc} d={hv} x={x} y={y}
          left={px(hv.vx) + 16 + TIP_W < w ? px(hv.vx) + 16 : px(hv.vx) - 16 - TIP_W}
          top={Math.max(4, Math.min(h - TIP_H - 4, py(hv.vy) - TIP_H / 2))} />}
        {faces.map(f => <Face key={f.d.p.id} p={f.d.p} tag={f.tag} cx={f.cx} cy={f.cy} />)}
        {/* The lit team's logo, larger, over its players' faces, where their lines meet. */}
        {litTeam && (() => {
          const s = LOGO * 1.45
          return (
            <div style={{ position: 'absolute', left: px(litTeam.vx) - s / 2 - 4, top: py(litTeam.vy) - s / 2 - 4, width: s + 8, height: s + 8, boxSizing: 'border-box', border: pinned === litTeam.team ? `1px solid ${INK}` : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
              <img src={asset(`logos/color/${litTeam.team}.png`)} alt="" width={s} height={s} style={{ filter: HALO }} />
            </div>
          )
        })()}
        {hv && !hover && !(litTeam && litTeam.ds.includes(hv)) && (() => {
          const flip = px(hv.vx) + radius(hv.p) + 6 + MINI_W > w
          return <Mini p={hv.p} flip={flip} left={flip ? px(hv.vx) - radius(hv.p) - 6 : px(hv.vx) + radius(hv.p) + 6} top={Math.max(2, py(hv.vy) - 12)} />
        })()}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', borderTop: `1px solid ${RULE}` }}>
        {litTeam ? <>
          <div style={{ ...cell, borderLeft: 0 }}><span style={cap}>Team</span><span style={{ ...big, display: 'flex', alignItems: 'center', gap: 6 }}><img src={asset(`logos/color/${litTeam.team}.png`)} alt="" width={18} height={18} />{litTeam.team}</span></div>
          <div style={cell}><span style={cap} title="Minutes-weighted">{x} avg</span><span style={big}>{fmt(sx, litTeam.vx)}</span></div>
          <div style={cell}><span style={cap} title="Minutes-weighted">{y} avg</span><span style={big}>{fmt(sy, litTeam.vy)}</span></div>
          <div style={cell}><span style={cap}>Players</span><span style={big}>{litTeam.ds.length}</span></div>
          <div style={cell}><span style={cap}>Top right</span><span style={{ ...big, color: TONE.both }}>{litTeam.ds.filter(d => quadrantOf(d.vx, d.vy, mx, my, sx.lowerBetter, sy.lowerBetter) === 'both').length}</span></div>
        </> : <>
          <div style={{ ...cell, borderLeft: 0 }}><span style={cap}>League</span><span style={big}>{seasonLabel}</span></div>
          <div style={cell}><span style={cap}>{x} med</span><span style={big}>{fmt(sx, mx)}</span></div>
          <div style={cell}><span style={cap}>{y} med</span><span style={big}>{fmt(sy, my)}</span></div>
          <div style={cell}><span style={cap}>Players</span><span style={big}>{pts.length}</span></div>
          <div style={cell}><span style={cap}>Top right</span><span style={{ ...big, color: TONE.both }}>{top}</span></div>
        </>}
      </div>
    </>
  )
}
