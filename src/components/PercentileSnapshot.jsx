import { useEffect, useState } from 'react'
import { MONO, col, fmt } from '../lib/format.js'

// [group name, tab it links to, stat labels] as in the design's SNAPG.
const GROUPS = [
  ['Impact', 'impact', ['BPM', 'AuPM', 'AuPM / g', 'Net On', 'Net On/Off']],
  ['Offense', 'offense', ['Load', 'Box Creation', 'Passer Rating', 'Time of Poss %', 'Pts / 75', 'rTS%', 'OBPM', 'ScoreVal', 'PlayVal', 'cTOV%']],
  ['Defense', 'defense', ['Def FGA <6ft /36', 'Def FGA Diff%', 'Forced TOV', 'DRTG On', 'Team Def']]
]
const rowGrid = { display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 38px', gap: 8 }
// Bars and dots slide to the new season's percentile (rows are keyed by stat, so
// they persist across seasons); skipped when the viewer asks for reduced motion.
const EASE = '.45s cubic-bezier(.2,.8,.2,1)'
const slide = props => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'none' : props.map(x => `${x} ${EASE}`).join(', '))
// Play steps through the career one season at a time; each step leaves time for
// the slide to finish before the next.
const STEP_MS = 900

export default function PercentileSnapshot({ profile: p, onPickGroup }) {
  const L = p.seasons.length - 1
  const [season, setSeason] = useState(L)
  const [menuOpen, setMenuOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  // A different player (the page isn't remounted): jump to their latest season, so the
  // bars slide from the old player's percentiles to the new one's.
  const [shown, setShown] = useState(p.slug)
  if (shown !== p.slug) {
    setShown(p.slug)
    setSeason(L)
    setPlaying(false)
    setMenuOpen(false)
  }
  const kp = Math.min(season, L)

  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => {
      setSeason(season + 1)
      if (season + 1 >= L) setPlaying(false)
    }, STEP_MS)
    return () => clearTimeout(t)
  }, [playing, season, L])

  const togglePlay = () => {
    if (playing) return setPlaying(false)
    if (season >= L) setSeason(0)
    setMenuOpen(false)
    setPlaying(true)
  }

  return (
    <div style={{ border: '1px solid #544f4b', background: '#2c2a28', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '12px 0 8px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '2px 8px', borderBottom: '1px solid #544f4b', margin: '0 14px' }}>
        <span style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          <button onClick={() => setMenuOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', borderBottom: '1px dotted #8fb0e6', padding: '0 0 1px', color: '#ece8e3', fontFamily: MONO, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {p.seasons[kp].label}<span style={{ fontSize: 8, color: '#8fb0e6' }}>▼</span>
          </button>
          <span style={{ whiteSpace: 'nowrap' }}>Percentiles</span>
          {menuOpen && (
            <div style={{ position: 'absolute', left: -4, top: 'calc(100% + 4px)', zIndex: 10, background: '#1f1d1c', border: '1px solid #6b655f', boxShadow: '0 8px 24px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', minWidth: 96, maxHeight: 320, overflowY: 'auto' }}>
              {p.seasons.map((s, i) => i).reverse().map(i => (
                <button key={i} onClick={() => { setSeason(i); setMenuOpen(false); setPlaying(false) }} style={{ textAlign: 'left', background: i === kp ? '#3d3a37' : 'transparent', border: 'none', borderBottom: '1px solid #3d3a37', color: i === kp ? '#ece8e3' : '#b8b2ab', fontFamily: MONO, fontSize: 12, fontWeight: i === kp ? 600 : 400, padding: '7px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {p.seasons[i].label}
                </button>
              ))}
            </div>
          )}
        </span>
        {L > 0 && (
          <button onClick={togglePlay} aria-label={playing ? 'Pause career playback' : 'Play career season by season'} style={{ background: 'transparent', border: '1px solid #544f4b', color: playing ? '#ece8e3' : '#8a847e', fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', padding: '2px 7px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {playing ? '❚❚ PAUSE' : '\u25B6\uFE0E PLAY'}
          </button>
        )}
      </div>
      <div style={{ padding: '8px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...rowGrid, fontFamily: MONO, fontSize: 9, letterSpacing: '.08em' }}>
          <span />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#fa962a' }}>POOR</span><span style={{ color: '#8a847e' }}>AVG</span><span style={{ color: '#8fb0e6' }}>GREAT</span></div>
          <span />
        </div>
        {GROUPS.map(([name, tab, labels]) => {
          const rows = labels.map(l => [l, p.stats[l]]).filter(([, s]) => s && s.vals[kp])
          return (
            <div key={name} style={{ display: 'flex', flexDirection: 'column' }}>
              <a href="#tabs" onClick={() => onPickGroup(tab)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0 4px', marginBottom: 3, color: '#ece8e3', borderBottom: '1px solid #6b655f' }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{name}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#8a847e' }}>BY SEASON ↓</span>
              </a>
              {rows.length === 0 && <span style={{ fontFamily: MONO, fontSize: 10, color: '#8a847e', padding: '4px 0' }}>No data this season</span>}
              {rows.map(([label, s]) => {
                const v = s.vals[kp]
                const w = Math.max(v.p, 1) + '%'
                const c = col(v.p)
                return (
                  <div key={label} style={{ ...rowGrid, alignItems: 'center', height: 23, borderBottom: '1px dashed #3d3a37' }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#d6d1cb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{label}</span>
                    <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', left: 0, right: 0, height: 14, background: '#34312e' }} />
                      <div style={{ position: 'absolute', left: 0, height: 14, width: w, background: c, transition: slide(['width', 'background-color']) }} />
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#6b655f' }} />
                      <div style={{ position: 'absolute', left: w, transform: 'translateX(-50%)', width: 19, height: 19, borderRadius: '50%', background: c, transition: slide(['left', 'background-color']), border: '1.5px solid #ece8e3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8.5, fontWeight: 600, color: '#1f1d1c' }}>{v.p}</div>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 11, textAlign: 'right' }}>{fmt(s, v.n)}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
