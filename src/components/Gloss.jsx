import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MONO } from '../lib/format.js'
import { define } from '../lib/glossary.js'

const INK = '#ece8e3'
const DIM = '#a09a93'
// The space the panel keeps from the screen's edges, as Popover's, and from the label.
const GUTTER = 16
const GAP = 6

// A stat label that explains itself: pointing at it, focusing it or tapping it (a tap
// focuses it) shows the glossary's definition at once, in a panel like the lineup rank
// tooltip's, under the label (over it where the screen runs out). The panel lives on
// the body, fixed to the screen, so a scrolling table or a card's overflow can't clip
// it; it closes on a scroll rather than chase the label. `style` is the label's own (a
// label that's also a button keeps its pointer by passing one).
// A label the glossary doesn't know renders as is.
export default function Gloss({ term, style, children }) {
  const text = define(term)
  const id = useId()
  const ref = useRef(null)
  const panel = useRef(null)
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState(null)
  // Placed before it paints, so it never shows in the wrong spot (nor where it last was).
  useLayoutEffect(() => {
    if (!open) return
    const r = ref.current.getBoundingClientRect()
    const { offsetWidth: w, offsetHeight: h } = panel.current
    const left = Math.max(GUTTER, Math.min(r.left, document.documentElement.clientWidth - GUTTER - w))
    const top = r.bottom + GAP + h > window.innerHeight && r.top - GAP - h > 0 ? r.top - GAP - h : r.bottom + GAP
    setAt({ left, top })
  }, [open])
  useEffect(() => {
    if (!open) return undefined
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])
  if (!text) return <span style={style}>{children}</span>
  const show = () => setOpen(true)
  const hide = () => setOpen(false)
  return (
    <span ref={ref} tabIndex={0} aria-describedby={open ? id : undefined} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onKeyDown={e => e.key === 'Escape' && hide()}
      style={{ cursor: 'help', outline: 'none', ...style }}>
      {children}
      {open && createPortal(
        <span ref={panel} id={id} role="tooltip" style={{ position: 'fixed', ...(at || { left: 0, top: 0, visibility: 'hidden' }), zIndex: 50, width: 'max-content', maxWidth: `min(260px, calc(100vw - ${2 * GUTTER}px))`, boxSizing: 'border-box', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(31, 29, 28, .92)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid #6b655f', boxShadow: '0 10px 28px rgba(0,0,0,.55)', pointerEvents: 'none', textAlign: 'left', whiteSpace: 'normal' }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: DIM }}>{term}</span>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11.5, fontWeight: 400, lineHeight: 1.45, letterSpacing: 'normal', color: INK }}>{text}</span>
        </span>,
        document.body
      )}
    </span>
  )
}
