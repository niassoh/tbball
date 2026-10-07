// Depth-chart slots for the team switcher: where the viewed player sits on his own
// chart, and who sits in that slot on another team.
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']

// His highest slot ({ pos, index }) on the chart (a player listed at two positions
// counts where he is higher), or null when he isn't on it.
export const depthSlot = (depth, slug) => {
  let best = null
  for (const row of (depth && depth.rows) || []) {
    const index = row.players.findIndex(p => p.slug === slug)
    if (index !== -1 && (!best || index < best.index)) best = { pos: row.pos, index }
  }
  return best
}

// The player in the same slot on another team's chart, among players with a profile:
// same position, nearest depth (ties go to the higher spot); if nobody at that
// position has a profile, the nearest position (PG-SG-SF-PF-C) does the same.
export const bestFit = (slot, depth) => {
  const at = Math.max(0, POSITIONS.indexOf(slot.pos))
  const order = [...POSITIONS].sort((a, b) => Math.abs(POSITIONS.indexOf(a) - at) - Math.abs(POSITIONS.indexOf(b) - at))
  for (const pos of order) {
    const row = depth && depth.rows.find(r => r.pos === pos)
    const options = row ? row.players.map((player, index) => ({ player, index })).filter(o => o.player.hasProfile) : []
    if (!options.length) continue
    options.sort((a, b) => Math.abs(a.index - slot.index) - Math.abs(b.index - slot.index) || a.index - b.index)
    return { player: options[0].player, pos, index: options[0].index }
  }
  return null
}

// "STARTING C", "C #2".
export const slotName = slot => (slot.index === 0 ? `STARTING ${slot.pos}` : `${slot.pos} #${slot.index + 1}`)
