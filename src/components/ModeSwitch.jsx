import { MONO } from '../lib/format.js'

// RAW | PCTL: what a table's numbers read in (the Lonestar tab's, the Leaderboard's); any
// other segments given as `options` ([value, name]) under `name` (Careers' axis and
// smoothing). No segment is lit when `mode` is none of them. `compact`: small, as the
// Leaderboard's in its table's corner.
const INK = '#ece8e3'
const DIM = '#a09a93'
const EDGE = '#544f4b'

const RAW_PCTL = [['raw', 'Raw'], ['pctl', 'Pctl']]

export default function ModeSwitch({ mode, setMode, height = 28, options = RAW_PCTL, name: groupName = 'Show values as', compact = false }) {
  return (
    <div role="group" aria-label={groupName} style={{ display: 'flex', border: `1px solid ${EDGE}`, flex: 'none' }}>
      {options.map(([m, name]) => (
        <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
          style={{ height, padding: compact ? '0 5px' : '0 12px', background: mode === m ? '#3a3734' : 'transparent', color: mode === m ? INK : DIM, border: 'none', fontFamily: MONO, fontSize: compact ? 7.5 : 9, fontWeight: mode === m ? 700 : 500, letterSpacing: compact ? '.08em' : '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>{name}</button>
      ))}
    </div>
  )
}
