// Shot-profile shift map by distance band (rim, short mid, long mid, 3s). Band
// shapes come from lib/court.js; values come from raw FGA/FGM counts per band
// (thinking-bball scripts/shotshift.js) for the recent window vs the rest of the
// season, plus the league's counts per band for the whole season.
import { BANDS } from './court.js'

export { BANDS }

// Neutral thresholds and color scales per mode (README §2).
export const MODES = {
  value: { th: 0.4, scale: 4, label: 'VALUE' },
  freq: { th: 0.5, scale: 4, label: 'FREQ' },
  fg: { th: 1, scale: 6, label: 'FG%' }
}

// Better / worse on the Last 30 Days card: the site's green, and a dark grey-green.
export const BETTER = [151, 193, 151]
export const WORSE = [70, 80, 74]
export const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`

// Value is points above what the league scores on the same shots, per 100 of
// the player's FGA. Plain points per 100 FGA rose with volume alone, so more
// shots from a spot read as "better" even at below-par shooting.
const bandValue = (cell, total, points, league, mode) => {
  if (mode === 'freq') return total ? (cell.fga / total) * 100 : null
  if (mode === 'fg') return cell.fga ? (cell.fgm / cell.fga) * 100 : null
  return total ? ((points * (cell.fgm - cell.fga * (league.fgm / league.fga))) / total) * 100 : null
}

// Intensity runs from the neutral threshold up to the map's largest change
// (never less than the mode's own scale), on a curve, so with only four bands
// the biggest change stands out instead of every band saturating alike.
export const zoneFill = (d, mode, span = MODES[mode].th + MODES[mode].scale) => {
  const { th } = MODES[mode]
  const a = Math.abs(d)
  if (d === null || a < th) return 'rgba(236,232,227,.04)'
  const t = Math.min(1, (a - th) / (span - th))
  const alpha = (0.35 + 0.55 * t ** 1.5).toFixed(2)
  return `rgba(${(d > 0 ? BETTER : WORSE).join(',')},${alpha})`
}

export function shotModel({ zones, league }, mode) {
  const totals = { rest: 0, recent: 0 }
  for (const { id } of BANDS) {
    totals.rest += zones[id].rest.fga
    totals.recent += zones[id].recent.fga
  }
  const bands = BANDS.map(({ id, d, clip, name, range, points }) => {
    const rest = bandValue(zones[id].rest, totals.rest, points, league[id], mode)
    const recent = bandValue(zones[id].recent, totals.recent, points, league[id], mode)
    const delta = rest === null || recent === null ? null : recent - rest
    const small = delta === null || Math.abs(delta) < MODES[mode].th
    return {
      id,
      d,
      clip,
      name,
      range,
      rest: zones[id].rest,
      recent: zones[id].recent,
      delta,
      small,
      label: delta === null ? '—' : (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1)
    }
  })
  const { th, scale } = MODES[mode]
  const span = Math.max(th + scale, ...bands.map(g => Math.abs(g.delta || 0)))
  return bands.map(g => ({ ...g, fill: zoneFill(g.delta, mode, span) }))
}
