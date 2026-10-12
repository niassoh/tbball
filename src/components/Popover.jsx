import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MONO } from '../lib/format.js'

const INK = '#ece8e3'
const DIM = '#8a847e'
const EDGE = '#544f4b'
// The space a panel keeps from the screen's edges.
const GUTTER = 16

// A box that opens a panel under it (the season, team and axis pickers): it closes on a
// press outside or Escape, and on a phone the panel shifts left to stay on screen.
// `trigger` is the box's content; `children(close)` the panel's.
export default function Popover({ name, trigger, children, disabled = false, align = 'left', minWidth = 240 }) {
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
    <span ref={ref} style={{ position: 'relative', flex: 'none' }}>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={name} disabled={disabled} onClick={() => setOpen(o => !o)}
        style={{ height: 30, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 10, border: `1px solid ${open ? DIM : EDGE}`, background: open ? '#3a3734' : 'transparent', color: INK, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
        {trigger}
        {!disabled && <span aria-hidden="true" style={{ fontSize: 7, color: DIM }}>{open ? '▲' : '▼'}</span>}
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-label={name} style={{ position: 'absolute', ...side, top: 'calc(100% + 6px)', zIndex: 20, width: 'max-content', minWidth, maxWidth: `calc(100vw - ${2 * GUTTER}px)`, display: 'flex', flexDirection: 'column', gap: 10, padding: 12, background: '#1f1d1c', border: '1px solid #6b655f', boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </span>
  )
}
