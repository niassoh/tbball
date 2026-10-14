import { useEffect, useRef } from 'react'
import { MONO } from '../lib/format.js'
import { seasonsBetween, shortSeason, spanText } from '../lib/seasons.js'
import Popover from './Popover.jsx'

// The season picker shared by the Footprint and Lonestar tabs and the Leaderboard: one
// season or a span of them, from the seasons there are; `extra` adds a control to its
// panel (the Leaderboard's runs).
const INK = '#ece8e3'
const SOFT = '#d9d3cc'
const MID = '#b8b2ab'
const DIM = '#a09a93'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }

// The span slider: a track of every season from his first to his last, a stop each (one
// he has no stretch in is dim and can't be picked), and a square handle at each end of the
// span. A tap on the track picks that one season; a drag slides the nearer handle,
// snapping to his seasons (both handles on one season: the drag's way decides which), the
// panel showing the pick as it's made. Each handle takes the arrow keys. Over it, quick
// spans: his last 1, 2, 3 or 5 seasons, or all. The track takes the pointer (and only it
// keeps touch from scrolling), so it works the same by mouse and by finger.
const HANDLE = 18
const QUICK = [[1, 'Last 1'], [2, 'Last 2'], [3, 'Last 3'], [5, 'Last 5']]
const DRAG_PX = 4
function SeasonRange({ seasons, from, to, pick }) {
  const all = seasonsBetween(seasons[0], seasons[seasons.length - 1])
  const has = new Set(seasons)
  const track = useRef(null)
  const last = useRef(null)
  // It opens ready for the arrow keys, on the span's last season.
  useEffect(() => { last.current.focus({ preventScroll: true }) }, [])
  const drag = useRef(null)
  const pos = x => (all.length > 1 ? all.indexOf(x) / (all.length - 1) : 0.5)
  const nearest = f => seasons.reduce((b, x) => (Math.abs(pos(x) - f) < Math.abs(pos(b) - f) ? x : b), seasons[0])
  const at = e => {
    const r = track.current.getBoundingClientRect()
    return nearest(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
  }
  // One end of the span to season x, held from crossing the other.
  const move = (end, x) => (end === 'from' ? pick(x > to ? to : x, to) : pick(from, x < from ? from : x))
  const down = e => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const x = at(e)
    const end = from === to ? null : Math.abs(pos(x) - pos(from)) <= Math.abs(pos(x) - pos(to)) ? 'from' : 'to'
    drag.current = { x0: e.clientX, end, moved: false }
  }
  const over = e => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.abs(e.clientX - d.x0) < DRAG_PX) return
    d.moved = true
    const x = at(e)
    if (!d.end) d.end = x < from ? 'from' : x > to ? 'to' : null
    if (d.end) move(d.end, x)
  }
  const up = e => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved && e.type === 'pointerup') {
      const x = at(e)
      pick(x, x)
    }
  }
  const step = (x, by) => seasons[Math.min(seasons.length - 1, Math.max(0, seasons.indexOf(x) + by))]
  const key = end => e => {
    const by = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key]
    const x = by ? step(end === 'from' ? from : to, by) : e.key === 'Home' ? seasons[0] : e.key === 'End' ? seasons[seasons.length - 1] : null
    if (!x) return
    e.preventDefault()
    move(end, x)
  }
  // Labels at about seven even steps and the last season, the span's in ink.
  const every = Math.max(1, Math.ceil(all.length / 7))
  const labels = all.filter((x, i) => i % every === 0 && (all.length - 1 - i >= every / 2 || i === all.length - 1)).concat(all.length > 1 && (all.length - 1) % every ? [all[all.length - 1]] : [])
  const quick = QUICK.filter(([n]) => n < seasons.length).concat([[seasons.length, 'All']])
  const pad = `0 ${HANDLE / 2}px`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 'min(440px, calc(100vw - 58px))' }}>
      <div role="group" aria-label="Quick spans" style={{ display: 'flex', border: `1px solid ${EDGE}` }}>
        {quick.map(([n, name], i) => {
          const a = seasons[seasons.length - n]
          const b = seasons[seasons.length - 1]
          const on = from === a && to === b
          return (
            <button key={name} type="button" aria-pressed={on} onClick={() => pick(a, b)}
              style={{ flex: 1, height: 30, border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: on ? '#3a3734' : 'transparent', color: on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {name}
            </button>
          )
        })}
      </div>
      <div ref={track} onPointerDown={down} onPointerMove={over} onPointerUp={up} onPointerCancel={up}
        style={{ position: 'relative', height: 36, margin: pad, touchAction: 'none', userSelect: 'none', cursor: 'pointer' }}>
        <span style={{ position: 'absolute', left: 0, right: 0, top: 17, height: 2, background: EDGE }} />
        {all.map(x => <span key={x} style={{ position: 'absolute', left: `${pos(x) * 100}%`, top: 12, width: 1, height: 12, marginLeft: -0.5, background: has.has(x) ? '#837d76' : '#3d3a37' }} />)}
        <span style={{ position: 'absolute', left: `${pos(from) * 100}%`, width: `${(pos(to) - pos(from)) * 100}%`, top: 16, height: 4, background: SOFT }} />
        {[['from', from], ['to', to]].map(([end, x]) => (
          <span key={end} ref={end === 'to' ? last : undefined} role="slider" tabIndex={0} className="span-handle" onKeyDown={key(end)}
            aria-label={end === 'from' ? 'First season' : 'Last season'} aria-valuemin={0} aria-valuemax={all.length - 1} aria-valuenow={all.indexOf(x)} aria-valuetext={x.replace('-', '–')}
            style={{ position: 'absolute', left: `${pos(x) * 100}%`, top: 18 - HANDLE / 2, width: HANDLE, height: HANDLE, marginLeft: -HANDLE / 2, boxSizing: 'border-box', background: '#1f1d1c', border: `2px solid ${INK}`, zIndex: end === 'to' ? 2 : 1 }} />
        ))}
      </div>
      <div aria-hidden="true" style={{ position: 'relative', height: 12, margin: pad }}>
        {labels.map(x => <span key={x} style={{ ...label, position: 'absolute', left: `${pos(x) * 100}%`, transform: 'translateX(-50%)', letterSpacing: '.04em', color: x >= from && x <= to ? INK : DIM }}>{shortSeason(x)}</span>)}
      </div>
    </div>
  )
}

// The span picker: a box giving the span on show ("2025–26", or "’18–’26 · 9" for a span)
// that opens the span slider in a panel under it (Popover), its last handle taking the
// arrow keys at once; a pick shows behind it as it's made. The slider sets the panel's
// width (the readout wraps inside it, so a pick never resizes it). With one season there's
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
          <SeasonRange seasons={seasons} from={from} to={to} pick={pick} />
          <div style={{ contain: 'inline-size', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ ...label, color: MID }}>{spanText(from, to)}{n > 1 ? ` · ${n} seasons` : ''}</span>
              <span style={{ ...label, color: MID }}>Tap a season · drag a handle for a span</span>
            </div>
            {aside}
          </div>
          {extra}
        </>
      )}
    </Popover>
  )
}
