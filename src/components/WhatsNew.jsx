import changelog from '../../CHANGELOG.md?raw'
import { onTest } from '../lib/changelog.js'
import { MONO } from '../lib/format.js'
import Popover from './Popover.jsx'

// The test site's list of what to check (CHANGELOG.md, "On test"). SiteNav shows it only on
// an open build (VITE_OPEN), so a production build leaves this module out entirely: a key in
// the header row, and on a phone, whose bar has no room, a section of the pages menu.
export function WhatsNewList() {
  // Read here, not at load: a call at the module's top would keep the changelog in every build.
  const lines = onTest(changelog)
  return (
    <div style={{ width: 'min(440px, calc(100vw - 56px))', fontFamily: MONO, fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ fontSize: 9, letterSpacing: '.14em', color: '#fa962a', marginBottom: 10 }}>ON TEST · NOT ON PROD YET</div>
      {lines.map(([area, what]) => (
        <p key={area + what} style={{ margin: '0 0 8px', color: '#b3ada6' }}>
          {area && <span style={{ color: '#ece8e3', fontWeight: 700 }}>{area} </span>}{what}
        </p>
      ))}
    </div>
  )
}

export default function WhatsNew() {
  return <Popover name="What's new on test" minWidth={0} accent="#fa962a" trigger="WHAT'S NEW">{() => <WhatsNewList />}</Popover>
}
