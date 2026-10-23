import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { headshotUrl } from '../api.js'
import { rowAge } from '../lib/age.js'
import { MONO, fmt, heat } from '../lib/format.js'
import { initials } from '../lib/teams.js'

// The Leaderboard's table, compact: rank (in the sorted stat, among the whole season),
// the player, his team, position, age, games and minutes that season, then the picked
// group's stats; the player and his details take the room the board's widest values need
// (the whole board's, so turning a page doesn't move them), the stats share the rest; the rank, player and his details stay put when the stats scroll
// sideways. A header sorts by its stat, best first, and again for worst first. A
// header keeps one size whatever the group or sort: two lines at most, the sorted one
// marked by colour and a rule (not weight), with room kept for its arrow; neighbouring
// stats over the same rolling window sit under one bracket that names it. A cell is shaded by its percentile as the profile's stat tables are (lib/format.js heat:
// blue above the middle, orange below; a style stat, neither, in grey), and a Footprint
// swing that clears the noise carries a small square. `pct`: each cell shows its percentile
// instead of its value. A row is a player, or a player-season when the board has a
// row per season (`doc.many`, with a season column); rows carry their id (data-id), so
// the page can light the one under the pointer in the scatter. The stats' sideways
// scroll shows on a rail of its own under the stats alone (the browser's bar is hidden,
// index.css). A long board's page control (`pager`) sits in the Player header. A stat's
// head carries its percentile filter (`filters`: label -> the top share kept), marked
// there while on. A column with two sides (Lonestar's change: `sub`, its on and off) opens
// them beside it from a small box in its head's top corner, each headed by its side (`head`,
// shown as the star's: w/ Star, w/o Star), the three framed together.
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const label = { fontFamily: MONO, fontSize: 8.5, letterSpacing: '.08em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
// The rank column's width, held by a box in each of its cells (a table squeezed for room
// would narrow the column, and the sticky player column, set this far from the left,
// would then cover the next).
const RANK_W = 32
// A phone's width (index.css turns the stats' snapping off there too).
const NARROW = '(max-width: 600px)'
// A style stat's shade: how far from the middle, in grey.
const plain = p => `rgba(201,195,188,${((Math.abs(p - 50) / 50) * 0.32).toFixed(2)})`
// "N. Jokić": the first name as an initial, so the column stays narrow.
const short = name => (name.includes(' ') ? `${name[0]}. ${name.split(' ').slice(1).join(' ')}` : name)
const BIO = [['TM', p => p.team], ['POS', p => p.pos || '—'], ['AGE', p => rowAge(p) ?? '—'], ['GP', p => p.gp ?? '—'], ['MIN', p => (p.mp === null ? '—' : p.mp.toLocaleString())]]

// A rolling window's bracket, drawn a header at a time: a rule along the top of each of
// its columns, turned down at the first and last, the window named once at its left.
function Bracket({ years, start, end }) {
  const line = `1px solid ${FAINT}`
  return (
    <>
      <span aria-hidden="true" style={{ position: 'absolute', top: 6, height: 4, left: start ? 6 : 0, right: end ? 6 : 0, borderTop: line, borderLeft: start ? line : 0, borderRight: end ? line : 0 }} />
      {start && (
        <span title={`Rolling ${years}-season window: this season and the ${years === 2 ? 'one' : years - 1} before it`}
          style={{ ...label, position: 'absolute', top: 1, left: 10, padding: '0 3px', fontSize: 7.5, lineHeight: '10px', background: '#262422' }}>
          {years}YR
        </span>
      )}
    </>
  )
}

// The stats' sideways scroll: a rule along the table's foot under the stats alone (from
// `held`, the held columns' width), the part on show a solid block on it. Drag the block,
// or click the rule for the next or last page. Nothing when the stats all fit. The
// scroll stops on a column's start, just clear of the held block (index.css snaps it).
function Rail({ scroller, held, span }) {
  const [view, setView] = useState(null)
  useEffect(() => {
    const el = scroller.current
    const read = () => setView({ at: el.scrollLeft, shown: el.clientWidth - held, total: el.scrollWidth - held, width: el.clientWidth })
    read()
    el.addEventListener('scroll', read, { passive: true })
    const watch = new ResizeObserver(read)
    watch.observe(el)
    watch.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', read)
      watch.disconnect()
    }
  }, [scroller, held])
  if (!view || view.total <= view.shown + 1) return null
  const track = view.width - held - 1
  const thumb = Math.max(24, (view.shown / view.total) * track)
  const x = (view.at / (view.total - view.shown)) * (track - thumb)
  const drag = e => {
    e.preventDefault()
    e.stopPropagation()
    const el = scroller.current
    const from = e.clientX
    const start = el.scrollLeft
    const per = (view.total - view.shown) / (track - thumb)
    const move = m => { el.scrollLeft = start + (m.clientX - from) * per }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }
  const page = e => {
    const r = e.currentTarget.getBoundingClientRect()
    scroller.current.scrollBy({ left: (e.clientX - r.left < x ? -1 : 1) * view.shown, behavior: 'smooth' })
  }
  return (
    <tfoot>
      <tr>
        <td colSpan={span} style={{ position: 'sticky', bottom: 0, zIndex: 4, height: 11, padding: 0, borderTop: `1px solid ${RULE}` }}>
          <div style={{ position: 'sticky', left: 0, width: view.width, height: 11 }}>
            <div role="scrollbar" aria-orientation="horizontal" aria-label="Scroll the stats" aria-valuenow={Math.round((view.at / (view.total - view.shown)) * 100)}
              onPointerDown={page} style={{ position: 'absolute', left: held, right: 0, top: 0, bottom: 0, cursor: 'pointer', borderLeft: `1px solid ${RULE}` }}>
              <span className="lb-rail-thumb" onPointerDown={drag} style={{ position: 'absolute', top: 3, height: 4, left: x, width: thumb, background: DIM, cursor: 'grab' }} />
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  )
}

// His headshot in a circle, as the profile's top bar has it.
function Face({ p }) {
  return (
    <span style={{ width: 20, height: 20, flex: 'none', borderRadius: '50%', background: PORTRAIT_BG, border: '1px solid #544f4b', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 7, color: DIM }}>
      {p.headshot
        ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={20} height={20} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} />
        : initials(p.name)}
    </span>
  )
}

// Lonestar's stars, those he was without (`stars`: each team's, with its seasons; Min off
// and Min on are the row's own, `mins` their labels): a star's small face tucked onto his,
// and over it the whole of them.
const yrs = seasons => {
  const ys = seasons.map(s => Number(s.slice(0, 4)) + 1)
  const runs = []
  for (const y of ys) {
    const last = runs[runs.length - 1]
    if (last && y === last[1] + 1) last[1] = y
    else runs.push([y, y])
  }
  return runs.map(([a, b]) => (a === b ? `’${String(a).slice(2)}` : `’${String(a).slice(2)}–’${String(b).slice(2)}`)).join(', ')
}
function Mini({ who, size, style }) {
  return (
    <span style={{ width: size, height: size, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: size * 0.36, color: DIM, ...style }}>
      {who.headshot
        ? <img src={headshotUrl(who.slug || who.face, 100, who.headshotVersion, who.headshot)} alt="" width={size} height={size} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} />
        : initials(who.name || '?')}
    </span>
  )
}
function Without({ p, parts, mins, doc }) {
  const [at, setAt] = useState(null)
  const tip = useRef(null)
  const show = e => {
    const r = e.currentTarget.getBoundingClientRect()
    setAt({ left: r.right + 10, mid: r.top + r.height / 2, top: null })
  }
  // Centred on his face, but kept on screen.
  useLayoutEffect(() => {
    if (!at || at.top !== null) return
    const h = tip.current.offsetHeight
    setAt(a => ({ ...a, top: Math.max(8, Math.min(window.innerHeight - h - 8, a.mid - h / 2)) }))
  }, [at])
  const min = l => {
    const x = p.v[doc.labels.indexOf(l)]
    return x === null || x === undefined ? '—' : Math.round(x).toLocaleString()
  }
  return (
    <span onPointerEnter={show} onPointerLeave={() => setAt(null)} style={{ position: 'relative', flex: 'none', display: 'inline-flex' }}>
      <Face p={p} />
      <Mini who={parts[0].stars[0]} size={11} style={{ position: 'absolute', right: -4, bottom: -3, boxShadow: '0 0 0 1.5px #1f1d1c' }} />
      {at && createPortal(
        <div ref={tip} role="tooltip" style={{ position: 'fixed', left: at.left, top: at.top ?? at.mid, visibility: at.top === null ? 'hidden' : 'visible', zIndex: 40, minWidth: 220, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9, background: '#1f1d1c', border: '1px solid #837d76', boxShadow: '0 8px 24px rgba(0,0,0,.5)', fontFamily: MONO, pointerEvents: 'none' }}>
          <span style={{ fontSize: 8.5, letterSpacing: '.12em', color: FAINT, textTransform: 'uppercase' }}>Without</span>
          {parts.map((pt, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ display: 'flex', flex: 'none' }}>{pt.stars.map((t, j) => <Mini key={j} who={t} size={26} style={{ marginLeft: j ? -7 : 0, border: '1px solid #544f4b' }} />)}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{pt.stars.map(t => t.name).join(' + ')}</span>
                <span style={{ fontSize: 9.5, letterSpacing: '.06em', color: DIM }}>{pt.team} · {yrs(pt.seasons)}</span>
              </span>
            </span>
          ))}
          <span style={{ display: 'flex', gap: 14, paddingTop: 8, borderTop: `1px solid ${RULE}`, fontSize: 9.5, letterSpacing: '.06em', color: DIM, textTransform: 'uppercase' }}>
            <span><span style={{ color: INK, fontWeight: 700 }}>{min(mins[0])}</span> min without</span>
            <span><span style={{ color: INK, fontWeight: 700 }}>{min(mins[1])}</span> with</span>
          </span>
        </div>,
        document.body
      )}
    </span>
  )
}

const CELL = { height: 26, padding: '0 7px', borderBottom: `1px solid ${RULE}`, whiteSpace: 'nowrap' }
// A group with offense and defense stats (Footprint's, by `side`) parts them: a rule down
// the first defensive column's left, and over each side's first header its name.
const sideAt = (doc, group, i) => (i >= 0 && i < group.stats.length ? doc.stats[group.stats[i]].side : undefined)
const turnsDef = (doc, group, i) => sideAt(doc, group, i) === 'def' && sideAt(doc, group, i - 1) === 'off'
const sideStarts = (doc, group, i) => sideAt(doc, group, i) && sideAt(doc, group, i) !== sideAt(doc, group, i - 1)
const stick = left => ({ position: 'sticky', left, zIndex: 1 })
// A held column at its measured offset (`lefts`); on a phone only the rank and player are held.
const lockOf = (lefts, narrow) => k => (lefts.length && !narrow ? stick(lefts[k]) : {})
// The held block's right edge, a rule the stats slide under.
const edge = i => (i === BIO.length - 1 ? { borderRight: `1px solid ${RULE}` } : {})

// An opened column (its change, then its sides) is framed: solid rules down the change's left
// and the last side's right (and along their heads' top), a dashed one between the change and
// its sides.
const SIDES = { On: 'w/ Star', Off: 'w/o Star' }
const opened = (doc, stats, i) => !!doc.stats[stats[i]].sub && stats[i + 1] === doc.stats[stats[i]].sub[0]
const sideRule = (doc, stats, i, color) => {
  const { head } = doc.stats[stats[i]]
  if (opened(doc, stats, i)) return { borderLeft: `1px solid ${color}` }
  if (head === 'On') return { borderLeft: `1px dashed ${color}` }
  return head === 'Off' ? { borderRight: `1px solid ${color}` } : {}
}

// A player's row. Its own component, kept while its props hold, so when the drawn rows
// move (Leaderboard.jsx) only the newly drawn ones are made.
const Row = memo(function Row({ p, rank, selected, onPick, doc, group, sortLabel, pct, narrow, lefts, bioCh }) {
  const lock = lockOf(lefts, narrow)
  const yr = doc.many ? 1 : 0
  const lit = new Set(p.lit || [])
  return (
    <tr data-id={p.id} className="lb-row" aria-selected={selected} onClick={() => onPick(p.id)}>
      <td style={{ ...CELL, ...stick(0), padding: 0, textAlign: 'center', color: DIM, fontSize: 10.5 }}><span style={{ display: 'inline-block', width: RANK_W }}>{rank ?? '—'}</span></td>
      <td style={{ ...CELL, ...stick(RANK_W), padding: '0 8px 0 4px', borderRight: `1px solid ${RULE}` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {group.mins && p.stars && p.stars[group.id] ? <Without p={p} parts={p.stars[group.id]} mins={group.mins} doc={doc} /> : <Face p={p} />}
          <span title={p.name} style={{ width: narrow ? 84 : 130, flex: 'none', fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis' }}>{short(p.name)}</span>
          {p.era && <span style={{ flex: 'none', fontFamily: MONO, fontSize: 10.5, color: DIM, letterSpacing: '.04em' }}>’{p.era[0].slice(5)}{p.era[1] !== p.era[0] && `–’${p.era[1].slice(5)}`}</span>}
        </span>
      </td>
      {doc.many && <td style={{ ...CELL, ...lock(0), color: '#b8b2ab', fontSize: 10.5 }}>’{p.season.slice(5)}</td>}
      {BIO.map(([name, of], i) => <td key={name} style={{ ...CELL, ...lock(yr + i), minWidth: `${bioCh[i]}ch`, textAlign: i < 2 ? 'left' : 'right', color: i < 2 ? '#b8b2ab' : DIM, fontSize: i < 2 ? 10.5 : 11.5, ...edge(i) }}>{of(p)}</td>)}
      {group.stats.map((l, i) => {
        const k = doc.labels.indexOf(l)
        const stat = doc.stats[l]
        const v = p.v[k]
        const pc = p.p[k]
        const shade = v === null || pc === null ? undefined : stat.neutral ? plain(pc) : heat(pc)
        return (
          <td key={l} style={{ ...CELL, textAlign: 'right', background: shade, ...(turnsDef(doc, group, i) ? { borderLeft: '1px solid #544f4b' } : {}), ...sideRule(doc, group.stats, i, '#837d76'), color: v === null ? FAINT : INK, fontWeight: sortLabel === l ? 600 : 400 }}>
            {lit.has(k) && <span aria-label="clears the noise" style={{ display: 'inline-block', width: 4, height: 4, marginRight: 5, verticalAlign: 2, background: INK }} />}
            {pct ? (v === null || pc === null ? '—' : pc) : fmt(stat, v)}
          </td>
        )
      })}
    </tr>
  )
})

// The percentile filter's mark: three bars narrowing, a sieve, in its holder's colour (the
// accent where a filter is on: a stat's head here, its group's tab in Leaderboard.jsx).
export function FilterMark({ size = 9 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 9 9" style={{ display: 'block', flex: 'none' }}>
      <rect x="0" y="0.5" width="9" height="1.6" fill="currentColor" />
      <rect x="2" y="3.7" width="5" height="1.6" fill="currentColor" />
      <rect x="3.6" y="6.9" width="1.8" height="1.6" fill="currentColor" />
    </svg>
  )
}

// The box on a two-sided column's head: + opens its sides beside it, − closes them.
function Expand({ open, stat, toggle }) {
  return (
    <button type="button" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} ${stat} with and without the star`} title={open ? 'Hide w/ and w/o Star' : 'Show w/ and w/o Star'} onClick={toggle}
      style={{ position: 'absolute', top: 3, left: 7, width: 11, height: 11, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${open ? INK : FAINT}`, background: 'transparent', color: open ? INK : DIM, fontFamily: MONO, fontSize: 9, lineHeight: 1, cursor: 'pointer' }}>{open ? '−' : '+'}</button>
  )
}

// A stat's percentile filter: keep the rows in its top 75%, 50% or 25% on the board, or all.
// Its mark sits at the head's foot (faint until the head is hovered, lit in the accent with
// its share while on) and opens a panel drawn over the page (the table's box would cut it
// off); a press outside, Escape or a scroll closes it.
const SHARES = [[null, 'All'], [0.75, 'Top 75%'], [0.5, 'Top 50%'], [0.25, 'Top 25%']]
const PANEL_W = 260
function ColumnFilter({ stat, share, set }) {
  const btn = useRef(null)
  const panel = useRef(null)
  const [at, setAt] = useState(null)
  useEffect(() => {
    if (!at) return
    const close = () => setAt(null)
    const outside = e => { if (!panel.current.contains(e.target) && !btn.current.contains(e.target)) close() }
    const escape = e => { if (e.key === 'Escape') close() }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
      document.removeEventListener('scroll', close, true)
    }
  }, [at])
  return (
    <>
      <button ref={btn} type="button" className={`lb-filter${share ? ' lb-filter-on' : ''}`} aria-haspopup="dialog" aria-expanded={!!at}
        aria-label={`Filter ${stat} by percentile${share ? `: top ${share * 100}%` : ''}`} title={share ? `Top ${share * 100}% in ${stat}` : `Filter by ${stat}`}
        onClick={() => setAt(a => (a ? null : btn.current.getBoundingClientRect()))}
        style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, height: 13, padding: '0 2px', border: 0, background: 'transparent', color: share ? 'var(--accent)' : DIM, fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '.04em', cursor: 'pointer' }}>
        <FilterMark />{share && <span>{share * 100}</span>}
      </button>
      {at && createPortal(
        <div ref={panel} role="dialog" aria-label={`Filter ${stat}`}
          style={{ position: 'fixed', top: at.bottom + 6, left: Math.max(16, Math.min(at.left, document.documentElement.clientWidth - 16 - PANEL_W)), width: PANEL_W, zIndex: 40, display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: '#1f1d1c', border: '1px solid #837d76', boxShadow: '0 8px 24px rgba(0,0,0,.5)', fontFamily: MONO }}>
          <span style={{ ...label, display: 'flex', alignItems: 'center', gap: 6, color: INK }}><FilterMark />{stat}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid #544f4b' }}>
            {SHARES.map(([s, name], i) => (
              <button key={name} type="button" className="lb-group" aria-pressed={s === (share || null)} onClick={() => { set(stat, s); setAt(null) }}
                style={{ height: 28, padding: 0, border: 0, borderLeft: i ? '1px solid #544f4b' : 0, background: s === (share || null) ? '#3a3734' : 'transparent', color: s === (share || null) ? INK : DIM, fontFamily: MONO, fontSize: 9.5, fontWeight: s === (share || null) ? 700 : 400, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}>{name}</button>
            ))}
          </div>
          <span style={{ ...label, fontSize: 8, color: FAINT }}>By percentile on the board · filters add up across stats</span>
        </div>,
        document.body
      )}
    </>
  )
}

function LeaderTable({ doc, group, rows, pager, rank, sortLabel, reverse, onSort, picked, onPick, scroller, pct = false, filters = {}, setFilter }) {
  const head = { position: 'sticky', top: 0, zIndex: 2, height: 46, boxSizing: 'border-box', padding: '15px 7px 6px', borderBottom: `1px solid ${RULE}`, textAlign: 'right', verticalAlign: 'bottom' }
  // The season and details columns stay put where they sit: each held at its own offset,
  // measured (they're as wide as their widest value, which a span's totals widen).
  const headRow = useRef(null)
  const [lefts, setLefts] = useState([])
  useLayoutEffect(() => {
    // The columns before each: the rank, the player, then the held ones. Their widths are
    // added up (a held cell's own position includes how far it's been held, so it can't
    // be read back); the last entry is the whole held block's width.
    const lead = [...headRow.current.children].slice(0, 2 + headRow.current.querySelectorAll('th[data-lock]').length)
    const measure = () => setLefts(was => {
      const now = []
      let x = 0
      lead.forEach((th, i) => {
        if (i >= 2) now.push(x)
        x += th.getBoundingClientRect().width
      })
      now.push(x)
      return now.join() === was.join() ? was : now
    })
    measure()
    const watch = new ResizeObserver(measure)
    for (const th of lead) watch.observe(th)
    return () => watch.disconnect()
  }, [doc.many])
  // On a phone the details would fill the screen, leaving no room for the stats: only the
  // rank and player stay put there, and the names are shorter.
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches)
  useEffect(() => {
    const m = window.matchMedia(NARROW)
    const on = () => setNarrow(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  const lock = lockOf(lefts, narrow)
  const held = !lefts.length ? 0 : narrow ? lefts[0] : lefts[lefts.length - 1]
  const yr = doc.many ? 1 : 0
  // Each detail column's widest value on the whole board (in characters: the table is
  // monospaced), so a page of short values doesn't narrow it.
  const bioCh = useMemo(() => BIO.map(([, of]) => Math.max(1, ...doc.players.map(p => String(of(p)).length))), [doc])
  // The opened columns, and the group's columns with each one's sides after it.
  const [open, setOpen] = useState(() => new Set())
  const toggle = l => setOpen(o => {
    const next = new Set(o)
    if (next.has(l)) next.delete(l)
    else next.add(l)
    return next
  })
  const shown = useMemo(() => ({ ...group, stats: group.stats.flatMap(l => (open.has(l) && doc.stats[l].sub ? [l, ...doc.stats[l].sub] : [l])) }), [group, open, doc])
  return (
    <table className="lb-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr ref={headRow}>
          <th style={{ ...head, ...stick(0), zIndex: 3, width: '1%', paddingLeft: 0, paddingRight: 0, textAlign: 'center' }}><span style={{ ...label, display: 'inline-block', width: RANK_W }}>#</span></th>
          <th style={{ ...head, ...stick(RANK_W), zIndex: 3, width: '1%', textAlign: 'left', borderRight: `1px solid ${RULE}` }}>
            <span style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}><span style={label}>Player</span>{pager}</span>
          </th>
          {doc.many && <th data-lock style={{ ...head, ...lock(0), zIndex: narrow ? 2 : 3, width: '1%', textAlign: 'left' }}><span style={label}>Yr</span></th>}
          {BIO.map(([name], i) => <th key={name} data-lock style={{ ...head, ...lock(yr + i), zIndex: narrow ? 2 : 3, width: '1%', textAlign: i < 2 ? 'left' : 'right', ...edge(i) }}><span style={label}>{name}</span></th>)}
          {shown.stats.map((l, i) => {
            const on = sortLabel === l
            const years = doc.stats[l].years
            // A stat the last 30 days can't have: greyed, its cells empty.
            const na = doc.stats[l].na
            // A side's head is its side; a change's Δ stays on its name's last line.
            const part = doc.stats[l].head
            const name = part ? SIDES[part] : l.replace(/ Δ$/, '\u00a0Δ')
            const yearsAt = j => (j >= 0 && j < shown.stats.length ? doc.stats[shown.stats[j]].years : null)
            return (
              <th key={l} style={{ ...head, minWidth: part ? 46 : 58, scrollSnapAlign: 'start', scrollMarginLeft: held, boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none', ...(turnsDef(doc, shown, i) ? { borderLeft: '1px solid #837d76' } : {}), ...sideRule(doc, shown.stats, i, '#837d76'), ...(part || opened(doc, shown.stats, i) ? { borderTop: '1px solid #837d76' } : {}) }} aria-sort={on ? (reverse ? 'ascending' : 'descending') : 'none'}>
                {years && <Bracket years={years} start={yearsAt(i - 1) !== years} end={yearsAt(i + 1) !== years} />}
                {doc.stats[l].sub && <Expand open={open.has(l)} stat={l} toggle={() => toggle(l)} />}
                {sideStarts(doc, shown, i) && <span style={{ position: 'absolute', top: 4, left: 7, fontSize: 8, letterSpacing: '.14em', color: '#837d76', whiteSpace: 'nowrap' }}>{doc.stats[l].side === 'def' ? 'DEFENSE' : 'OFFENSE'}</span>}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                  {!na && setFilter && <ColumnFilter stat={l} share={filters[l]} set={setFilter} />}
                  <button type="button" className="lb-head-cell" disabled={na} onClick={() => onSort(l)} title={na ? 'Unavailable for the last 30 days' : on ? 'Sorted best first; click for worst first' : 'Sort by this stat, best first'}
                    style={{ ...label, display: 'flex', width: '100%', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 3, padding: 0, border: 0, background: 'transparent', cursor: na ? 'not-allowed' : 'pointer', textAlign: 'right', lineHeight: 1.25, color: na ? '#6a645e' : on ? INK : DIM, textDecoration: na ? 'line-through' : 'none' }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={na ? undefined : doc.stats[l].desc ? `${l}: ${doc.stats[l].desc}` : l}>{name}</span>
                    <span aria-hidden="true" style={{ width: 7, flex: 'none', textAlign: 'left', color: on ? INK : 'transparent' }}>{reverse ? '↑' : '↓'}</span>
                  </button>
                </div>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map(p => <Row key={p.id} p={p} rank={rank.get(p.id)} selected={picked === p.id} onPick={onPick} doc={doc} group={shown} sortLabel={sortLabel} pct={pct} narrow={narrow} lefts={lefts} bioCh={bioCh} />)}
      </tbody>
      {scroller && lefts.length > 0 && <Rail scroller={scroller} held={held} span={2 + yr + BIO.length + shown.stats.length} />}
    </table>
  )
}

export default memo(LeaderTable)
