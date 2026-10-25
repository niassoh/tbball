import { MONO } from '../lib/format.js'
import { useSeasonType } from '../useSeasonType.js'

// The lit LED's soft glow, in the accent: green in the regular season, gold in the
// playoffs (index.css), as the index's active dots.
const GLOW = '0 0 5px 1px color-mix(in srgb, var(--accent) 55%, transparent)'

// The playoffs switch: two bare mono labels, each behind an LED. The mode you're in is lit,
// its LED glowing in the accent and its label in ink; the other is muted, its LED an empty
// ring. `onRegular`: also called when REG SEASON is clicked, and `regularLit` false shows
// it unlit (the Leaderboard's last 30 days, which REG SEASON switches back from).
export default function SeasonToggle({ onRegular, regularLit = true }) {
  const { playoffs, setPlayoffs } = useSeasonType()
  const regular = !playoffs && regularLit
  const seg = on => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 0', border: 'none', cursor: on ? 'default' : 'pointer',
    background: 'transparent', color: on ? '#ece8e3' : '#a09a93',
    fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', fontWeight: on ? 700 : 400, whiteSpace: 'nowrap'
  })
  const led = on => <span aria-hidden="true" style={{ width: 6, height: 6, flex: 'none', borderRadius: '50%', background: on ? 'var(--accent)' : 'transparent', border: `1px solid ${on ? 'var(--accent)' : '#7a746e'}`, boxShadow: on ? GLOW : 'none' }} />
  return (
    <div role="group" aria-label="Season type" style={{ display: 'inline-flex', gap: 14, flexShrink: 0 }}>
      <button type="button" aria-pressed={regular} onClick={() => { if (playoffs) setPlayoffs(false); onRegular?.() }} style={seg(regular)}>{led(regular)}REG SEASON</button>
      <button type="button" aria-pressed={playoffs} onClick={() => !playoffs && setPlayoffs(true)} style={seg(playoffs)}>{led(playoffs)}PLAYOFFS</button>
    </div>
  )
}
