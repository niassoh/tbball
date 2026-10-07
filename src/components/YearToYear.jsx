import { useState } from 'react'
import { MONO } from '../lib/format.js'
import { changeProfile } from '../lib/change.js'
import StatSection from './StatSection.jsx'

const KEY = ['BPM', 'AuPM / g', 'Net On/Off', 'Load', 'Box Creation', 'Passer Rating', 'cTOV%', 'Pts / 75', 'rTS%', 'Rim FG%', 'Midrange FG%', 'Pullup 3%', 'C&S 3%', 'FT%', 'Def FGA <6ft /36', 'DRTG On']

// Year to Year: the same table and chart as the stat tabs, but every cell is the
// season's percentile change from the one before (blue up, orange down), and the
// chart plots that change for the clicked stat.
export default function YearToYear({ profile: p, num, sel, setSel }) {
  const [all, setAll] = useState(false)
  const allList = p.tabs.flatMap(t => t.stats).filter(l => p.stats[l].available)
  const list = all ? allList : KEY.filter(l => p.stats[l] && p.stats[l].available)
  const changes = changeProfile(p, allList)

  return (
    <>
      <StatSection key={all ? 'all' : 'key'} profile={changes} tab={{ id: 'yoy', name: 'Year to Year · Percentile Change', stats: list }} num={num} sel={sel} setSel={setSel} />
      <button onClick={() => setAll(a => !a)} style={{ alignSelf: 'flex-start', marginTop: 10, background: 'transparent', border: 'none', padding: '4px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: '#8fb0e6', cursor: 'pointer' }}>
        {all ? '− Show key stats only' : `+ View all ${allList.length} stats year to year`}
      </button>
    </>
  )
}
