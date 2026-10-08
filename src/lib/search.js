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

// A name split around the query's match, for highlighting it: [before, match, after].
// A match at the start of a word wins ("t" in "Karl-Anthony Towns" is the T of Towns);
// otherwise the first. No match leaves the whole name in `before`.
export const matchParts = (name, q) => {
  const query = fold(q.trim())
  const chars = [...name]
  const folded = chars.map(fold)
  const flat = folded.join('')
  let at = -1
  if (query) {
    for (let i = flat.indexOf(query); i !== -1; i = flat.indexOf(query, i + 1)) {
      if (at === -1) at = i
      if (i === 0 || flat[i - 1] === ' ') { at = i; break }
    }
  }
  let start = -1
  let end = -1
  for (let k = 0, pos = 0; at !== -1 && k < chars.length && end === -1; k++) {
    if (pos === at) start = k
    pos += folded[k].length
    if (start !== -1 && pos === at + query.length) end = k + 1
  }
  if (start === -1 || end === -1) return [name, '', '']
  return [chars.slice(0, start).join(''), chars.slice(start, end).join(''), chars.slice(end).join('')]
}
