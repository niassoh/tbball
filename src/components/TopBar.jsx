import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
// beside the back link. It runs to the page's edges (--page-pad, index.css); on a phone
// it's one line, the search a button that opens it full screen. Its height is published
// as --topbar-h
// so the tab bar (and section jumps) sit just under it.
export default function TopBar({ profile: p, homePath }) {
  const bar = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [stuck, setStuck] = useState(false)
  // The phone's search, open on the player it was opened from: arriving at another
  // (a pick, or the back button) closes it.
  const [searchingOn, setSearchingOn] = useState(null)
  const searching = searchingOn === p.slug
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
    <div ref={bar} className="topbar" style={{ position: 'sticky', top: 0, zIndex: 6, margin: '0 calc(-1 * var(--page-pad))', padding: '10px var(--page-pad)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: stuck ? '#262422' : 'transparent', borderBottom: `1px solid ${stuck ? '#3d3a37' : 'transparent'}`, transition: 'background-color .2s, border-color .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <Link to={homePath} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: '#b3ada6', whiteSpace: 'nowrap' }}>← ALL PLAYERS</Link>
        <span className="topbar-name" aria-hidden={!scrolled} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, pointerEvents: scrolled ? 'auto' : 'none', ...slide }}>
          <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', background: '#34312e', border: '1px solid #544f4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8, color: '#b3ada6' }}>
            {p.headshot
              ? <img src={headshotUrl(p.slug, 100, p.headshotVersion, p.headshot)} alt="" width={24} height={24} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials(p.name)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#a09a93' }}>{p.team}</span>
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flex: '1 1 auto', minWidth: 0 }}>
        <SeasonToggle />
        <PlayerSearch profile={p} />
        <button type="button" className="topbar-search-btn" aria-label="Search players or teams" onClick={() => setSearchingOn(p.slug)}
          style={{ width: 32, height: 30, alignItems: 'center', justifyContent: 'center', border: '1px solid #a09a93', background: '#2c2a28', cursor: 'pointer', flex: 'none' }}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 12 12">
            <circle cx="5" cy="5" r="3.75" fill="none" stroke="#ece8e3" strokeWidth="1.5" />
            <line x1="7.8" y1="7.8" x2="11" y2="11" stroke="#ece8e3" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </button>
      </div>
      {searching && createPortal(
        <div role="dialog" aria-label="Search players or teams" style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#262422', padding: '12px 14px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <PlayerSearch profile={p} sheet onPick={() => setSearchingOn(null)} />
            <button type="button" aria-label="Close search" onClick={() => setSearchingOn(null)}
              style={{ flex: 'none', height: 32, padding: '0 11px', border: '1px solid #544f4b', background: 'transparent', color: '#ece8e3', fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', cursor: 'pointer' }}>CLOSE</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
