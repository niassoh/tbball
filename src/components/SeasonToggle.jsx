import { MONO } from '../lib/format.js'
import { useSeasonType } from '../useSeasonType.js'

// The playoffs switch: two square segments, the chosen one lit on a quiet fill (ink on
// dark grey for the regular season, gold on a faint gold wash for the playoffs). The
// playoffs segment carries a small square that fills gold when it's on.
export default function SeasonToggle() {
  const { playoffs, setPlayoffs } = useSeasonType()
  const seg = (on, fill, ink) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: 'none', cursor: on ? 'default' : 'pointer',
    background: on ? fill : 'transparent', color: on ? ink : '#8a847e',
    fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', fontWeight: on ? 700 : 400, whiteSpace: 'nowrap', transition: 'background .2s, color .2s'
  })
  return (
    <div role="group" aria-label="Season type" style={{ display: 'inline-flex', border: '1px solid #544f4b', flexShrink: 0 }}>
      <button type="button" aria-pressed={!playoffs} onClick={() => playoffs && setPlayoffs(false)} style={seg(!playoffs, '#3d3a37', '#ece8e3')}>REG SEASON</button>
      <button type="button" aria-pressed={playoffs} onClick={() => !playoffs && setPlayoffs(true)} style={{ ...seg(playoffs, 'var(--accent-soft)', 'var(--accent)'), borderLeft: '1px solid #544f4b' }}>
        <span aria-hidden="true" style={{ width: 7, height: 7, border: `1px solid ${playoffs ? 'var(--accent)' : '#6b655f'}`, background: playoffs ? 'var(--accent)' : 'transparent' }} />
        PLAYOFFS
      </button>
    </div>
  )
}
