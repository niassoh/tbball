export default function SectionHeader({ title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--trim)', paddingBottom: 8, flexWrap: 'wrap' }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>{title}</h2>
      <span style={{ flex: 1 }} />
      {children}
    </div>
  )
}
