import { useEffect, useRef } from 'react'
import { MONO } from '../lib/format.js'
import { emptyNote } from '../lib/seasons.js'

// The season control over the bio and percentile cards: a strip with the season
// stepped back and forward at its left, then every season of his career as a tick
// (labelled by the year it ended; dim when he has none of the type's values, its hover
// saying why) to jump straight
// to, and a play button to walk the career one season at a time. Arrow keys step while it
// has focus. When the ticks don't all fit (narrow screens) they scroll, keeping the picked
// one in view.
const RULE = '#544f4b'
const DIM = '#a09a93'
const INK = '#ece8e3'
const cell = { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', fontFamily: MONO, color: DIM, cursor: 'pointer', padding: 0 }

export default function SeasonRail({ seasons, type, index, onPick, playing, onTogglePlay }) {
  const last = seasons.length - 1
  const strip = useRef(null)
  useEffect(() => {
    const box = strip.current
    const tick = box && box.children[index]
    if (!tick) return
    if (tick.offsetLeft < box.scrollLeft) box.scrollLeft = tick.offsetLeft
    else if (tick.offsetLeft + tick.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollLeft = tick.offsetLeft + tick.offsetWidth - box.clientWidth
  }, [index])
  const step = d => onPick(Math.max(0, Math.min(last, index + d)))
  const onKey = e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
  }
  return (
    <div role="group" aria-label="Season for the bio and percentile cards" onKeyDown={onKey} style={{ display: 'flex', alignItems: 'stretch', height: 30, border: `1px solid ${RULE}`, background: '#2c2a28', fontFamily: MONO, minWidth: 0 }}>
      <button type="button" aria-label="Previous season" disabled={index <= 0} onClick={() => step(-1)} className="rail-step" style={{ ...cell, width: 28, fontSize: 11, borderRight: `1px solid ${RULE}`, opacity: index <= 0 ? 0.35 : 1 }}>◂</button>
      <span aria-live="polite" style={{ ...cell, cursor: 'default', padding: '0 12px', minWidth: 74, fontSize: 13, fontWeight: 700, color: INK, letterSpacing: '.02em' }}>{seasons[index].label}</span>
      <button type="button" aria-label="Next season" disabled={index >= last} onClick={() => step(1)} className="rail-step" style={{ ...cell, width: 28, fontSize: 11, borderLeft: `1px solid ${RULE}`, borderRight: `1px solid ${RULE}`, opacity: index >= last ? 0.35 : 1 }}>▸</button>
      <div ref={strip} style={{ position: 'relative', display: 'flex', flex: 1, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {seasons.map((s, i) => {
          const on = i === index
          return (
            <button key={s.season} type="button" aria-pressed={on} aria-label={s.label} title={s.empty ? `${s.label} · ${emptyNote(s, type).toLowerCase()}` : s.label} onClick={() => onPick(i)} className="rail-tick"
              style={{ ...cell, flex: '1 0 30px', fontSize: 10, letterSpacing: '.02em', borderRight: i < last ? `1px solid #3d3a37` : 'none', color: on ? INK : s.empty ? '#6a645e' : DIM, fontWeight: on ? 700 : 400, background: on ? '#3d3a37' : 'transparent', boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none' }}>
              ’{s.label.slice(-2)}
            </button>
          )
        })}
      </div>
      {last > 0 && (
        <button type="button" onClick={onTogglePlay} aria-label={playing ? 'Pause career playback' : 'Play career season by season'} title={playing ? 'Pause' : 'Play the career'} className="rail-step"
          style={{ ...cell, width: 34, borderLeft: `1px solid ${RULE}`, color: playing ? INK : DIM }}>
          {/* Hard-edged glyphs: a solid triangle, or two bars while playing. */}
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ display: 'block' }}>
            {playing
              ? <><rect x="1.5" y="1" width="2.5" height="8" fill="currentColor" /><rect x="6" y="1" width="2.5" height="8" fill="currentColor" /></>
              : <polygon points="2,1 9,5 2,9" fill="currentColor" />}
          </svg>
        </button>
      )}
    </div>
  )
}
