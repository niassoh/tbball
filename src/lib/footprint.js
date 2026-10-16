// The Footprint tab's helpers: how to read each effect of the profile's `footprint`
// (thinking-bball lib/footprint.js): his team's stat with him on the floor minus off.

// A lift (his team is better for it), a cost, or neither (a style stat, such as pace).
export const toneOf = e => (!e.good ? 'neutral' : e.good * e.diff >= 0 ? 'good' : 'bad')

// How strong a lit tile is, 0–1: how far its z clears the 2.5 bar, full at 7.
const clamp01 = v => Math.max(0, Math.min(1, v))
export const strengthOf = e => clamp01((Math.abs(e.z) - 2.5) / 4.5)

// A lit tile's color at its strength: the weakest 60% of it (in colour where an unlit
// tile is grey), the strongest the full color.
export const shade = (color, strength) => `color-mix(in srgb, ${color} ${Math.round(60 + 40 * strength)}%, #5a5550)`

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

// What each kind of stat's swing is counted in, and a stat's own where it has one.
export const UNITS = { pct: 'PCT PTS', pts: 'PTS/100', pace: 'POSS/48', shots: 'PTS/100 SHOTS' }
const KEY_UNITS = { tmTs: 'TS%', tm3Pct: '3P%', tovPct: 'TOV%', orebPct: 'ORB%' }
export const unitOf = (key, unit) => KEY_UNITS[key] || UNITS[unit]

// A value in its stat's terms: a percentage with its sign, otherwise the bare number.
export const valueText = (e, v) => (v === null || v === undefined ? '—' : `${v.toFixed(1)}${e.unit === 'pct' ? '%' : ''}`)

const ordinal = n => {
  const s = ['TH', 'ST', 'ND', 'RD']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// The Footprint document comes packed (thinking-bball lib/profile.js footprintDoc): the
// stats' own fields once (`stats`), each view's effects and each REMOVE BEST option's tiles
// as arrays in `fields` order, a status by its place in `statuses`. Back to effects with
// their stat's fields, and each option's tiles by stat key.
export const unpackFootprint = doc => {
  const read = (row, fields) => Object.fromEntries(fields.map((f, i) => [f, f === 'status' ? doc.statuses[row[i]] : f === 'mate' ? !!row[i] : row[i]]))
  const effect = (row, i) => {
    const { nOn, nOff, ...e } = read(row, doc.fields.effect)
    return { ...doc.stats[i], ...e, n: { on: nOn, off: nOff, noun: doc.stats[i].noun } }
  }
  const option = o => ({ ...o, tiles: Object.fromEntries(o.tiles.flatMap((row, i) => (row ? [[doc.stats[i].key, read(row, doc.fields.tile)]] : []))) })
  return { ...doc, views: doc.views.map(v => ({ ...v, effects: v.effects.map(effect), remove: { off: v.remove.off.map(option), def: v.remove.def.map(option) } })) }
}

// The teammate a teammate stat is checked with and without: his last name, or each
// season's in a span that has more than one ("GREEN/BUTLER III").
export const anchorName = anchors => [...new Set((anchors || []).map(a => ((a.name || '').split(' ').slice(1).join(' ') || a.name || '').toUpperCase()))].join('/')

// A medal for a lit swing in the league's top 3% at the end that helps his team, so few
// players hold one: 1 (gold) for the top 1%, 2 (silver) the top 2%, 3 (bronze) the top 3%,
// by its place among every qualified player's swing that season or span (`rank`: [place,
// of, 'best' | 'worst'], counted from its nearer end; the backend places only lit swings,
// and no style stat).
export const MEDAL_SHARES = [0.01, 0.02, 0.03]
const goodPlace = e => (e.rank && e.rank[2] === 'best' ? e.rank[0] : null)
export const medalOf = e => {
  const place = goodPlace(e)
  if (!place) return null
  const tier = MEDAL_SHARES.findIndex(share => place <= share * e.rank[1])
  return tier < 0 ? null : tier + 1
}

// His place when his swing is among the league's 10 best, or 10 worst (`worst`), else null:
// the tile's badge.
export const TOP_PLACES = 10
export const topPlaceOf = e => (e.rank && e.rank[0] <= TOP_PLACES ? { place: e.rank[0], worst: e.rank[2] === 'worst' } : null)
// A place among the league's 10 worst, in words: "LEAGUE WORST", "2ND WORST".
export const worstText = place => (place === 1 ? 'LEAGUE WORST' : `${ordinal(place)} WORST`)
