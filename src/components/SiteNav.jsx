import { Link, useLocation } from 'react-router-dom'
import { MONO } from '../lib/format.js'
import { withMode } from '../lib/mode.js'
import { useSeasonType } from '../useSeasonType.js'
import Popover from './Popover.jsx'

// The site's pages, in every page's header row: muted links lit under the pointer
// (index.css .site-nav), the one you're on (`at`; a player's page is under PLAYERS) in ink.
// The leaderboard keeps the playoffs mode, as links from a page in it do (lib/mode.js).
// Careers isn't linked from the site yet, so it's listed only on its own page. A phone's
// bars have no room for the row: there it's one box naming where you are, opening the list.
export default function SiteNav({ at }) {
  const { playoffs, homePath } = useSeasonType()
  const { pathname, search } = useLocation()
  const pages = [
    ['players', 'PLAYERS', homePath],
    ['leaderboard', 'LEADERBOARD', withMode('/leaderboard', playoffs)],
    ['teams', 'TEAMS', '/teams'],
    ...(at === 'careers' ? [['careers', 'CAREERS', pathname + search]] : [])
  ]
  const links = close => pages.map(([id, name, to]) => (
    <Link key={id} to={to} onClick={close} aria-current={id === at ? 'page' : undefined}
      style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', whiteSpace: 'nowrap', color: id === at ? '#ece8e3' : '#b3ada6', fontWeight: id === at ? 700 : 400 }}>{name}</Link>
  ))
  return (
    <nav className="site-nav" aria-label="Site" style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
      <span className="site-nav-row" style={{ display: 'flex', gap: 18 }}>{links()}</span>
      <span className="site-nav-menu">
        <Popover name="Pages" minWidth={160} trigger={pages.find(p => p[0] === at)[1]}>{links}</Popover>
      </span>
    </nav>
  )
}
