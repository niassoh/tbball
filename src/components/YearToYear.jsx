import { useState } from 'react'
import { MONO } from '../lib/format.js'
import { changeProfile } from '../lib/change.js'
import ModeSwitch from './ModeSwitch.jsx'
import StatSection from './StatSection.jsx'

const KEY = ['BPM', 'AuPM / g', 'Net On/Off', 'Load', 'Box Creation', 'Passer Rating', 'cTOV%', 'Pts / 75', 'rTS%', 'Rim FG%', 'Midrange FG%', 'Pullup 3%', 'C&S 3%', 'FT%', 'Def FGA <6ft /36', 'DRTG On']

// Year to Year: the same table and chart as the stat tabs, but every cell is the
// season's change from his last one (blue better, orange worse, by the percentile change),
// in the stat's own terms or, switched to PCTL, in percentile points; the chart plots that
// change for the clicked stat.
export default function YearToYear({ profile: p, sel, setSel }) {
  const [all, setAll] = useState(false)
  const [mode, setMode] = useState('raw')
  const allList = p.tabs.flatMap(t => t.stats).filter(l => p.stats[l].available)
  const list = all ? allList : KEY.filter(l => p.stats[l] && p.stats[l].available)
  const changes = changeProfile(p, allList, { raw: mode === 'raw' })

  return (
    <>
      <StatSection key={all ? 'all' : 'key'} profile={changes} tab={{ id: 'yoy', name: mode === 'raw' ? 'Year to Year · Change' : 'Year to Year · Percentile Change', stats: list }} sel={sel} setSel={setSel}
        controls={<ModeSwitch mode={mode} setMode={setMode} height={22} />} />
      <button onClick={() => setAll(a => !a)} style={{ alignSelf: 'flex-start', marginTop: 10, background: 'transparent', border: 'none', padding: '4px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: '#8fb0e6', cursor: 'pointer' }}>
        {all ? '− Show key stats only' : `+ View all ${allList.length} stats year to year`}
      </button>
    </>
  )
}
