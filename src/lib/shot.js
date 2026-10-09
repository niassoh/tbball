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

// "Better" on the Last 30 Days card: the site's green.
export const BETTER = [151, 193, 151]
export const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`

// Value is points above what the league scores on the same shots, per 100 of
// the player's FGA. Plain points per 100 FGA rose with volume alone, so more
// shots from a spot read as "better" even at below-par shooting.
const bandValue = (cell, total, points, league, mode) => {
  if (mode === 'freq') return total ? (cell.fga / total) * 100 : null
  if (mode === 'fg') return cell.fga ? (cell.fgm / cell.fga) * 100 : null
  return total ? ((points * (cell.fgm - cell.fga * (league.fgm / league.fga))) / total) * 100 : null
}

// The map's scale reads by brightness: near zero a zone matches the card's court
// background, darkening toward near-black as a change gets more negative and
// brightening to a muted green as it gets more positive. It runs from the neutral
// threshold up to the map's largest change (never less than the mode's own scale).
const NEUTRAL = [39, 37, 36]
const DARKEST = [19, 18, 17]
const GREENEST = [97, 113, 91]
export const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

export const zoneFill = (d, mode, span = MODES[mode].th + MODES[mode].scale) => {
  const { th } = MODES[mode]
  const a = Math.abs(d)
  if (d === null || a < th) return rgb(NEUTRAL)
  const t = Math.min(1, (a - th) / (span - th)) ** 0.8
  return rgb(mix(NEUTRAL, d > 0 ? GREENEST : DARKEST, t))
}

export function shotModel({ zones, league }, mode) {
  const totals = { rest: 0, recent: 0 }
  for (const { id } of BANDS) {
    totals.rest += zones[id].rest.fga
    totals.recent += zones[id].recent.fga
  }
  const bands = BANDS.map(({ id, d, clip, name, lx, ly, points }) => {
    const rest = bandValue(zones[id].rest, totals.rest, points, league[id], mode)
    const recent = bandValue(zones[id].recent, totals.recent, points, league[id], mode)
    const delta = rest === null || recent === null ? null : recent - rest
    const small = delta === null || Math.abs(delta) < MODES[mode].th
    // The band's own shooting in each window, for the hover readout: makes, attempts,
    // FG% and its share of the window's shots.
    const counts = w => ({ fgm: zones[id][w].fgm, fga: zones[id][w].fga, pct: zones[id][w].fga ? (zones[id][w].fgm / zones[id][w].fga) * 100 : null, share: totals[w] ? (zones[id][w].fga / totals[w]) * 100 : null })
    return {
      id,
      d,
      clip,
      name,
      lx,
      ly,
      delta,
      small,
      recentShots: counts('recent'),
      seasonShots: counts('rest'),
      label: delta === null ? '—' : (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(1)
    }
  })
  const { th, scale } = MODES[mode]
  const span = Math.max(th + scale, ...bands.map(g => Math.abs(g.delta || 0)))
  return bands.map(g => ({ ...g, fill: zoneFill(g.delta, mode, span) }))
}
