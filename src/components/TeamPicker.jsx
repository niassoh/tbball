import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { asset } from '../lib/static.js'

const COLS = 6
const CELL = 46
const WIDTH = COLS * CELL + (COLS - 1) + 2

// Team switcher: a small popover under the clicked trigger (the header logo) with every
// team's logo on a hard grid. Picking a team opens its card on the Team board in the
// season being viewed (`season`), his own team's included; the line under the grid names
// the team under the pointer.
export default function TeamPicker({ profile: p, season, anchor, onClose }) {
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

  const shown = teams && hover && teams.find(t => t.team === hover)
  const when = season ? ` · ${season.replace('-', '–')}` : ''
  const line = failed ? "COULDN'T LOAD TEAMS"
    : !teams ? 'LOADING TEAMS…'
    : !shown ? `A TEAM'S CARD${when}`
    : `${shown.name.toUpperCase()} → TEAM CARD${when}`
  // Just below the trigger (page coordinates, so it scrolls with the page), kept inside
  // the page horizontally.
  const r = anchor.getBoundingClientRect()
  const top = r.bottom + window.scrollY + 8
  const left = Math.max(8, Math.min(r.left + window.scrollX, document.documentElement.clientWidth + window.scrollX - WIDTH - 8))

  return createPortal(
    <div ref={panel} role="dialog" aria-label="Switch team" className="picker-in" style={{ position: 'absolute', top, left, zIndex: 40, width: WIDTH, background: '#1f1d1c', border: '1px solid #837d76', borderTop: '2px solid #ece8e3', boxShadow: '5px 5px 0 rgba(0,0,0,.55)' }}>
      {/* Hard 1px rules between the squares: the cells sit on a #3d3a37 field with a 1px gap. */}
      <div onMouseLeave={() => setHover(null)} style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gridAutoRows: CELL, gap: 1, background: '#3d3a37', minHeight: 5 * CELL + 4 }}>
        {teams && teams.map(t => {
          const current = t.team === p.team
          return (
            <button
              key={t.team}
              type="button"
              className="team-cell"
              onMouseEnter={() => setHover(t.team)}
              onFocus={() => setHover(t.team)}
              onClick={() => { onClose(); navigate(`/teams?season=${season}&team=${t.team}`) }}
              aria-label={`${t.name}: open its team card`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', background: '#1f1d1c', boxShadow: current ? 'inset 0 0 0 2px #ece8e3' : 'none', cursor: 'pointer' }}
            >
              <img className="team-cell-logo" src={asset(`logos/color/${t.team}.png`)} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </button>
          )
        })}
      </div>
      <div style={{ borderTop: '1px solid #837d76', padding: '7px 9px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.06em', color: shown ? '#ece8e3' : '#a09a93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line}</div>
    </div>,
    document.body
  )
}
