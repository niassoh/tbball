import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PARAM, modeless, readMode, withMode } from './lib/mode.js'

// Whether the app is in playoffs mode, a switch for it, and the profile path of a
// player in the current mode (so links keep the mode).
export function useSeasonType() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const playoffs = readMode(search)
  // A new history entry, so Back returns to the other mode.
  const setPlayoffs = on => navigate({ pathname, search: on ? `?${PARAM}` : '' })
  const playerPath = slug => withMode(`/player/${slug}`, playoffs)
  return { playoffs, setPlayoffs, playerPath, homePath: '/' }
}

// Rendered once inside the router: marks the document for the playoffs styling (index.css,
// :root[data-season='playoffs']). A page the mode means nothing on (lib/mode.js modeless)
// stays regular and drops it from its URL.
export function ModeSync() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const playoffs = readMode(search)
  const off = modeless(pathname)
  useEffect(() => {
    document.documentElement.dataset.season = playoffs && !off ? 'playoffs' : 'regular'
  }, [playoffs, off])
  useEffect(() => {
    if (off && new URLSearchParams(search).has(PARAM)) navigate({ pathname, search: '' }, { replace: true })
  }, [pathname, search, off, navigate])
  return null
}
