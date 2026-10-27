// Color and number helpers ported from the design reference
// (design_handoff_player_profile/Player Profile v3.dc.html, col/heat/ord/fmt).

export const COLORS = {
  blue: '#597ec1',
  blueLight: '#8fb0e6',
  orange: '#fa962a',
  green: '#97c197',
  yellow: '#e6c27a',
  text: '#ece8e3',
  muted: '#b3ada6',
  dim: '#a09a93',
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
// The same for text on the dark ground, lighter throughout so a middling percentile still reads.
const TEXT_GREY = [190, 184, 177]
const TEXT_BLUE = [143, 176, 230]
const TEXT_ORANGE = [250, 165, 80]
export const colText = p => (p >= 50 ? mix(TEXT_GREY, TEXT_BLUE, (p - 50) / 50) : mix(TEXT_GREY, TEXT_ORANGE, (50 - p) / 50))

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

// A stat that's a share of 100, by its label: the players' with a %, Corner 3 Share, and
// the team sheet's (its header's Off-Ball Share%, 3p%, which the pull drops). Not the
// Footprint's swings (`swing`), which carry their own units.
const PERCENT = /%|Share$|share$|^(Opp )?3p$|^LayupAst$|^Opp Rim FG$|^(Off|Def) after /
// A document's stats marked `pct` as it arrives, so fmt prints their %.
export const markPercents = doc => {
  if (doc && doc.stats && !Array.isArray(doc.stats)) {
    for (const [l, st] of Object.entries(doc.stats)) if (st && typeof st === 'object') st.pct = !st.swing && PERCENT.test(l)
  }
  return doc
}

// Fixed decimals, "+" for positive relative stats, typographic minus, a % for a share.
export const fmt = (stat, n) => {
  if (n === null || n === undefined) return '—'
  // A height in inches, as feet and inches.
  if (stat.feet) {
    const r = Math.round(n)
    return `${Math.floor(r / 12)}'${r % 12}"`
  }
  // Sign by the rounded value, so +0.04 at one decimal reads 0.0, not +0.0 (or −0.0).
  const rounded = Number(n.toFixed(stat.dec))
  let t = Math.abs(rounded) === 0 ? (0).toFixed(stat.dec) : n.toFixed(stat.dec)
  if (stat.relative && rounded > 0) t = '+' + t
  return t.replace('-', '−') + (stat.pct ? '%' : '')
}

export const signed = (n, dec = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(dec)

export const seasonShort = label => label.slice(2) // '2025–26' -> '25–26'
