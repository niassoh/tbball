import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { bestFit, depthSlot, slotName } from '../lib/depth.js'

const COLS = 6
const CELL = 46
const WIDTH = COLS * CELL + (COLS - 1) + 2

// Team switcher: a small popover under the clicked trigger (the header logo or the depth
// chart's team name) with every team's logo on a hard grid. Picking a team opens the
// player in the viewed player's depth slot there (Jokic, the starting C, opens each
// team's starting C); the line under the grid says who, for the team under the pointer.
export default function TeamPicker({ profile: p, anchor, onClose }) {
  const [teams, setTeams] = useState(null)
  const [failed, setFailed] = useState(false)
  const [hover, setHover] = useState(null)
  // Bumped on resize so the panel re-anchors to its trigger (which moves as the
  // centred layout reflows) instead of closing; mobile browsers resize on scroll.
  const [, setLayout] = useState(0)
  const panel = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    loadTeams().then(t => live && setTeams(t)).catch(() => live && setFailed(true))
    const key = e => { if (e.key === 'Escape') onClose() }
    // Outside presses close it; presses on a trigger are left to its own toggle.
    const press = e => { if (!panel.current.contains(e.target) && !e.target.closest('.team-switch')) onClose() }
    const reflow = () => setLayout(n => n + 1)
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', press)
    window.addEventListener('resize', reflow)
    return () => {
      live = false
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', press)
      window.removeEventListener('resize', reflow)
    }
  }, [onClose])

  // Not on his team's chart (or no chart): his listed position, as a starter.
  const slot = depthSlot(p.depth, p.slug) || { pos: p.bio.position || 'SF', index: 0 }
  const fits = teams && Object.fromEntries(teams.map(t => [t.team, t.team === p.team ? null : bestFit(slot, t.depth)]))
  const shown = teams && hover && teams.find(t => t.team === hover)
  const line = failed ? "COULDN'T LOAD TEAMS"
    : !teams ? 'LOADING TEAMS…'
    : !shown ? `${slotName(slot)} ON EACH TEAM`
    : shown.team === p.team ? `${shown.name.toUpperCase()} · CURRENT`
    : fits[shown.team] ? `${shown.name.toUpperCase()} → ${fits[shown.team].player.name.toUpperCase()}`
    : `${shown.name.toUpperCase()} · NO PLAYER`
  // Just below the trigger (page coordinates, so it scrolls with the page), kept inside
  // the page horizontally.
  const r = anchor.getBoundingClientRect()
  const top = r.bottom + window.scrollY + 8
  const left = Math.max(8, Math.min(r.left + window.scrollX, document.documentElement.clientWidth + window.scrollX - WIDTH - 8))

  return createPortal(
    <div ref={panel} role="dialog" aria-label="Switch team" className="picker-in" style={{ position: 'absolute', top, left, zIndex: 40, width: WIDTH, background: '#1f1d1c', border: '1px solid #6b655f', borderTop: '2px solid #ece8e3', boxShadow: '5px 5px 0 rgba(0,0,0,.55)' }}>
      {/* Hard 1px rules between the squares: the cells sit on a #3d3a37 field with a 1px gap. */}
      <div onMouseLeave={() => setHover(null)} style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gridAutoRows: CELL, gap: 1, background: '#3d3a37', minHeight: 5 * CELL + 4 }}>
        {teams && teams.map(t => {
          const current = t.team === p.team
          const fit = fits[t.team]
          return (
            <button
              key={t.team}
              type="button"
              className="team-cell"
              disabled={current || !fit}
              onMouseEnter={() => setHover(t.team)}
              onFocus={() => setHover(t.team)}
              onClick={() => { onClose(); navigate(`/player/${fit.player.slug}`) }}
              aria-label={current ? `${t.name} (current team)` : fit ? `${t.name}: open ${fit.player.name}` : `${t.name}: no player`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', background: '#1f1d1c', boxShadow: current ? 'inset 0 0 0 2px #ece8e3' : 'none', cursor: current || !fit ? 'default' : 'pointer', opacity: current || fit ? 1 : 0.3 }}
            >
              <img className="team-cell-logo" src={`/logos/color/${t.team}.png`} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </button>
          )
        })}
      </div>
      <div style={{ borderTop: '1px solid #6b655f', padding: '7px 9px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.06em', color: shown ? '#ece8e3' : '#8a847e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line}</div>
    </div>,
    document.body
  )
}
