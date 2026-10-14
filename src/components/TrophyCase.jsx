import { MONO } from '../lib/format.js'
import AwardGlyph from './AwardGlyph.jsx'

// The bio card's trophy case, in its banner just left of his portrait: the awards he won
// in the season on show (`season`, from profile.awards, thinking-bball scripts/awards.js)
// standing on the banner's bottom bar, a glyph each, a hairline shelf under each row;
// hovering one names it. A title in gold, the rest in ink. A row holds what fits in `room`
// (the banner between his name and his portrait, measured by the card); a second shelf
// stands over the first, and past two rows the rest fold into a "+n". They rise onto
// their shelves in turn as each season comes in (index.css .tc-item). Nothing in a season
// he won none.
const AWARDS = [
  ['champion', 'NBA champion'],
  ['fmvp', 'Finals MVP'],
  ['mvp', 'Most Valuable Player'],
  ['dpoy', 'Defensive Player of the Year'],
  ['roy', 'Rookie of the Year'],
  ['smoy', 'Sixth Man of the Year'],
  ['mip', 'Most Improved Player'],
  ['clutch', 'Clutch Player of the Year'],
  ['allstar', 'All-Star']
]
const INK = '#ece8e3'
const GOLD = '#d4af37'
const GLYPH = 20
// A trophy's room on the shelf (its glyph and the gap), and the rows the banner takes.
const ITEM_W = 30
const ROWS = 2
const SHELF = 'rgba(236, 232, 227, .38)'

export default function TrophyCase({ awards, season, room, right }) {
  const items = AWARDS.filter(([k]) => awards && awards[k] && awards[k].includes(season))
  const per = Math.max(1, Math.floor(room / ITEM_W))
  if (!items.length || room < ITEM_W) return null
  const shown = items.length > per * ROWS ? items.slice(0, per * ROWS - 1) : items
  const more = items.length - shown.length
  // Rows from the bottom shelf up, the first trophies on the bottom one.
  const rows = []
  for (let i = 0; i < shown.length; i += per) rows.push(shown.slice(i, i + per))
  return (
    <div style={{ position: 'absolute', right, bottom: 4, display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-end', gap: 6, fontFamily: MONO, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.7))', pointerEvents: 'auto' }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 2px 3px', borderBottom: `1px solid ${SHELF}` }}>
          {row.map(([key, long], i) => {
            const tip = `${long} · ${season.replace('-', '–')}`
            return (
              <span key={key} className="tc-item" title={tip} aria-label={tip} style={{ '--d': `${160 + (r * per + i) * 70}ms`, display: 'flex', color: key === 'champion' ? GOLD : INK, cursor: 'default' }}>
                <AwardGlyph award={key} size={GLYPH} />
              </span>
            )
          })}
          {r === rows.length - 1 && more > 0 && <span style={{ alignSelf: 'flex-end', fontSize: 9, letterSpacing: '.06em', color: '#b3ada6' }} title={items.slice(shown.length).map(([, l]) => l).join(', ')}>+{more}</span>}
        </div>
      ))}
    </div>
  )
}
