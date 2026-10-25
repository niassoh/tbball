import { MONO } from '../lib/format.js'
import { useSeasonType } from '../useSeasonType.js'

// The playoffs switch: two square segments, the chosen one lit on a quiet fill (ink on
// dark grey for the regular season, gold on a faint gold wash for the playoffs). The
// playoffs segment carries a small square that fills gold when it's on. `onRegular`: also
// called when REG SEASON is clicked, and `regularLit` false shows it unlit (the
// Leaderboard's last 30 days, which REG SEASON switches back from).
export default function SeasonToggle({ onRegular, regularLit = true }) {
  const { playoffs, setPlayoffs } = useSeasonType()
  const regular = !playoffs && regularLit
  const seg = (on, fill, ink) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: 'none', cursor: on ? 'default' : 'pointer',
    background: on ? fill : 'transparent', color: on ? ink : '#a09a93',
    fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', fontWeight: on ? 700 : 400, whiteSpace: 'nowrap', transition: 'background .2s, color .2s'
  })
  return (
    <div role="group" aria-label="Season type" style={{ display: 'inline-flex', border: '1px solid #544f4b', flexShrink: 0 }}>
      <button type="button" aria-pressed={regular} onClick={() => { if (playoffs) setPlayoffs(false); onRegular?.() }} style={seg(regular, '#3d3a37', '#ece8e3')}>REG SEASON</button>
      <button type="button" aria-pressed={playoffs} onClick={() => !playoffs && setPlayoffs(true)} style={{ ...seg(playoffs, 'var(--accent-soft)', 'var(--accent)'), borderLeft: '1px solid #544f4b' }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, border: `1px solid ${playoffs ? 'var(--accent)' : '#837d76'}`, background: playoffs ? 'var(--accent)' : 'transparent' }} />
        PLAYOFFS
      </button>
    </div>
  )
}
