// The bio card's trophy case laid out (components/TrophyCase.jsx draws it): which of a
// season's awards it stands, at what scale, and when each rises on a hover.

// Every award the case can show, in the order it stands them, with its name.
export const AWARDS = [
  ['champion', 'NBA champion'],
  ['fmvp', 'Finals MVP'],
  ['mvp', 'Most Valuable Player'],
  ['dpoy', 'Defensive Player of the Year'],
  ['allnba1', 'All-NBA First Team'],
  ['allnba2', 'All-NBA Second Team'],
  ['allnba3', 'All-NBA Third Team'],
  ['alldef1', 'All-Defensive First Team'],
  ['alldef2', 'All-Defensive Second Team'],
  ['roy', 'Rookie of the Year'],
  ['smoy', 'Sixth Man of the Year'],
  ['mip', 'Most Improved Player'],
  ['clutch', 'Clutch Player of the Year'],
  ['allstar', 'All-Star']
]
// A trophy's size in the banner: its drawing at SIZE × 32 px, its plinth TROPHY_W wide.
export const SIZE = 1.05
export const TROPHY_W = 38 * SIZE
export const GAP = 6
const MIN_SCALE = 0.7
// Each trophy rises in RISE ms (index.css .tc-item) from its turn's delay.
const RISE = 400
export const delayOf = i => 40 + i * 55

// The case for a season: the trophies that fit `room` (they shrink to MIN_SCALE, past
// which the last fold into a "+n") and their scale, or null when there's nothing to show.
export const layout = (awards, season, room) => {
  const items = AWARDS.filter(([k]) => awards && awards[k] && awards[k].includes(season))
  const width = n => n * TROPHY_W + (n - 1) * GAP
  let shown = items
  while (shown.length > 1 && width(shown.length) * MIN_SCALE > room) shown = shown.slice(0, -1)
  if (!shown.length || width(1) * MIN_SCALE > room) return null
  return { items, shown, scale: Math.min(1, Math.max(MIN_SCALE, room / width(shown.length))), more: items.length - shown.length }
}

// How long after the banner comes under the pointer its last trophy (or "+n") has risen,
// in ms; 0 with none. His portrait winks then (BioCard, Wink).
export const trophiesRisen = (awards, season, room) => {
  const l = layout(awards, season, room)
  return l ? delayOf(l.shown.length + (l.more > 0 ? 1 : 0) - 1) + RISE : 0
}
