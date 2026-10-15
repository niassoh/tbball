import { useEffect, useRef } from 'react'
import { MONO } from '../lib/format.js'
import { seasonsBetween, shortSeason, spanText } from '../lib/seasons.js'
import Popover from './Popover.jsx'

// The season picker shared by the Footprint and Lonestar tabs and the Leaderboard: one
// season or a span of them, from the seasons there are; `extra` adds a control to its
// panel (the Leaderboard's runs).
const INK = '#ece8e3'
const MID = '#b8b2ab'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }

// The year strip: every season from his first to his last ('97 … '26), cells joined like
// RAW | PCTL, in even rows of up to 13 (8 on a phone) so every year shows; those he has no
// stretch in are dim and can't be picked. Click one for that season; drag across, or
// shift-click, for a span (arrow keys move, shift + arrows stretch). The span's cells are
// lit like the season rail's pick, the accent under them. Over it, small quick spans: his
// last 2, 3 or 5 seasons, or all. Pointer events on the strip, not its cells, so a drag
// works by touch too (and across its rows).
const QUICK = [[2, 'L2'], [3, 'L3'], [5, 'L5']]
const LIT = '#3d3a37'
function YearRange({ seasons, from, to, pick }) {
  // It opens in the picker's panel, ready for the arrow keys.
  const root = useRef(null)
  useEffect(() => { root.current.focus({ preventScroll: true }) }, [])
  const all = seasonsBetween(seasons[0], seasons[seasons.length - 1])
  const has = new Set(seasons)
  const rows = Math.ceil(all.length / (window.matchMedia('(max-width: 560px)').matches ? 8 : 13))
  const cols = Math.ceil(all.length / rows)
  const anchor = useRef(from)
  const dragging = useRef(false)
  const span = (a, b) => (a <= b ? pick(a, b) : pick(b, a))
  const at = e => {
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-season]')
    return cell && has.has(cell.dataset.season) ? cell.dataset.season : null
  }
  const down = e => {
    const season = at(e)
    if (!season) return
    if (e.shiftKey) return span(anchor.current, season)
    anchor.current = season
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    pick(season, season)
  }
  const move = e => {
    const season = dragging.current && at(e)
    if (season) span(anchor.current, season)
  }
  const key = e => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key]
    if (!step) return
    e.preventDefault()
    const near = (x, d) => seasons[Math.min(seasons.length - 1, Math.max(0, seasons.indexOf(x) + d))]
    if (e.shiftKey) return step > 0 ? pick(from, near(to, 1)) : pick(near(from, -1), to)
    const next = near(step > 0 ? to : from, step)
    anchor.current = next
    pick(next, next)
  }
  const last = seasons[seasons.length - 1]
  const quick = QUICK.filter(([n]) => n < seasons.length).concat([[seasons.length, 'All']])
  // Each cell draws its own lines, so a last row short of the rest just ends.
  const lines = i => ({ borderStyle: 'solid', borderColor: EDGE, borderWidth: `${i < cols ? 1 : 0}px 1px 1px ${i % cols ? 0 : 1}px` })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 'min(440px, calc(100vw - 58px))' }}>
      <div role="group" aria-label="Quick spans" style={{ display: 'flex', alignSelf: 'flex-start', border: `1px solid ${EDGE}` }}>
        {quick.map(([n, name], i) => {
          const on = from === seasons[seasons.length - n] && to === last
          return (
            <button key={name} type="button" aria-pressed={on} aria-label={name === 'All' ? 'All seasons' : `Last ${n} seasons`} onClick={() => pick(seasons[seasons.length - n], last)}
              style={{ height: 22, padding: '0 9px', border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: on ? LIT : 'transparent', boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none', color: on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 9, fontWeight: on ? 700 : 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {name}
            </button>
          )
        })}
      </div>
      <div ref={root} role="group" aria-label={`Seasons: ${spanText(from, to)}`} tabIndex={0} className="year-strip" onPointerDown={down} onPointerMove={move}
        onPointerUp={() => { dragging.current = false }} onKeyDown={key}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, touchAction: 'none', userSelect: 'none' }}>
        {all.map((season, i) => {
          const lit = season >= from && season <= to
          const end = season === from || season === to
          return (
            <span key={season} data-season={season} data-has={has.has(season) ? 1 : 0}
              style={{ ...lines(i), boxSizing: 'border-box', height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: lit ? LIT : 'transparent', boxShadow: lit ? 'inset 0 -2px 0 var(--accent)' : 'none', color: lit ? INK : has.has(season) ? DIM : FAINT, fontFamily: MONO, fontSize: 10, fontWeight: end ? 700 : 500, letterSpacing: '.04em', cursor: has.has(season) ? 'pointer' : 'default' }}>
              {shortSeason(season)}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// The span picker: a box giving the span on show ("2025–26", or "’18–’26 · 9" for a span)
// that opens the year strip in a panel under it (Popover), the strip taking the arrow
// keys at once; a pick shows behind it as it's made. The strip sets the panel's width
// (the readout wraps inside it, so a pick never resizes it). With one season there's
// nothing to pick. `aside`: a small control beside the span's readout (the Leaderboard's
// single | combined). `readout`: what the box says in place of the span (the Leaderboard's
// eras).
export default function SeasonPicker({ seasons, from, to, n, pick, extra = null, aside = null, readout = null, title = 'Seasons', disabled = false, width }) {
  return (
    <Popover name={`${title}: ${readout || spanText(from, to)}`} disabled={disabled || seasons.length < 2} width={width}
      trigger={<>
        <span style={{ ...label, fontWeight: 400 }}>{title}</span>
        {readout || (from === to ? from.replace('-', '–') : `${shortSeason(from)}–${shortSeason(to)} · ${n}`)}
      </>}>
      {() => (
        <>
          <YearRange seasons={seasons} from={from} to={to} pick={pick} />
          <div style={{ contain: 'inline-size', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ ...label, color: MID }}>{spanText(from, to)}{n > 1 ? ` · ${n} seasons` : ''}</span>
              <span style={{ ...label, color: MID }}>Click a season · drag for a span</span>
            </div>
            {aside}
          </div>
          {extra}
        </>
      )}
    </Popover>
  )
}
