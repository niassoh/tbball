// Seasons as the season picker and its readout write them: "'14" for 2013-14 (the year it ends,
// as the site writes career spans), every season from one to another, a span
// ("2018–19 → 2020–21", one season alone), and a view's id ("2018-19..2020-21").
export const shortSeason = s => `’${s.slice(5)}`
export const seasonsBetween = (first, last) => Array.from({ length: Number(last.slice(0, 4)) - Number(first.slice(0, 4)) + 1 }, (_, i) => {
  const y = Number(first.slice(0, 4)) + i
  return `${y}-${String(y + 1).slice(2)}`
})
export const spanText = (from, to) => (from === to ? from : `${from} → ${to}`).replace(/-/g, '–')
export const spanId = (from, to) => (from === to ? from : `${from}..${to}`)
