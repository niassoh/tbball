import { useEffect } from 'react'

// Drag to pan a scroll box with the mouse, as a map pans: the Leaderboard's table, whose
// sideways scroll otherwise means reaching its scrollbar at the bottom. A press that
// moves a few pixels pans instead of clicking, and the click it ends with is swallowed so
// it doesn't also pick a row; a press without moving clicks as before. Presses on a
// control (a sort header, a filter, the rail) keep theirs. Touch scrolls natively.
// `ready`: the box is mounted (the Leaderboard's table waits for its board).
const MOVE = 4

export function useDragScroll(ref, ready = true) {
  useEffect(() => {
    const box = ref.current
    if (!box) return
    let press = null
    const down = e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button, input, select, a, [role=scrollbar]')) return
      press = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop, moved: false }
    }
    const move = e => {
      if (!press) return
      const dx = e.clientX - press.x
      const dy = e.clientY - press.y
      if (!press.moved && Math.hypot(dx, dy) < MOVE) return
      if (!press.moved) {
        press.moved = true
        box.classList.add('dragging')
      }
      box.scrollLeft = press.left - dx
      box.scrollTop = press.top - dy
    }
    const swallow = e => { e.stopPropagation(); e.preventDefault() }
    const up = () => {
      if (press && press.moved) {
        box.classList.remove('dragging')
        // The click that ends a drag comes right after this; nothing else is swallowed.
        box.addEventListener('click', swallow, true)
        setTimeout(() => box.removeEventListener('click', swallow, true), 0)
      }
      press = null
    }
    box.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      box.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [ref, ready])
}
