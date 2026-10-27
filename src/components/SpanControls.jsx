import { MONO } from '../lib/format.js'

// The season picker's panel controls for a board over many seasons, the Leaderboard's
// and the Team board's: SINGLE | COMBINED and the runs.
const INK = '#ece8e3'
const DIM = '#a09a93'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }

// A span's rows: each player-season, or one per player combined over the span (the
// profile's span averages): SINGLE | COMBINED, small, beside the span's readout in the
// season picker's panel. `tips`: the two buttons' hovers (a team's, on the Team board).
export function Each({ each, set, tips = ['A row for each of his seasons', 'One row for his seasons together'] }) {
  return (
    <div role="group" aria-label="Rows" style={{ display: 'flex', flex: 'none', border: `1px solid ${EDGE}` }}>
      {[[true, 'Single', tips[0]], [false, 'Combined', tips[1]]].map(([on, name, tip]) => (
        <button key={name} type="button" aria-pressed={each === on} onClick={() => set(on)} title={tip}
          style={{ height: 22, padding: '0 8px', border: 0, borderLeft: on ? 0 : `1px solid ${EDGE}`, background: each === on ? '#3a3734' : 'transparent', color: each === on ? INK : '#c9c3bc', fontFamily: MONO, fontSize: 9, fontWeight: each === on ? 700 : 400, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{name}</button>
      ))}
    </div>
  )
}

// Eras, in the season picker's panel, set apart from the seasons under an OR (a run is
// a view of its own, not a span): every player's runs of 3, 5 or 7 of his seasons over all
// the years (lib/board.js eras), the span lightly beside his name; in the playoffs, of his
// playoff runs. A lit length again, or a season picked on the strip, goes back to seasons.
// On the Leaderboard, turning runs on sets the minutes qualifier to the top half. `who`:
// whose runs (the Team board's, a team's).
const ERAS = [3, 5, 7]
export function Eras({ era, set, playoffs = false, who = 'player' }) {
  const rule = <span style={{ flex: 1, height: 1, background: EDGE }} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{rule}<span style={{ ...label, fontSize: 10, color: '#b8b2ab' }}>or</span>{rule}</div>
      <span style={{ ...label, fontSize: 10, color: era ? 'var(--accent)' : INK }}>Runs <span style={{ color: '#d9d3cc' }}>· every {who}'s 3, 5 or 7 {playoffs ? 'playoff runs' : 'seasons'} in a row, across all years</span></span>
      <div role="group" aria-label="Runs" style={{ display: 'flex', border: `1px solid ${era ? 'var(--accent)' : EDGE}` }}>
        {ERAS.map(n => (
          <button key={n} type="button" data-era={n} aria-pressed={era === n} onClick={() => set(era === n ? null : n)} title={era === n ? 'Back to seasons' : `Every ${n}-season run of every ${who}, averaged`}
            style={{ flex: 1, height: 26, padding: '0 10px', border: 0, borderLeft: n === ERAS[0] ? 0 : `1px solid ${EDGE}`, background: era === n ? '#3a3734' : 'transparent', color: era === n ? INK : '#e4dfd9', fontFamily: MONO, fontSize: 11, fontWeight: era === n ? 700 : 500, letterSpacing: '.1em', cursor: 'pointer' }}>{n} YR</button>
        ))}
      </div>
    </div>
  )
}
