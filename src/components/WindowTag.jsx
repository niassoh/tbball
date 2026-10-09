import { MONO } from '../lib/format.js'

// Marks a regular-season tracking stat measured over a rolling window of seasons
// (3YR / 2YR, from the API's `years`). Playoff stats cover one run and carry none.
export default function WindowTag({ stat }) {
  if (!stat || !stat.years) return null
  return (
    <span title={`Rolling ${stat.years}-season window: this season and the ${stat.years - 1 === 1 ? 'one' : stat.years - 1} before it`} style={{ display: 'inline-block', marginLeft: 5, padding: '0 3px', border: '1px solid #544f4b', fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: '.06em', lineHeight: '11px', color: '#8a847e', textTransform: 'none', verticalAlign: 'middle' }}>
      {stat.years}YR
    </span>
  )
}
