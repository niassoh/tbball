// Color and number helpers ported from the design reference
// (design_handoff_player_profile/Player Profile v3.dc.html, col/heat/ord/fmt).

export const COLORS = {
  blue: '#597ec1',
  blueLight: '#8fb0e6',
  orange: '#fa962a',
  green: '#97c197',
  yellow: '#e6c27a',
  text: '#ece8e3',
  muted: '#a8a29c',
  dim: '#8a847e',
  rule: '#3d3a37',
  border: '#544f4b'
}

export const MONO = "'IBM Plex Mono',monospace"

const BLUE = [89, 126, 193]
const ORANGE = [250, 150, 42]
const GREY = [122, 117, 112]
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`

// Percentile color: grey -> blue above 50, grey -> orange below 50.
export const col = p => (p >= 50 ? mix(GREY, BLUE, (p - 50) / 50) : mix(GREY, ORANGE, (50 - p) / 50))

// Table cell shading; the current season gets a small alpha boost.
export const heat = (p, boost = 0) => {
  const a = Math.min(0.85, (Math.abs(p - 50) / 50) * 0.6 + boost).toFixed(2)
  return p >= 50 ? `rgba(89,126,193,${a})` : `rgba(250,150,42,${a})`
}

export const ord = p => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = p % 100
  return p + (s[(v - 20) % 10] || s[v] || s[0])
}

// Fixed decimals, "+" for positive relative stats, typographic minus.
export const fmt = (stat, n) => {
  if (n === null || n === undefined) return '—'
  // Sign by the rounded value, so +0.04 at one decimal reads 0.0, not +0.0 (or −0.0).
  const rounded = Number(n.toFixed(stat.dec))
  let t = Math.abs(rounded) === 0 ? (0).toFixed(stat.dec) : n.toFixed(stat.dec)
  if (stat.relative && rounded > 0) t = '+' + t
  return t.replace('-', '−')
}

export const signed = (n, dec = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(dec)

export const seasonShort = label => label.slice(2) // '2025–26' -> '25–26'
