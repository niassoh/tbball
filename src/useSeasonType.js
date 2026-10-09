import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PARAM, readMode, storedMode, storeMode, withMode } from './lib/mode.js'

// Whether the app is in playoffs mode, a switch for it, and the profile path of a
// player in the current mode (so links keep the mode).
export function useSeasonType() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const playoffs = readMode(search, storedMode())
  const setPlayoffs = on => {
    storeMode(on)
    navigate({ pathname, search: on ? `?${PARAM}` : '' })
  }
  const playerPath = slug => withMode(`/player/${slug}`, playoffs)
  return { playoffs, setPlayoffs, playerPath, homePath: withMode('/', playoffs) }
}

// Rendered once inside the router: remembers a mode set by the URL, puts a remembered
// playoffs mode into the URL (so it can be shared and survives reloads), and marks the
// document for the playoffs styling (index.css, :root[data-season='playoffs']).
export function ModeSync() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const playoffs = readMode(search, storedMode())
  useEffect(() => {
    document.documentElement.dataset.season = playoffs ? 'playoffs' : 'regular'
  }, [playoffs])
  useEffect(() => {
    const q = new URLSearchParams(search)
    if (q.has(PARAM)) storeMode(q.get(PARAM) !== '0')
    else if (playoffs) navigate({ pathname, search: `?${PARAM}` }, { replace: true })
  }, [pathname, search, playoffs, navigate])
  return null
}
