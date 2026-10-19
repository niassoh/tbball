// Playoffs mode: the whole profile in playoff numbers. It lives in the URL (?playoffs) and
// nowhere else: a toggle is a step in the browser's history (Back undoes it), a link from
// a page in the mode keeps it, and a page reached afresh (the players index, the search, a
// bare link) opens in the regular season.
export const PARAM = 'playoffs'

// A ?playoffs in the URL (?playoffs=0 means off).
export const readMode = search => {
  const q = new URLSearchParams(search)
  return q.has(PARAM) && q.get(PARAM) !== '0'
}

// A path in the given mode.
export const withMode = (path, playoffs) => (playoffs ? `${path}?${PARAM}` : path)

// A page's query in the given mode, its other params kept (Careers keeps its players and
// axes in the URL).
export const searchInMode = (search, playoffs) => {
  const q = new URLSearchParams(search)
  q.delete(PARAM)
  const rest = q.toString()
  return playoffs ? `?${rest ? `${rest}&` : ''}${PARAM}` : rest ? `?${rest}` : ''
}

// Pages the mode means nothing on (the players index): no switch, no playoffs styling,
// no ?playoffs in their URL. Player pages, the leaderboard and careers have it.
export const modeless = pathname => !pathname.startsWith('/player/') && pathname !== '/leaderboard' && pathname !== '/careers'
