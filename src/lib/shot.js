// Shot-profile shift map by distance band (rim, short mid, long mid, 3s). Band
// shapes come from lib/court.js; values come from raw FGA/FGM counts per band
// (thinking-bball scripts/shotshift.js) for the recent window vs the rest of the
// season, plus his possessions on the floor in each (`poss`, from the lineup pulls).
import { BANDS } from './court.js'

export { BANDS }

// Neutral thresholds and color scales per mode (README §2).
export const MODES = {
  value: { th: 0.1, scale: 1.1, label: 'PTS / 75' },
  freq: { th: 0.5, scale: 4, label: 'FREQ' },
  fg: { th: 1, scale: 6, label: 'FG%' }
}

// "Better" on the Last 30 Days card: the site's green.
export const BETTER = [151, 193, 151]
export const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`

// Value is the points he scores from the zone per 75 of his possessions on the floor,
// so it reflects both how often and how well he shoots there: more shots from a zone at
// the same accuracy score more.
const bandValue = (cell, total, points, poss, mode) => {
  if (mode === 'freq') return total ? (cell.fga / total) * 100 : null
  if (mode === 'fg') return cell.fga ? (cell.fgm / cell.fga) * 100 : null
  return poss ? ((points * cell.fgm) / poss) * 75 : null
}

// The map's scale reads by brightness: near zero a zone matches the card's court
// background, darkening toward near-black as a change gets more negative and
// brightening to a muted green as it gets more positive. It runs from the neutral
// threshold up to the map's largest change (never less than the mode's own scale).
const NEUTRAL = [39, 37, 36]
const DARKEST = [19, 18, 17]
const GREENEST = [97, 113, 91]
// Playoffs mode shades the same way toward the site's gold (index.css --accent).
export const GOLD = [212, 167, 44]
const GOLDEST = [124, 104, 52]
export const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

export const zoneFill = (d, mode, span = MODES[mode].th + MODES[mode].scale, gold = false) => {
  const { th } = MODES[mode]
  const a = Math.abs(d)
  if (d === null || a < th) return rgb(NEUTRAL)
  const t = Math.min(1, (a - th) / (span - th)) ** 0.8
  return rgb(mix(NEUTRAL, d > 0 ? (gold ? GOLDEST : GREENEST) : DARKEST, t))
}

export function shotModel({ zones, poss = {} }, mode, gold = false) {
  const totals = { rest: 0, recent: 0 }
  for (const { id } of BANDS) {
    totals.rest += zones[id].rest.fga
    totals.recent += zones[id].recent.fga
  }
  const bands = BANDS.map(({ id, d, clip, name, lx, ly, points }) => {
    const rest = bandValue(zones[id].rest, totals.rest, points, poss.rest, mode)
    const recent = bandValue(zones[id].recent, totals.recent, points, poss.recent, mode)
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
  return bands.map(g => ({ ...g, fill: zoneFill(g.delta, mode, span, gold) }))
}

// A season's shots as the career view's data packs them (analysis/footprint/shot_bands.py
// pack): three base64url characters a shot, 18 bits: x and y in half feet from the basket
// (offset by 64 and 10), made, band index. Back to the map's [x, y, made, band] in tenths.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
export const unpackDots = packed => {
  const out = []
  for (let i = 0; i + 2 < packed.length; i += 3) {
    const v = (B64.indexOf(packed[i]) << 12) | (B64.indexOf(packed[i + 1]) << 6) | B64.indexOf(packed[i + 2])
    out.push([((v >> 11) - 64) * 5, (((v >> 3) & 255) - 10) * 5, (v >> 2) & 1, v & 3])
  }
  return out
}
