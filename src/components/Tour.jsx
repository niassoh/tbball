import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MONO } from '../lib/format.js'

const INK = '#ece8e3'
const SOFT = '#d9d3cc'
const DIM = '#a09a93'
const EDGE = '#544f4b'
const GUTTER = 16
// The cutout's margin around its target, and the card's distance from the cutout.
const PAD = 6
const GAP = 10
const CARD_W = 340

// The tour button, drawn as the controls around it are (`height`: theirs).
export function TourButton({ onClick, height = 30 }) {
  return (
    <button type="button" onClick={onClick} title="A short guided tour of this view"
      style={{ height, flex: 'none', padding: '0 12px', border: `1px solid ${EDGE}`, background: 'transparent', color: '#c9c3bc', fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      Tour
    </button>
  )
}

// A target's box cut to what the boxes it scrolls in show (a table row runs on past its
// table's edge).
const shownBox = el => {
  let { top, left, bottom, right } = el.getBoundingClientRect()
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p)
    if (o.overflowX === 'visible' && o.overflowY === 'visible') continue
    const b = p.getBoundingClientRect()
    top = Math.max(top, b.top)
    left = Math.max(left, b.left)
    bottom = Math.min(bottom, b.bottom)
    right = Math.min(right, b.right)
  }
  return { top, left, bottom, right }
}

// A guided tour of a feature (Footprint, Lonestar, the Leaderboard): the page dimmed but
// for a cutout around one control or datapoint at a time, and a caption card under it (over
// it where there's no room under; pinned to the screen's foot where there's room for neither),
// with the step count and BACK / NEXT, DONE on the last. Esc closes; the arrow keys step.
// `steps`: { target: a selector, or several for one cutout around them all; title; text;
// action }. An action runs as its step comes up, so the page can show what the step says
// (the Leaderboard's switching to 5-year runs); a target not on the page yet (a board still
// loading) is waited for. Steps are read on every render, so a caption follows the data.
// The cutout is placed in the page's coordinates, so it scrolls with the page and only
// glides when the target itself moves (a new step, the page's layout changing under it).
export default function Tour({ steps, onClose }) {
  const [i, setI] = useState(0)
  const [geo, setGeo] = useState(null)
  const card = useRef(null)
  const next = useRef(null)
  const live = useRef(steps)
  useLayoutEffect(() => { live.current = steps })
  const step = steps[Math.min(i, steps.length - 1)]
  const last = i >= steps.length - 1
  const go = d => (d > 0 && last ? onClose() : setI(n => Math.max(0, n + d)))

  useEffect(() => {
    const back = document.activeElement
    next.current.focus({ preventScroll: true })
    return () => back && back.focus && back.focus({ preventScroll: true })
  }, [])
  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  })

  // Each step: its action, then every frame its target's box (scrolled to the screen's
  // middle once it's there) and where the card goes.
  useEffect(() => {
    const s = live.current[i]
    if (s.action) s.action()
    let raf = 0
    let found = false
    const frame = () => {
      const els = [].concat(live.current[i].target).map(sel => document.querySelector(sel)).filter(Boolean)
      if (els.length && !found) {
        found = true
        els[0].scrollIntoView({ block: 'center', inline: 'center' })
      }
      const rs = els.map(shownBox).filter(r => r.right > r.left && r.bottom > r.top)
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight
      const ch = card.current ? card.current.offsetHeight : 0
      const w = Math.min(CARD_W, vw - 2 * GUTTER)
      let g = { w, pinned: true }
      if (rs.length) {
        const r = {
          top: Math.min(...rs.map(x => x.top)) - PAD,
          left: Math.min(...rs.map(x => x.left)) - PAD,
          bottom: Math.max(...rs.map(x => x.bottom)) + PAD,
          right: Math.max(...rs.map(x => x.right)) + PAD
        }
        const left = Math.max(GUTTER, Math.min(r.left, vw - GUTTER - w))
        const under = r.bottom + GAP + ch <= vh - GUTTER
        const over = r.top - GAP - ch >= GUTTER
        g = {
          w,
          spot: { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.right - r.left, height: r.bottom - r.top },
          pinned: !under && !over,
          card: { left: left + window.scrollX, top: (under ? r.bottom + GAP : r.top - GAP - ch) + window.scrollY }
        }
      }
      setGeo(old => (JSON.stringify(old) === JSON.stringify(g) ? old : g))
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [i])

  const spot = geo && geo.spot
  const button = primary => ({ height: 30, padding: '0 14px', border: `1px solid ${primary ? INK : EDGE}`, background: primary ? INK : 'transparent', color: primary ? '#1f1d1c' : SOFT, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' })
  return createPortal(
    <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1000 }}>
      {/* The page stays still under the tour: a press anywhere but the card does nothing. */}
      <div style={{ position: 'fixed', inset: 0 }} />
      {spot
        ? <div className="tour-spot" style={{ position: 'absolute', ...spot, boxShadow: `0 0 0 1px ${INK}, 0 0 0 200vmax rgba(20, 19, 18, .72)`, pointerEvents: 'none' }} />
        : <div style={{ position: 'fixed', inset: 0, background: 'rgba(20, 19, 18, .72)', pointerEvents: 'none' }} />}
      <div ref={card} role="dialog" aria-label={`Tour: ${step.title}`}
        style={{ position: !geo || geo.pinned ? 'fixed' : 'absolute', ...(!geo || geo.pinned ? { left: '50%', bottom: GUTTER, transform: 'translateX(-50%)' } : geo.card), width: geo ? geo.w : CARD_W, boxSizing: 'border-box', background: '#1f1d1c', border: '1px solid #837d76', boxShadow: '0 12px 32px rgba(0,0,0,.5)', fontFamily: MONO, visibility: geo ? 'visible' : 'hidden' }}>
        <div aria-hidden="true" style={{ display: 'flex', gap: 2 }}>
          {steps.map((_, k) => <span key={k} style={{ flex: 1, height: 2, background: k <= i ? 'var(--accent)' : EDGE }} />)}
        </div>
        <div key={i} className="tour-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px 0' }}>
          <span style={{ fontSize: 9, letterSpacing: '.14em', color: DIM }}>{i + 1} / {steps.length}</span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: INK }}>{step.title}</span>
          <p aria-live="polite" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: SOFT, textWrap: 'pretty' }}>{step.text}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 14px' }}>
          <button type="button" onClick={onClose} style={{ ...button(false), border: 0, padding: 0, color: DIM }}>Close</button>
          <span style={{ flex: 1 }} />
          {i > 0 && <button type="button" onClick={() => go(-1)} style={button(false)}>Back</button>}
          <button ref={next} type="button" onClick={() => go(1)} style={button(true)}>{last ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
