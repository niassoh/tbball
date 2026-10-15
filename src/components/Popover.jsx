import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MONO } from '../lib/format.js'

const INK = '#ece8e3'
const DIM = '#a09a93'
const EDGE = '#544f4b'
// The space a panel keeps from the screen's edges.
const GUTTER = 16

// A box that opens a panel under it (the season, team and axis pickers): it closes on a
// press outside or Escape, and on a phone the panel shifts left to stay on screen.
// `trigger` is the box's content; `children(close)` the panel's. `width` fixes the box's
// width, so what it says never resizes it (a disabled box keeps its caret's room too).
// `accent`: a color for the box's edge; `shrink`: the box may narrow, its content cut short,
// where its line runs out of room (Footprint's REMOVE BEST pickers, two to a line).
export default function Popover({ name, trigger, children, disabled = false, align = 'left', minWidth = 240, width, accent, shrink = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const panel = useRef(null)
  const [nudge, setNudge] = useState(0)
  useLayoutEffect(() => {
    if (!open) return
    const box = ref.current.getBoundingClientRect()
    const room = document.documentElement.clientWidth - GUTTER
    const w = panel.current.offsetWidth
    setNudge(align === 'right' ? Math.max(0, w - box.right + GUTTER) : Math.min(0, room - box.left - w))
  }, [open, align])
  useEffect(() => {
    if (!open) return
    const outside = e => { if (!ref.current.contains(e.target)) setOpen(false) }
    const escape = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  const side = align === 'right' ? { right: -nudge } : { left: nudge }
  return (
    <span ref={ref} style={{ position: 'relative', flex: shrink ? '0 1 auto' : 'none', minWidth: shrink ? 0 : undefined }}>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={name} disabled={disabled} onClick={() => setOpen(o => !o)}
        style={{ height: 30, width, maxWidth: shrink ? '100%' : undefined, boxSizing: 'border-box', padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${accent || (open ? DIM : EDGE)}`, background: open ? '#3a3734' : 'transparent', color: INK, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>{trigger}</span>
        <span aria-hidden="true" style={{ fontSize: 7, color: DIM, visibility: disabled ? 'hidden' : 'visible' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-label={name} style={{ position: 'absolute', ...side, top: 'calc(100% + 6px)', zIndex: 20, width: 'max-content', minWidth, maxWidth: `calc(100vw - ${2 * GUTTER}px)`, display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: '#1f1d1c', border: '1px solid #837d76', boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </span>
  )
}
