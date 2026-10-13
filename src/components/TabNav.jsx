import { MONO } from '../lib/format.js'

// The tab bar. The stat tabs (tables and charts) run from the left; the views (kind
// 'view': a module of its own over a picked season or span) sit apart at the right end,
// each marked with a small square, filled when open.
export default function TabNav({ tabs, active, onPick }) {
  return (
    <nav id="tabs" style={{ position: 'sticky', top: 'var(--topbar-h, 0px)', zIndex: 5, background: '#262422', borderBottom: '1px solid #544f4b', display: 'flex', gap: 0, overflowX: 'auto', scrollMarginTop: 'var(--topbar-h, 0px)' }}>
      {tabs.map((t, i) => {
        const on = t.id === active
        const view = t.kind === 'view'
        const first = view && (tabs[i - 1] || {}).kind !== 'view'
        return (
          <button key={t.id} className="tab-btn" onClick={() => onPick(t.id)} style={{ marginLeft: first ? 'auto' : 0, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: on ? '#2f2c2a' : 'transparent', border: 'none', borderLeft: `1px solid ${first ? '#837d76' : '#3d3a37'}`, boxShadow: on ? 'inset 0 -3px 0 var(--accent)' : 'none', fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: on ? '#ece8e3' : '#b3ada6', fontWeight: on ? 600 : 400, whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {view && <span aria-hidden="true" style={{ width: 7, height: 7, flex: 'none', border: '1px solid currentColor', background: on ? 'currentColor' : 'transparent' }} />}
            {t.name}
          </button>
        )
      })}
    </nav>
  )
}
