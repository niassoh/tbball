import { useState } from 'react'
import { MONO, fmt } from '../lib/format.js'
import SectionHeader from './SectionHeader.jsx'

const KEY = ['BPM', 'AuPM / g', 'Net On/Off', 'Load', 'Box Creation', 'Passer Rating', 'cTOV%', 'Pts / 75', 'rTS%', 'Rim FG%', 'Midrange FG%', 'Pullup 3%', 'C&S 3%', 'FT%', 'Def FGA <6ft /36', 'DRTG On']

export default function YearToYear({ profile: p, num }) {
  const [all, setAll] = useState(false)
  const k = p.seasons.length - 1
  const tabName = Object.fromEntries(p.tabs.map(t => [t.id, t.name]))
  const allList = p.tabs.flatMap(t => t.stats).filter(l => p.stats[l].available)
  const list = all ? allList : KEY.filter(l => p.stats[l] && p.stats[l].available)
  const order = p.seasons.map((_, i) => k - i)
  const grid = `170px repeat(${p.seasons.length},minmax(118px,1fr))`

  return (
    <section id="sec-yoy" style={{ scrollMarginTop: 48, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24 }}>
      <SectionHeader num={num} title="Year to Year Changes">
        <div style={{ display: 'flex', gap: 14, fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', alignItems: 'center' }}>
          <span style={{ color: '#8fb0e6' }}>↑ IMPROVED</span><span style={{ color: '#fa962a' }}>↓ DECLINED</span>
        </div>
      </SectionHeader>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 170 + p.seasons.length * 118 + 'px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, fontFamily: MONO, fontSize: 10, letterSpacing: '.06em', color: '#8a847e', borderBottom: '1px solid #6b655f' }}>
            <span style={{ padding: '5px 10px' }}>STAT</span>
            {order.map(i => (
              <span key={i} style={{ padding: '5px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, borderLeft: '1px solid #3d3a37' }}>
                <span style={{ textAlign: 'right', color: i === k ? '#ece8e3' : '#a8a29c', fontWeight: 600 }}>{p.seasons[i].label}</span>
                <span style={{ textAlign: 'right' }}>+/−</span>
              </span>
            ))}
          </div>
          {list.map((l, idx) => {
            const st = p.stats[l]
            const showGroup = idx === 0 || p.stats[list[idx - 1]].tab !== st.tab
            return (
              <div key={l} style={{ display: 'grid', gridTemplateColumns: grid, borderBottom: '1px solid #3d3a37', fontFamily: MONO, fontSize: 12, alignItems: 'center', borderTop: showGroup ? '1px solid #544f4b' : 'none' }}>
                <span style={{ padding: '6px 10px', fontFamily: 'Montserrat,sans-serif', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 9, color: '#8a847e', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>{showGroup ? tabName[st.tab] : ''}</span>
                  <span>{l}</span>
                </span>
                {order.map(i => {
                  const v = st.vals[i]
                  const prev = i > 0 ? st.vals[i - 1] : null
                  let d = ''
                  let dc = '#8a847e'
                  if (v && prev) {
                    const dv = v.n - prev.n
                    const zero = Math.abs(dv) < Math.pow(10, -st.dec) / 2
                    const good = st.lowerBetter ? dv < 0 : dv > 0
                    d = zero ? '0' : (dv >= 0 ? '+' : '−') + Math.abs(dv).toFixed(st.dec) + (good ? ' ↑' : ' ↓')
                    dc = zero ? '#8a847e' : good ? '#8fb0e6' : '#fa962a'
                  }
                  return (
                    <span key={i} style={{ padding: '6px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, borderLeft: '1px solid #3d3a37', background: i === k ? '#2f2c2a' : 'transparent' }}>
                      <span style={{ textAlign: 'right', color: v ? '#ece8e3' : '#6b655f' }}>{v ? fmt(st, v.n) : '—'}</span>
                      <span style={{ textAlign: 'right', color: dc }}>{d}</span>
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <button onClick={() => setAll(a => !a)} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: '4px 0', fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: '#8fb0e6', cursor: 'pointer' }}>
        {all ? '− Show key stats only' : `+ View all ${allList.length} stats year to year`}
      </button>
    </section>
  )
}
