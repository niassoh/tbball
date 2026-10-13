// The Footprint tab's helpers: how to read each effect of the profile's `footprint`
// (thinking-bball lib/footprint.js): his team's stat with him on the floor minus off.

// A lift (his team is better for it), a cost, or neither (a style stat, such as tempo).
export const toneOf = e => (!e.good ? 'neutral' : e.good * e.diff >= 0 ? 'good' : 'bad')

// How strong a lit tile is, 0–1: how far its z clears the 2.5 bar, full at 7.
const clamp01 = v => Math.max(0, Math.min(1, v))
export const strengthOf = e => clamp01((Math.abs(e.z) - 2.5) / 4.5)

// A lit tile's color at its strength: the weakest is mostly grey, the strongest the full color.
export const shade = (color, strength) => `color-mix(in srgb, ${color} ${Math.round(40 + 60 * strength)}%, #5a5550)`

// The tile's bar: from the middle, as long as the swing ranks among players' swings in
// that stat (its percentile, left/width in percent), toward the lift side (right) or the
// cost side (left); a style stat goes the way the stat moved.
export const bar = e => {
  const half = ((e.pctl || 0) / 100) * 50
  const right = (e.good ? e.good * e.diff : e.diff) >= 0
  return { left: right ? 50 : 50 - half, width: half }
}

// A swing with its sign and one decimal, with no "−0.0".
export const swingText = v => (v === null || v === undefined ? '—' : Math.abs(v) < 0.05 ? '0.0' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`)

// What each kind of stat's swing is counted in.
export const UNITS = { pct: 'PCT PTS', pts: 'PTS/100', pace: 'POSS/48', shots: 'PTS/100 SHOTS' }

// A value in its stat's terms: a percentage with its sign, otherwise the bare number.
export const valueText = (e, v) => (v === null || v === undefined ? '—' : `${v.toFixed(1)}${e.unit === 'pct' ? '%' : ''}`)

const ordinal = n => {
  const s = ['TH', 'ST', 'ND', 'RD']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
// Where his on value ranks among the league's at either end ([place, of, 'high'|'low']):
// "HIGHEST OF 465", "8TH-LOWEST OF 465".
export const rankText = rank => {
  if (!rank) return null
  const [k, of, end] = rank
  return `${k === 1 ? '' : `${ordinal(k)}-`}${end === 'high' ? 'HIGHEST' : 'LOWEST'} OF ${of}`
}

// The teammate a teammate stat is checked with and without: his last name, or each
// season's in a span that has more than one ("GREEN/BUTLER III").
export const anchorName = anchors => [...new Set((anchors || []).map(a => ((a.name || '').split(' ').slice(1).join(' ') || a.name || '').toUpperCase()))].join('/')
// The check's two halves ("W/ LILLARD +11.0 · W/O +16.4") and its verdict.
export const wowyText = (w, name) => (w ? `W/ ${name} ${w.with ? swingText(w.with[0]) : '—'} · W/O ${w.without ? swingText(w.without[0]) : '—'}` : null)
export const wowyVerdict = w => (!w ? null : { holds: 'HOLDS', with: 'ONLY WITH', without: 'ONLY WITHOUT', mix: 'SHRINKS', thin: 'TOO THIN' }[w.kind])

// A medal for an on value in the league's top 3% at the end that helps his team, so few
// players hold one: 1 (gold) for the top 1%, 2 (silver) the top 2%, 3 (bronze) the top 3%,
// by its place among every qualified player's that season or span. A style stat helps
// neither way, so it has none.
export const MEDAL_SHARES = [0.01, 0.02, 0.03]
export const medalOf = e => {
  if (!e.rank || !e.good) return null
  const [place, of, end] = e.rank
  if ((end === 'high') !== (e.good > 0)) return null
  const tier = MEDAL_SHARES.findIndex(share => place <= share * of)
  return tier < 0 ? null : tier + 1
}
