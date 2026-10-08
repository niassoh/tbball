import { MONO } from '../lib/format.js'

export default function TabNav({ tabs, active, onPick }) {
  return (
    <nav id="tabs" style={{ position: 'sticky', top: 0, zIndex: 5, background: '#262422', borderBottom: '1px solid #544f4b', display: 'flex', gap: 0, overflowX: 'auto', scrollMarginTop: 0 }}>
      {tabs.map(t => {
        const on = t.id === active
        return (
          <button key={t.id} className="tab-btn" onClick={() => onPick(t.id)} style={{ padding: '12px 16px', background: on ? '#2f2c2a' : 'transparent', border: 'none', borderLeft: '1px solid #3d3a37', boxShadow: on ? 'inset 0 -3px 0 #97c197' : 'none', fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: on ? '#ece8e3' : '#a8a29c', fontWeight: on ? 600 : 400, whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {t.name}
          </button>
        )
      })}
    </nav>
  )
}
