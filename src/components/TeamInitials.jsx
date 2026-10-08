import { TEAM_COLORS, initials } from '../lib/teams.js'
import { asset } from '../lib/static.js'

// Portrait fallback: the player's initials over a muted team-color disc with a
// faint white team logo. Teams without a logo (defunct franchises) get a plain disc.
export default function TeamInitials({ name, team, fontSize }) {
  const color = TEAM_COLORS[team]
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color ? `color-mix(in srgb, ${color} 45%, #2c2a28)` : '#34312e' }}>
      {color && <img src={asset(`logos/${team}.png`)} alt="" style={{ position: 'absolute', inset: '14%', width: '72%', height: '72%', objectFit: 'contain', opacity: 0.16 }} />}
      <span style={{ position: 'relative', fontSize, fontWeight: 800, color: color ? '#ece8e3' : '#6b655f', textShadow: color ? '0 1px 3px rgba(0,0,0,.45)' : 'none' }}>{initials(name)}</span>
    </div>
  )
}
