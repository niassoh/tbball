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
