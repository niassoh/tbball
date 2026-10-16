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

// Why a profile's season has none of its type's values (`empty`): he played under the
// sheet's minutes floor (his lineups that season have him on the floor), or not at all. A
// regular season is only empty beside a playoff run, so he played it.
export const MIN_FLOOR = { regular: 800, playoffs: 50 }
export const emptyNote = (s, type) => {
  const on = s.card && s.card.lineups && s.card.lineups.on
  const under = `UNDER THE ${MIN_FLOOR[type]}-MIN FLOOR`
  if (on && on.minutes) return `${on.minutes} MIN · ${under}`
  return type === 'playoffs' ? 'NO PLAYOFF GAMES' : under
}
