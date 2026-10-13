import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO, fmt, heat } from '../lib/format.js'
import { initials } from '../lib/teams.js'

// The Leaderboard's table, compact: rank (in the sorted stat, among the whole season),
// the player, his team, position, age, games and minutes that season, then the picked
// group's stats; the player and his details take no more room than they need, the stats
// share the rest; the rank, player and his details stay put when the stats scroll
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
// index.css).
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
const BIO = [['TM', p => p.team], ['POS', p => p.pos || '—'], ['AGE', p => (p.age === null ? '—' : Math.floor(p.age))], ['GP', p => p.gp ?? '—'], ['MIN', p => (p.mp === null ? '—' : p.mp.toLocaleString())]]

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

function LeaderTable({ doc, group, rows, rank, sortLabel, reverse, onSort, picked, onPick, scroller, pct = false }) {
  const cell = { height: 26, padding: '0 7px', borderBottom: `1px solid ${RULE}`, whiteSpace: 'nowrap' }
  const head = { position: 'sticky', top: 0, zIndex: 2, height: 46, boxSizing: 'border-box', padding: '15px 7px 6px', borderBottom: `1px solid ${RULE}`, textAlign: 'right', verticalAlign: 'bottom' }
  const stick = left => ({ position: 'sticky', left, zIndex: 1 })
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
  const lock = k => (lefts.length && !narrow ? stick(lefts[k]) : {})
  const held = !lefts.length ? 0 : narrow ? lefts[0] : lefts[lefts.length - 1]
  // The held block's right edge, a rule the stats slide under.
  const edge = i => (i === BIO.length - 1 ? { borderRight: `1px solid ${RULE}` } : {})
  const yr = doc.many ? 1 : 0
  return (
    <table className="lb-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr ref={headRow}>
          <th style={{ ...head, ...stick(0), zIndex: 3, width: '1%', paddingLeft: 0, paddingRight: 0, textAlign: 'center' }}><span style={{ ...label, display: 'inline-block', width: RANK_W }}>#</span></th>
          <th style={{ ...head, ...stick(RANK_W), zIndex: 3, width: '1%', textAlign: 'left', borderRight: `1px solid ${RULE}` }}><span style={label}>Player</span></th>
          {doc.many && <th data-lock style={{ ...head, ...lock(0), zIndex: narrow ? 2 : 3, width: '1%', textAlign: 'left' }}><span style={label}>Yr</span></th>}
          {BIO.map(([name], i) => <th key={name} data-lock style={{ ...head, ...lock(yr + i), zIndex: narrow ? 2 : 3, width: '1%', textAlign: i < 2 ? 'left' : 'right', ...edge(i) }}><span style={label}>{name}</span></th>)}
          {group.stats.map((l, i) => {
            const on = sortLabel === l
            const years = doc.stats[l].years
            // A stat the last 30 days can't have: greyed, its cells empty.
            const na = doc.stats[l].na
            const yearsAt = j => (j >= 0 && j < group.stats.length ? doc.stats[group.stats[j]].years : null)
            return (
              <th key={l} style={{ ...head, minWidth: 58, scrollSnapAlign: 'start', scrollMarginLeft: held, boxShadow: on ? `inset 0 -2px 0 ${INK}` : 'none' }} aria-sort={on ? (reverse ? 'ascending' : 'descending') : 'none'}>
                {years && <Bracket years={years} start={yearsAt(i - 1) !== years} end={yearsAt(i + 1) !== years} />}
                <button type="button" className="lb-head-cell" disabled={na} onClick={() => onSort(l)} title={na ? 'Unavailable for the last 30 days' : on ? 'Sorted best first; click for worst first' : 'Sort by this stat, best first'}
                  style={{ ...label, display: 'flex', width: '100%', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 3, padding: 0, border: 0, background: 'transparent', cursor: na ? 'not-allowed' : 'pointer', textAlign: 'right', lineHeight: 1.25, color: na ? '#6a645e' : on ? INK : DIM, textDecoration: na ? 'line-through' : 'none' }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={na ? undefined : l}>{l}</span>
                  <span aria-hidden="true" style={{ width: 7, flex: 'none', textAlign: 'left', color: on ? INK : 'transparent' }}>{reverse ? '↑' : '↓'}</span>
                </button>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map(p => {
          const lit = new Set(p.lit || [])
          return (
            <tr key={p.id} data-id={p.id} className="lb-row" aria-selected={picked === p.id} onClick={() => onPick(p.id)}>
              <td style={{ ...cell, ...stick(0), padding: 0, textAlign: 'center', color: DIM, fontSize: 10.5 }}><span style={{ display: 'inline-block', width: RANK_W }}>{rank.get(p.id) ?? '—'}</span></td>
              <td style={{ ...cell, ...stick(RANK_W), padding: '0 8px 0 4px', borderRight: `1px solid ${RULE}` }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Face p={p} />
                  <span title={p.name} style={{ maxWidth: narrow ? 84 : 130, fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis' }}>{short(p.name)}</span>
                  {p.era && <span style={{ flex: 'none', fontFamily: MONO, fontSize: 9.5, color: FAINT, letterSpacing: '.04em' }}>’{p.era[0].slice(2, 4)}–’{p.era[1].slice(5)}</span>}
                </span>
              </td>
              {doc.many && <td style={{ ...cell, ...lock(0), color: '#b8b2ab', fontSize: 10.5 }}>’{p.season.slice(5)}</td>}
              {BIO.map(([name, of], i) => <td key={name} style={{ ...cell, ...lock(yr + i), textAlign: i < 2 ? 'left' : 'right', color: i < 2 ? '#b8b2ab' : DIM, fontSize: i < 2 ? 10.5 : 11.5, ...edge(i) }}>{of(p)}</td>)}
              {group.stats.map(l => {
                const k = doc.labels.indexOf(l)
                const stat = doc.stats[l]
                const v = p.v[k]
                const pc = p.p[k]
                const shade = v === null || pc === null ? undefined : stat.neutral ? plain(pc) : heat(pc)
                return (
                  <td key={l} style={{ ...cell, textAlign: 'right', background: shade, color: v === null ? FAINT : INK, fontWeight: sortLabel === l ? 600 : 400 }}>
                    {lit.has(k) && <span aria-label="clears the noise" style={{ display: 'inline-block', width: 4, height: 4, marginRight: 5, verticalAlign: 2, background: INK }} />}
                    {pct ? (v === null || pc === null ? '—' : pc) : fmt(stat, v)}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
      {scroller && lefts.length > 0 && <Rail scroller={scroller} held={held} span={2 + yr + BIO.length + group.stats.length} />}
    </table>
  )
}

export default memo(LeaderTable)
