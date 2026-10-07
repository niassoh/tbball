import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { bestFit, depthSlot, slotName } from '../lib/depth.js'

const COLS = 6
const CELL = 44
const WIDTH = COLS * CELL + 2

// Team switcher: a small popover of every team's logo under the clicked trigger (the
// header logo or the depth chart's team name). Picking a team opens the player in the
// viewed player's depth slot there (Jokic, the starting C, opens each team's starting C);
// the line under the grid says who, for the team under the pointer.
export default function TeamPicker({ profile: p, anchor, onClose }) {
  const [teams, setTeams] = useState(null)
  const [failed, setFailed] = useState(false)
  const [hover, setHover] = useState(null)
  const panel = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    loadTeams().then(t => live && setTeams(t)).catch(() => live && setFailed(true))
    const key = e => { if (e.key === 'Escape') onClose() }
    // Outside presses close it; presses on a trigger are left to its own toggle.
    const press = e => { if (!panel.current.contains(e.target) && !e.target.closest('.team-switch')) onClose() }
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', press)
    window.addEventListener('resize', onClose)
    return () => {
      live = false
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', press)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  // Not on his team's chart (or no chart): his listed position, as a starter.
  const slot = depthSlot(p.depth, p.slug) || { pos: p.bio.position || 'SF', index: 0 }
  const fits = teams && Object.fromEntries(teams.map(t => [t.team, t.team === p.team ? null : bestFit(slot, t.depth)]))
  const shown = teams && hover && teams.find(t => t.team === hover)
  const line = failed ? "COULDN'T LOAD TEAMS"
    : !teams ? 'LOADING TEAMS…'
    : shown ? (shown.team === p.team ? `${shown.name.toUpperCase()} · CURRENT` : fits[shown.team] ? `${shown.name.toUpperCase()} → ${fits[shown.team].player.name.toUpperCase()}` : `${shown.name.toUpperCase()} · NO PLAYER`)
    : `${slotName(slot)} ON EACH TEAM`
  // Below the trigger, kept inside the page horizontally.
  const left = Math.max(8, Math.min(anchor.left, document.documentElement.clientWidth + window.scrollX - WIDTH - 8))

  return createPortal(
    <div ref={panel} role="dialog" aria-label="Switch team" className="picker-in" style={{ position: 'absolute', top: anchor.top, left, zIndex: 40, width: WIDTH, background: '#1f1d1c', border: '1px solid #6b655f', borderTop: '2px solid #ece8e3', boxShadow: '0 10px 28px rgba(0,0,0,.5)' }}>
      <div onMouseLeave={() => setHover(null)} style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gridAutoRows: CELL, gap: 0, minHeight: CELL * 5 }}>
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', background: current ? '#2f2c2a' : 'transparent', boxShadow: current ? 'inset 0 0 0 1px #ece8e3' : 'none', cursor: current || !fit ? 'default' : 'pointer' }}
            >
              <img className="team-cell-logo" src={`/logos/color/${t.team}.png`} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </button>
          )
        })}
      </div>
      <div style={{ borderTop: '1px solid #3d3a37', padding: '6px 8px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.05em', color: shown ? '#ece8e3' : '#8a847e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line}</div>
    </div>,
    document.body
  )
}
