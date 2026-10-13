// Ages worked out on the day from a birth date (thinking-bball data/birthdates.json): in a
// season, his age at the same point of it as today is of the latest season, so in the
// latest one his age today.
const YEAR_MS = 365.2425 * 864e5

export const ageIn = (born, season, latest, today = new Date()) => {
  const at = new Date(today)
  at.setFullYear(at.getFullYear() - (Number(latest.slice(0, 4)) - Number(season.slice(0, 4))))
  return (at - new Date(`${born}T00:00:00Z`)) / YEAR_MS
}

// A Leaderboard document with its rows' ages on the day where it has their birth dates
// (the sheet's, as of its latest pull, otherwise).
export const liveAges = (doc, today = new Date()) => {
  const latest = doc.seasons && doc.seasons.length ? doc.seasons[doc.seasons.length - 1] : doc.season
  return { ...doc, players: doc.players.map(p => (p.born ? { ...p, age: ageIn(p.born, doc.season, latest, today) } : p)) }
}
