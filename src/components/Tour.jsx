import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MONO } from '../lib/format.js'

const INK = '#ece8e3'
const SOFT = '#d9d3cc'
const MUTED = '#b3ada6'
const DIM = '#a09a93'
const EDGE = '#544f4b'
// The card's margin from the screen's edges; the cutout's margin around its target; the
// card's distance from what it speaks for, room for its pointer (POINT, the pointer's
// square, half of it standing out of the card).
const GUTTER = 12
const PAD = 6
const GAP = 12
const POINT = 10
const CARD_W = 420
// A caption's main point, between ** marks, bold and tinted in its colour: `good:` a lift's
// blue, `bad:` a cost's orange (as the charts draw them), else ink.
const TONES = { good: '#8fb0e6', bad: '#fa962a' }
const rich = text => text.split('**').map((part, k) => {
  if (!(k % 2)) return part
  const [, tone, words] = part.match(/^(?:(good|bad):)?([\s\S]*)$/)
  const c = TONES[tone] || INK
  return <b key={k} style={{ color: c, fontWeight: 700, background: `color-mix(in srgb, ${c} 14%, transparent)`, padding: '1px 4px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{words}</b>
})
const LINE = '#837d76'
const CARD_BG = '#1f1d1c'

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
// The padded box around what a selector, or several, picks out; null while none is shown.
const boxOf = sels => {
  const rs = [].concat(sels).map(sel => document.querySelector(sel)).filter(Boolean).map(shownBox).filter(r => r.right > r.left && r.bottom > r.top)
  return rs.length
    ? { top: Math.min(...rs.map(x => x.top)) - PAD, left: Math.min(...rs.map(x => x.left)) - PAD, bottom: Math.max(...rs.map(x => x.bottom)) + PAD, right: Math.max(...rs.map(x => x.right)) + PAD }
    : null
}

// A guided tour of a feature (Footprint, Lonestar, the Leaderboard): the page dimmed but
// for a cutout around one control or datapoint at a time, and a caption card attached to it
// as a callout: under it (over it where there's no room under), aligned to it, a pointer on
// its edge aimed at it; the page scrolls so both are in view. Only a target too tall to
// show with its card gets the card pinned to the screen's foot. The card has the step count
// and BACK / NEXT, DONE on the last. Esc closes; the arrow keys step.
// `steps`: { target: a selector, or several for one cutout around them all; small: a
// smaller target for where the target and card don't both fit on screen; mark: a
// selector for one control in the cutout to outline, which the card then speaks for; title;
// text; action }. An action runs as its step comes up, so the page can show what the step
// says (the Leaderboard's switching to 5-year runs), and may return a function that runs as
// the step goes; a target not on the page yet (a board still loading, a panel opening) is
// waited for, and the card takes the keys back from whatever it opened.
// Steps are read on every render, so a caption follows the data.
// The cutout and card are placed in the page's coordinates, so they scroll with the page
// and the cutout only glides when the target itself moves.
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

  // Each step: its action, then every frame its target's box and where the card and its
  // pointer go. Once the target is there, the page scrolls (at once) to show it with the
  // card under it, below the profile's sticky bars.
  useEffect(() => {
    const s = live.current[i]
    const undo = s.action && s.action()
    let raf = 0
    let phase = 0
    const frame = () => {
      const st = live.current[i]
      const markEl = st.mark && document.querySelector(st.mark)
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight
      const shelf = GUTTER + [...document.querySelectorAll('.topbar, #tabs')].reduce((n, el) => n + el.offsetHeight, 0)
      const ch = card.current ? card.current.offsetHeight : 0
      const w = Math.min(CARD_W, vw - 2 * GUTTER)
      // The target, or its smaller stand-in where it and the card don't both fit on screen.
      let target = st.target
      let r = boxOf(target)
      if (r && st.small && r.bottom - r.top + GAP + ch > vh - GUTTER - shelf) r = boxOf(target = st.small)
      // Scrolled to once it's on the page, though not yet shown (a column scrolled out of its table).
      const first = document.querySelector([].concat(target)[0])
      if (first && phase === 0) {
        phase = 1
        first.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' })
        next.current.focus({ preventScroll: true })
        r = boxOf(target)
      }
      let g = { w, pinned: true }
      if (r) {
        const m = markEl && shownBox(markEl)
        const a = m && m.right > m.left ? { top: m.top - 3, left: m.left - 3, bottom: m.bottom + 3, right: m.right + 3 } : r
        // Target and card as one block, centred in the room the screen has, if it's out of it.
        const tall = a.bottom - a.top + GAP + ch
        if (phase === 1) {
          phase = 2
          const fits = tall <= vh - GUTTER - shelf
          const to = fits ? a.bottom + GAP + ch : a.bottom
          if (a.top < shelf || to > vh - GUTTER) window.scrollBy({ top: fits ? (a.top + to) / 2 - (shelf + vh - GUTTER) / 2 : a.top - shelf, behavior: 'instant' })
        }
        // Flush with the target's left edge, or centred on one narrower than the card; kept
        // on screen, the pointer sliding along to stay on the target.
        const mid = (a.left + a.right) / 2
        const left = Math.max(GUTTER, Math.min(a.right - a.left < w ? mid - w / 2 : a.left, vw - GUTTER - w))
        const under = a.bottom + GAP + ch <= vh - GUTTER
        const over = a.top - GAP - ch >= shelf
        const pinned = !under && !over
        const cardTop = pinned ? vh - GUTTER - ch : under ? a.bottom + GAP : a.top - GAP - ch
        const at = Math.max(POINT + 4, Math.min(mid - left, w - POINT - 4))
        g = {
          w,
          spot: { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.right - r.left, height: r.bottom - r.top },
          pinned,
          card: pinned ? { left, top: cardTop } : { left: left + window.scrollX, top: cardTop + window.scrollY },
          // Pinned, the pointer shows only where the target is above the card.
          point: pinned ? (a.top < cardTop - GAP ? { side: 'top', at } : null) : { side: under ? 'top' : 'bottom', at }
        }
        if (m && m.right > m.left) g.mark = { top: a.top + window.scrollY, left: a.left + window.scrollX, width: a.right - a.left, height: a.bottom - a.top }
      }
      setGeo(old => (JSON.stringify(old) === JSON.stringify(g) ? old : g))
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => {
      cancelAnimationFrame(raf)
      if (typeof undo === 'function') undo()
    }
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
      {geo && geo.mark && <div style={{ position: 'absolute', ...geo.mark, boxShadow: '0 0 0 2px var(--accent)', pointerEvents: 'none' }} />}
      <div ref={card} role="dialog" aria-label={`Tour: ${step.title}`}
        style={{ position: !geo || geo.pinned ? 'fixed' : 'absolute', ...(geo && geo.card ? geo.card : { left: GUTTER, bottom: GUTTER }), width: geo ? geo.w : CARD_W, boxSizing: 'border-box', background: CARD_BG, border: `1px solid ${LINE}`, boxShadow: '0 12px 32px rgba(0,0,0,.5)', fontFamily: MONO, visibility: geo ? 'visible' : 'hidden' }}>
        {/* The callout's pointer: a square turned on its edge, half out of the card, in the
            card's border, aimed at what the card speaks for. */}
        {geo && geo.point && (
          <span aria-hidden="true" style={{ position: 'absolute', left: geo.point.at - POINT / 2, [geo.point.side]: -POINT / 2 - 1, width: POINT, height: POINT, boxSizing: 'border-box', background: CARD_BG, border: `1px solid ${LINE}`, ...(geo.point.side === 'top' ? { borderRight: 0, borderBottom: 0 } : { borderLeft: 0, borderTop: 0 }), transform: 'rotate(45deg)' }} />
        )}
        <div aria-hidden="true" style={{ position: 'relative', display: 'flex', gap: 2 }}>
          {steps.map((_, k) => <span key={k} style={{ flex: 1, height: 2, background: k <= i ? 'var(--accent)' : EDGE }} />)}
        </div>
        <div key={i} className="tour-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px 0' }}>
          <span style={{ fontSize: 9, letterSpacing: '.14em', color: DIM }}>{i + 1} / {steps.length}</span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: INK }}>{step.title}</span>
          <p aria-live="polite" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.7, color: MUTED, textWrap: 'pretty' }}>{rich(step.text)}</p>
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
