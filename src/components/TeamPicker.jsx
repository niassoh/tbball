import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { bestFit, depthSlot, slotName } from '../lib/depth.js'
import { DIVISIONS } from '../lib/teams.js'

const CELL = 44
const GUTTER = 64
const WIDTH = GUTTER + 5 * CELL + 2
const RULE = '1px solid #3d3a37'

// Team switcher: a popover under the clicked trigger (the header logo or the depth
// chart's team name), laid out like the standings: East over West, one row per
// division, every logo in its own square on a hard grid. Picking a team opens the
// player in the viewed player's depth slot there (Jokic, the starting C, opens each
// team's starting C); the footer says who, for the team under the pointer.
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
  const byTeam = teams && Object.fromEntries(teams.map(t => [t.team, { ...t, fit: t.team === p.team ? null : bestFit(slot, t.depth) }]))
  const shown = byTeam && hover && byTeam[hover]
  // Just below the trigger (page coordinates, so it scrolls with the page), kept inside
  // the page horizontally.
  const r = anchor.getBoundingClientRect()
  const top = r.bottom + window.scrollY + 6
  const left = Math.max(8, Math.min(r.left + window.scrollX, document.documentElement.clientWidth + window.scrollX - WIDTH - 8))

  const cell = abbr => {
    const t = byTeam[abbr]
    const current = abbr === p.team
    const usable = !current && t && t.fit
    return (
      <button
        key={abbr}
        type="button"
        className="team-cell"
        disabled={!usable}
        onMouseEnter={() => setHover(abbr)}
        onFocus={() => setHover(abbr)}
        onClick={() => { onClose(); navigate(`/player/${t.fit.player.slug}`) }}
        aria-label={current ? `${t.name} (current team)` : usable ? `${t.name}: open ${t.fit.player.name}` : `${t ? t.name : abbr}: no player`}
        style={{ width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', borderLeft: RULE, background: 'transparent', boxShadow: current ? 'inset 0 0 0 2px #ece8e3' : 'none', cursor: usable ? 'pointer' : 'default', opacity: current || usable ? 1 : 0.3 }}
      >
        <img className="team-cell-logo" src={`/logos/color/${abbr}.png`} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
      </button>
    )
  }

  return createPortal(
    <div ref={panel} role="dialog" aria-label="Switch team" className="picker-in" style={{ position: 'absolute', top, left, zIndex: 40, width: WIDTH, background: '#1f1d1c', border: '1px solid #6b655f', borderTop: '2px solid #ece8e3', boxShadow: '0 10px 28px rgba(0,0,0,.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #6b655f' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em' }}>SWITCH TEAM</span>
        <span title="Each team opens the player in this depth slot" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#ece8e3', border: '1px solid #6b655f', padding: '2px 5px' }}>{slotName(slot)}</span>
      </div>

      {!teams && (
        <div style={{ height: 2 * (16 + 3 * CELL) + 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.08em', color: '#8a847e' }}>
          {failed ? "COULDN'T LOAD TEAMS" : 'LOADING TEAMS…'}
        </div>
      )}
      {teams && (
        <div onMouseLeave={() => setHover(null)}>
          {DIVISIONS.map(([conf, divisions], c) => (
            <Fragment key={conf}>
              <div style={{ height: 16, display: 'flex', alignItems: 'center', padding: '0 10px', background: '#2c2a28', borderTop: c ? '1px solid #6b655f' : 'none', borderBottom: RULE, fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '.16em', color: '#a8a29c' }}>{conf}</div>
              {divisions.map(([division, abbrs], d) => (
                <div key={division} style={{ display: 'grid', gridTemplateColumns: `${GUTTER}px repeat(5, ${CELL}px)`, borderBottom: d < divisions.length - 1 ? RULE : 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px 0 10px', fontFamily: MONO, fontSize: 8, letterSpacing: '.08em', color: '#6b655f' }}>{division}</span>
                  {abbrs.map(cell)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '7px 10px', borderTop: '1px solid #6b655f', minHeight: 28 }}>
        {shown ? (
          <>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{shown.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.04em', color: shown.team === p.team ? '#8a847e' : '#ece8e3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {shown.team === p.team ? 'CURRENT' : shown.fit ? `→ ${shown.fit.player.name.toUpperCase()}` : 'NO PLAYER'}
            </span>
          </>
        ) : (
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e' }}>PICK A TEAM</span>
        )}
      </div>
    </div>,
    document.body
  )
}
