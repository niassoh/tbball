// Shot-profile shift map by distance group (rim, short mid, long mid, 3s). Group
// shapes come from lib/court.js; values come from raw FGA/FGM counts per zone
// (thinking-bball scripts/shotshift.js) for the recent window vs the rest of the
// season, plus the league's counts per zone, summed over each group's zones.
import { GROUPS, ZONES } from './court.js'

export { GROUPS, ZONES }

// Neutral thresholds and color scales per mode (README §2).
export const MODES = {
  value: { th: 0.4, scale: 4, label: 'VALUE' },
  freq: { th: 0.5, scale: 4, label: 'FREQ' },
  fg: { th: 1, scale: 6, label: 'FG%' }
}

// Value is points above what the league scores on the same shots, per 100 of
// the player's FGA. Plain points per 100 FGA rose with volume alone, so more
// shots from a spot read as "better" even at below-par shooting.
const zoneValue = (cell, total, points, league, mode) => {
  if (mode === 'freq') return total ? (cell.fga / total) * 100 : null
  if (mode === 'fg') return cell.fga ? (cell.fgm / cell.fga) * 100 : null
  return total ? ((points * (cell.fgm - cell.fga * (league.fgm / league.fga))) / total) * 100 : null
}

// Intensity runs from the neutral threshold up to the map's largest change
// (never less than the mode's own scale), on a curve, so with only four groups
// the biggest change stands out instead of every region saturating alike.
export const zoneFill = (d, mode, span = MODES[mode].th + MODES[mode].scale) => {
  const { th } = MODES[mode]
  const a = Math.abs(d)
  if (d === null || a < th) return 'rgba(236,232,227,.04)'
  const t = Math.min(1, (a - th) / (span - th))
  const alpha = (0.1 + 0.5 * t ** 1.5).toFixed(2)
  return d > 0 ? `rgba(89,126,193,${alpha})` : `rgba(250,150,42,${alpha})`
}

const sum = cells => cells.reduce((a, c) => ({ fga: a.fga + c.fga, fgm: a.fgm + c.fgm }), { fga: 0, fgm: 0 })

export function shotModel({ zones, league }, mode) {
  const totals = { rest: 0, recent: 0 }
  for (const { id } of ZONES) {
    totals.rest += zones[id].rest.fga
    totals.recent += zones[id].recent.fga
  }
  const groups = GROUPS.map(({ id, zones: ids, d, lx, ly, name, points }) => {
    const lg = sum(ids.map(z => league[z]))
    const rest = zoneValue(sum(ids.map(z => zones[z].rest)), totals.rest, points, lg, mode)
    const recent = zoneValue(sum(ids.map(z => zones[z].recent)), totals.recent, points, lg, mode)
    const delta = rest === null || recent === null ? null : recent - rest
    const small = delta === null || Math.abs(delta) < MODES[mode].th
    return {
      id,
      d,
      lx,
      ly,
      name,
      delta,
      small,
      label: delta === null ? '—' : (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1)
    }
  })
  const { th, scale } = MODES[mode]
  const span = Math.max(th + scale, ...groups.map(g => Math.abs(g.delta || 0)))
  return groups.map(g => ({ ...g, fill: zoneFill(g.delta, mode, span) }))
}
