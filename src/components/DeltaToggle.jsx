import { MONO } from '../lib/format.js'

const DIM = '#a09a93'
const EDGE = '#544f4b'

// Playoffs minus regular season, or a regular season minus the one before: a small switch
// beside the season toggle, so the toggle stays the choice that matters; off (greyed, in its
// place) where there's nothing to set against. VS REG is held to VS PREV's width, so a switch
// of mode doesn't move the season toggle; on a phone it reads Δ alone (index.css .lb-vs).
// `who`: whose seasons the tip names, a player's (the Leaderboard) or a team's.
export default function DeltaToggle({ on, set, disabled, playoffs, who = 'player' }) {
  const tip = playoffs ? "Each player's playoffs minus his regular season" : who === 'team' ? "Each team's season minus its season before" : "Each player's season minus his season before"
  return (
    <button type="button" aria-pressed={on} aria-label={playoffs ? 'Δ vs regular season' : 'Δ vs previous season'} disabled={disabled} onClick={() => set(!on)} title={tip}
      style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 9px', border: `1px solid ${on ? 'var(--accent)' : EDGE}`, background: 'transparent', color: on ? 'var(--accent)' : DIM, fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 400, letterSpacing: '.08em', opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, border: '1px solid currentColor', background: on ? 'currentColor' : 'transparent' }} />
      Δ<span className="lb-vs" style={{ minWidth: '4.8em' }}>VS {playoffs ? 'REG' : 'PREV'}</span>
    </button>
  )
}
