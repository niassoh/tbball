import { MONO } from '../lib/format.js'

export default function SectionHeader({ num, title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid #ece8e3', paddingBottom: 8, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: MONO, fontSize: 12, color: '#fa962a' }}>{String(num).padStart(2, '0')}</span>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>{title}</h2>
      <span style={{ flex: 1 }} />
      {children}
    </div>
  )
}
