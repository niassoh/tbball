// Seasons as the season picker and its readout write them: "'14" for 2013-14 (the year it ends,
// as the site writes career spans), every season from one to another, a span
// ("2018–19 → 2020–21", one season alone), and a view's id ("2018-19..2020-21").
export const shortSeason = s => `’${s.slice(5)}`
// A span by the years its seasons end (the playoffs' years): "2023–25" for 2022-23 to 2024-25.
export const spanYears = (from, to) => `${Number(from.slice(0, 4)) + 1}–${to.slice(5)}`
export const seasonsBetween = (first, last) => Array.from({ length: Number(last.slice(0, 4)) - Number(first.slice(0, 4)) + 1 }, (_, i) => {
  const y = Number(first.slice(0, 4)) + i
  return `${y}-${String(y + 1).slice(2)}`
})
export const spanText = (from, to) => (from === to ? from : `${from} → ${to}`).replace(/-/g, '–')
export const spanId = (from, to) => (from === to ? from : `${from}..${to}`)
// The seasons a card opens on: his last three while he has under 500 minutes in the latest
// (a season just begun, its few games pooled with the two before), then his last two.
export const openingSeasons = (p, seasons) => {
  const latest = p.seasons.find(s => s.season === seasons[seasons.length - 1])
  return seasons.slice(latest && latest.mp >= 500 ? -2 : -3)
}

// Why a profile's season has none of its type's values (`empty`): the sheet's historical
// tab (about 175 players a season, not everyone over the floor) has no row for him
// (`unsourced`), whatever his minutes; he played under the sheet's minutes floor (his
// lineups that season have him on the floor), or not at all. A regular season is only
// empty beside a playoff run, so he played it. His lineup minutes are rounded, so a count
// at the floor is still under it by the sheet's (Aldrich's 2015-16: 799.6, shown 800) and
// goes unsaid; one over it is not under it, whatever the reason the sheet has no row.
export const MIN_FLOOR = { regular: 800, playoffs: 50 }
export const emptyNote = (s, type) => {
  const on = s.card && s.card.lineups && s.card.lineups.on
  if (s.unsourced || (on && on.minutes > MIN_FLOOR[type])) return 'NOT IN THE SOURCE DATA'
  const under = `UNDER THE ${MIN_FLOOR[type]}-MIN FLOOR`
  if (on && on.minutes) return on.minutes < MIN_FLOOR[type] ? `${on.minutes} MIN · ${under}` : under
  return type === 'playoffs' ? 'NO PLAYOFF GAMES' : under
}
