import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { loadTeams } from '../api.js'
import { MONO } from '../lib/format.js'
import { bestFit, depthSlot, slotName } from '../lib/depth.js'

const lastName = name => name.split(' ').slice(1).join(' ') || name

// Team switcher: a grid of every team; picking one opens the player in the viewed
// player's depth slot there (e.g. Jokic, the starting C, opens each team's starting C).
export default function TeamPicker({ profile: p, onClose }) {
  const [teams, setTeams] = useState(null)
  const [failed, setFailed] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    loadTeams().then(t => live && setTeams(t)).catch(() => live && setFailed(true))
    const key = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      live = false
      window.removeEventListener('keydown', key)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  // Not on his team's chart (or no chart): his listed position, as a starter.
  const slot = depthSlot(p.depth, p.slug) || { pos: p.bio.position || 'SF', index: 0 }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(12,11,10,.74)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Switch team" className="picker-in" onClick={e => e.stopPropagation()} style={{ width: 'min(780px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: '#1f1d1c', border: '1px solid #6b655f', borderTop: '2px solid #ece8e3', boxShadow: '0 24px 60px rgba(0,0,0,.55)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '14px 16px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.1em' }}>SWITCH TEAM</span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#8a847e' }}>
              OPENS THE <span style={{ color: '#ece8e3' }}>{slotName(slot)}</span> ON EACH TEAM
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: '1px solid #544f4b', color: '#a8a29c', fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', padding: '4px 8px', cursor: 'pointer' }}>ESC ✕</button>
        </div>
        {/* 1px grid lines: the cells sit on a #3d3a37 field with a 1px gap. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(124px, 1fr))', gap: 1, background: '#3d3a37', borderTop: '1px solid #3d3a37', minHeight: 360 }}>
          {!teams && (
            <span style={{ gridColumn: '1 / -1', background: '#1f1d1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: '#8a847e' }}>
              {failed ? "COULDN'T LOAD TEAMS" : 'LOADING TEAMS…'}
            </span>
          )}
          {teams && teams.map(t => {
            const current = t.team === p.team
            const fit = current ? null : bestFit(slot, t.depth)
            return (
              <button
                key={t.team}
                type="button"
                className="team-cell"
                disabled={current || !fit}
                onClick={() => { onClose(); navigate(`/player/${fit.player.slug}`) }}
                aria-label={current ? `${t.name} (current team)` : fit ? `${t.name}: open ${fit.player.name}` : `${t.name}: no player`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '16px 8px 12px', background: current ? '#2a2826' : '#1f1d1c', border: 'none', boxShadow: current ? 'inset 0 0 0 2px #ece8e3' : 'none', color: '#ece8e3', cursor: current || !fit ? 'default' : 'pointer', minWidth: 0 }}
              >
                <img className="team-cell-logo" src={`/logos/color/${t.team}.png`} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>{t.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.04em', color: current ? '#ece8e3' : '#8a847e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {current ? 'CURRENT' : fit ? `→ ${lastName(fit.player.name)}` : '—'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
