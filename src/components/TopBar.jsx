import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import { initials } from '../lib/teams.js'
import SeasonToggle from './SeasonToggle.jsx'
import PlayerSearch from './PlayerSearch.jsx'

// Past this far down the page the cards are behind you: the bar shows whose page this is.
const SCROLLED_Y = 220

// The profile's top bar (back link, season switch, search). It stays at the top while
// scrolling, on a solid ground from the moment it sticks (so the cards never show
// through it); once the cards scroll away the player's headshot, name and team slide in
// beside the back link. Its height is published as --topbar-h
// so the tab bar (and section jumps) sit just under it.
export default function TopBar({ profile: p, homePath }) {
  const bar = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const on = () => {
      setStuck(window.scrollY > 0)
      setScrolled(window.scrollY > SCROLLED_Y)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useLayoutEffect(() => {
    const el = bar.current
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const slide = { transition: 'opacity .25s, transform .25s cubic-bezier(.2,.8,.2,1)', opacity: scrolled ? 1 : 0, transform: scrolled ? 'none' : 'translateY(8px)' }
  return (
    <div ref={bar} style={{ position: 'sticky', top: 0, zIndex: 6, margin: '0 -32px', padding: '10px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: stuck ? '#262422' : 'transparent', borderBottom: `1px solid ${stuck ? '#3d3a37' : 'transparent'}`, boxShadow: stuck ? 'inset 0 2px 0 var(--mode-edge)' : 'none', transition: 'background-color .2s, border-color .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <Link to={homePath} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: '#a8a29c', whiteSpace: 'nowrap' }}>← ALL PLAYERS</Link>
        <span aria-hidden={!scrolled} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, pointerEvents: scrolled ? 'auto' : 'none', ...slide }}>
          <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', background: '#34312e', border: '1px solid #544f4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8, color: '#a8a29c' }}>
            {p.headshot
              ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={24} height={24} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials(p.name)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#8a847e' }}>{p.team}</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <SeasonToggle />
        <PlayerSearch profile={p} />
      </div>
    </div>
  )
}
