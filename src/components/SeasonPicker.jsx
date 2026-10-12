import { useEffect, useRef } from 'react'
import { MONO } from '../lib/format.js'
import { seasonsBetween, shortSeason, spanText } from '../lib/seasons.js'
import Popover from './Popover.jsx'

// The season picker shared by the Footprint and Lonestar tabs (one season or a span of
// them, from every season a player has a view for) and the Leaderboard (`single`: one
// season).
const INK = '#ece8e3'
const SOFT = '#d9d3cc'
const MID = '#b8b2ab'
const DIM = '#8a847e'
const FAINT = '#5f5a55'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }

// The year strip: every season from his first to his last ('14 … '26), cells joined like
// RAW | PCTL; those he has no stretch in are dim and can't be picked. Click one for that
// season; drag across, or shift-click, for a span (arrow keys move, shift + arrows
// stretch). The span's cells are lit with a bar under them, like a loop region. Pointer
// events on the strip, not its cells, so a drag works by touch too. `single`: one season
// only (a drag moves it).
function YearRange({ seasons, from, to, pick, single }) {
  // It opens in the picker's panel, ready for the arrow keys.
  const root = useRef(null)
  useEffect(() => { root.current.focus({ preventScroll: true }) }, [])
  const all = seasonsBetween(seasons[0], seasons[seasons.length - 1])
  const has = new Set(seasons)
  const anchor = useRef(from)
  const dragging = useRef(false)
  const span = (a, b) => (single ? pick(b, b) : a <= b ? pick(a, b) : pick(b, a))
  const at = e => {
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-season]')
    return cell && has.has(cell.dataset.season) ? cell.dataset.season : null
  }
  const down = e => {
    const season = at(e)
    if (!season) return
    if (e.shiftKey && !single) return span(anchor.current, season)
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
    const near = (s, d) => seasons[Math.min(seasons.length - 1, Math.max(0, seasons.indexOf(s) + d))]
    if (e.shiftKey && !single) return step > 0 ? pick(from, near(to, 1)) : pick(near(from, -1), to)
    const next = near(step > 0 ? to : from, step)
    anchor.current = next
    pick(next, next)
  }
  return (
    <div ref={root} role="group" aria-label={`Seasons: ${spanText(from, to)}`} tabIndex={0} className="year-strip" onPointerDown={down} onPointerMove={move}
      onPointerUp={() => { dragging.current = false }} onKeyDown={key}
      style={{ display: 'flex', border: `1px solid ${EDGE}`, touchAction: 'none', userSelect: 'none', minWidth: 0 }}>
      {all.map((season, i) => {
        const lit = season >= from && season <= to
        const end = season === from || season === to
        return (
          <span key={season} data-season={season} data-has={has.has(season) ? 1 : 0}
            style={{ position: 'relative', flex: '1 1 0', minWidth: 26, height: 28, padding: '0 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderLeft: i ? `1px solid ${EDGE}` : 'none', background: lit ? '#3a3734' : 'transparent', color: lit ? INK : has.has(season) ? DIM : FAINT, fontSize: 10, fontWeight: end ? 700 : 500, letterSpacing: '.04em', cursor: has.has(season) ? 'pointer' : 'default' }}>
            {shortSeason(season)}
            {lit && <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: SOFT }} />}
          </span>
        )
      })}
    </div>
  )
}

// The span picker: a box giving the span on show ("2025–26", or "’18–’26 · 9" for a span)
// that opens the year strip in a panel under it (Popover), the strip taking the arrow
// keys at once; a pick shows behind it as it's made. The strip sets the panel's width
// (the readout wraps inside it, so a pick never resizes it). With one season there's
// nothing to pick.
export default function SeasonPicker({ seasons, from, to, n, pick, single = false }) {
  return (
    <Popover name={`Seasons: ${spanText(from, to)}`} disabled={seasons.length < 2}
      trigger={<>
        <span style={{ ...label, fontWeight: 400 }}>{single ? 'Season' : 'Seasons'}</span>
        {from === to ? from.replace('-', '–') : `${shortSeason(from)}–${shortSeason(to)} · ${n}`}
      </>}>
      {() => (
        <>
          <YearRange seasons={seasons} from={from} to={to} pick={pick} single={single} />
          <div style={{ contain: 'inline-size', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ ...label, color: MID }}>{spanText(from, to)}{n > 1 ? ` · ${n} seasons` : ''}</span>
            <span style={{ ...label, color: FAINT }}>{single ? 'Click a season · arrows step' : 'Click a season · drag for a span'}</span>
          </div>
        </>
      )}
    </Popover>
  )
}
