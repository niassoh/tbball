import { MONO } from '../lib/format.js'

// RAW | PCTL: what a table's numbers read in (the Lonestar tab's, the Leaderboard's).
const INK = '#ece8e3'
const DIM = '#8a847e'
const EDGE = '#544f4b'

export default function ModeSwitch({ mode, setMode, height = 28 }) {
  return (
    <div role="group" aria-label="Show values as" style={{ display: 'flex', border: `1px solid ${EDGE}`, flex: 'none' }}>
      {[['raw', 'Raw'], ['pctl', 'Pctl']].map(([m, name]) => (
        <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
          style={{ height, padding: '0 12px', background: mode === m ? '#3a3734' : 'transparent', color: mode === m ? INK : DIM, border: 'none', fontFamily: MONO, fontSize: 9, fontWeight: mode === m ? 700 : 500, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>{name}</button>
      ))}
    </div>
  )
}
