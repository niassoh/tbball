// Ages from a birth date (thinking-bball data/birthdates.json): a season's is his age on
// February 1 of it, Basketball-Reference's convention, or today for a season that hasn't
// reached February yet (the depth chart's).
const YEAR_MS = 365.2425 * 864e5

export const ageIn = (born, season, today = new Date()) => {
  const feb1 = new Date(`${Number(season.slice(0, 4)) + 1}-02-01T00:00:00Z`)
  return (Math.min(feb1, today) - new Date(`${born}T00:00:00Z`)) / YEAR_MS
}

// A Leaderboard document with its rows' ages in its season where it has their birth dates
// (the sheet's, as of its latest pull, otherwise).
export const liveAges = (doc, today = new Date()) =>
  ({ ...doc, players: doc.players.map(p => (p.born ? { ...p, age: ageIn(p.born, doc.season, today) } : p)) })

// A Leaderboard row's age as the site writes it: a season's in whole years, a combined
// row's (several seasons, their mean) to one decimal; null without one.
export const rowAge = p => (p.age === null || p.age === undefined ? null : p.seasons && p.seasons.length > 1 ? p.age.toFixed(1) : String(Math.floor(p.age)))

// A span of ages as the season picker writes it: "Age 25", "Ages 25–28".
export const agesText = (a, b) => (a === b ? `Age ${a}` : `Ages ${a}–${b}`)

// A player's age in any season of his career (whole years, by his birth date, else counted
// from the sheet's age in a season he played), for picking his seasons by age; null
// without either.
export const seasonAges = profile => {
  const known = profile.seasons.find(s => s.age !== null && s.age !== undefined)
  if (!profile.bio.born && !known) return null
  const year = season => Number(season.slice(0, 4))
  return season => Math.floor(profile.bio.born ? ageIn(profile.bio.born, season) : known.age + year(season) - year(known.season))
}
