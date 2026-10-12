import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PARAM, modeless, readMode, storedMode, storeMode, withMode } from './lib/mode.js'

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
  return { playoffs, setPlayoffs, playerPath, homePath: '/' }
}

// Rendered once inside the router: remembers a mode set by the URL, puts a remembered
// playoffs mode into a player page's URL (so it can be shared and survives reloads), and
// marks the document for the playoffs styling (index.css, :root[data-season='playoffs']).
// A page the mode means nothing on (lib/mode.js modeless) stays regular and drops it
// from its URL.
export function ModeSync() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const playoffs = readMode(search, storedMode())
  const off = modeless(pathname)
  useEffect(() => {
    document.documentElement.dataset.season = playoffs && !off ? 'playoffs' : 'regular'
  }, [playoffs, off])
  useEffect(() => {
    const q = new URLSearchParams(search)
    if (q.has(PARAM)) storeMode(q.get(PARAM) !== '0')
    if (off) {
      if (q.has(PARAM)) navigate({ pathname, search: '' }, { replace: true })
    } else if (playoffs && !q.has(PARAM)) navigate({ pathname, search: `?${PARAM}` }, { replace: true })
  }, [pathname, search, playoffs, off, navigate])
  return null
}
