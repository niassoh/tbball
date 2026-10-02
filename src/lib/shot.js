// Shot-profile shift map. Zone paths and label positions are copied verbatim
// from the design reference (ZD); values come from raw FGA/FGM counts per
// zone (thinking-bball scripts/shotshift.js) for the recent window vs the rest
// of the season.

// [id, svg path, labelX, labelY, name, shot value]
export const ZONES = [
  ['rim', 'M300 52 a50 50 0 1 0 -100 0 a50 50 0 1 0 100 0', 250, 52, 'RIM', 2],
  ['paint_l', 'M170 1 H250 V190 H170 Z M300 52 a50 50 0 1 0 -100 0 a50 50 0 1 0 100 0 M250 1 H330 V190 H250 Z', 208, 150, 'PAINT L', 2],
  ['paint_r', 'M250 1 H330 V190 H250 Z M300 52 a50 50 0 1 0 -100 0 a50 50 0 1 0 100 0 M170 1 H250 V190 H170 Z', 292, 150, 'PAINT R', 2],
  ['mid_l_short', 'M30 1 H170 V190 H30 Z', 100, 100, 'MID L SHORT', 2],
  ['mid_r_short', 'M330 1 H470 V190 H330 Z', 400, 100, 'MID R SHORT', 2],
  ['mid_c', 'M170 190 H330 V250 H170 Z M300 52 a50 50 0 1 0 -100 0 a50 50 0 1 0 100 0', 250, 222, 'MID C', 2],
  ['mid_l_long', 'M30 141.5 A237.5 237.5 0 0 0 110 302 L170 250 L170 190 L30 190 Z', 108, 232, 'MID L LONG', 2],
  ['mid_r_long', 'M470 141.5 A237.5 237.5 0 0 1 390 302 L330 250 L330 190 L470 190 Z', 392, 232, 'MID R LONG', 2],
  ['mid_c_long', 'M170 250 H330 L390 302 A237.5 237.5 0 0 1 110 302 Z', 250, 268, 'MID C LONG', 2],
  ['c3_l', 'M1 1 H30 V141.5 H1 Z', 16, 72, 'CORNER 3 L', 3],
  ['c3_r', 'M470 1 H499 V141.5 H470 Z', 484, 72, 'CORNER 3 R', 3],
  ['wing3_l', 'M1 141.5 H30 A237.5 237.5 0 0 0 110 302 L1 319 Z', 30, 262, 'WING 3 L', 3],
  ['wing3_r', 'M499 141.5 H470 A237.5 237.5 0 0 1 390 302 L499 319 Z', 470, 262, 'WING 3 R', 3],
  ['top3', 'M110 302 A237.5 237.5 0 0 0 390 302 L499 319 H1 Z', 250, 312, 'TOP 3', 3]
]

// Neutral thresholds and color scales per mode (README §2).
export const MODES = {
  value: { th: 0.4, scale: 4, label: 'VALUE' },
  freq: { th: 0.5, scale: 4, label: 'FREQ' },
  fg: { th: 1, scale: 6, label: 'FG%' }
}

const zoneValue = (cell, total, points, mode) => {
  if (mode === 'freq') return total ? (cell.fga / total) * 100 : null
  if (mode === 'fg') return cell.fga ? (cell.fgm / cell.fga) * 100 : null
  return total ? ((cell.fgm * points) / total) * 100 : null // points per 100 FGA
}

export const zoneFill = (d, mode) => {
  const { th, scale } = MODES[mode]
  const a = Math.abs(d)
  if (d === null || a < th) return 'rgba(236,232,227,.04)'
  const alpha = Math.min(0.6, 0.12 + ((a - th) / scale) * 0.5).toFixed(2)
  return d > 0 ? `rgba(89,126,193,${alpha})` : `rgba(250,150,42,${alpha})`
}

export function shotModel(zones, mode) {
  const totals = { rest: 0, recent: 0 }
  for (const [id] of ZONES) {
    totals.rest += zones[id].rest.fga
    totals.recent += zones[id].recent.fga
  }
  return ZONES.map(([id, d, lx, ly, name, points]) => {
    const rest = zoneValue(zones[id].rest, totals.rest, points, mode)
    const recent = zoneValue(zones[id].recent, totals.recent, points, mode)
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
      fill: zoneFill(delta, mode),
      label: delta === null ? '—' : (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1),
      rotate: name.startsWith('CORNER')
    }
  })
}
