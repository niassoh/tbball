// Top-bar search: players and teams matching a typed query.
export const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Players whose first or last name starts with the query lead; otherwise the index's
// own order (portraits first, then value), so the best-known players come first.
export const searchPlayers = (players, q, max) => {
  const query = fold(q.trim())
  if (!query) return []
  const hits = players.filter(p => fold(p.name).includes(query))
  const starts = p => fold(p.name).split(' ').some(w => w.startsWith(query))
  return [...hits.filter(starts), ...hits.filter(p => !starts(p))].slice(0, max)
}

// Teams by nickname ("lak", "lakers") or abbreviation ("lal"); nickname-prefix matches
// first. Two letters at least, so a player search doesn't fill up with teams.
export const searchTeams = (teams, q, max) => {
  const query = fold(q.trim())
  if (query.length < 2) return []
  const starts = t => fold(t.name).startsWith(query) || t.team.toLowerCase().startsWith(query)
  const hits = teams.filter(t => starts(t) || fold(t.name).includes(query))
  return [...hits.filter(starts), ...hits.filter(t => !starts(t))].slice(0, max)
}
