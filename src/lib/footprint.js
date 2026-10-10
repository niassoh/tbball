// The Footprint cell's helpers (Career section): how to read each swing from the
// profile's `footprint` (thinking-bball lib/footprint.js).

// Whether his team is better (good), worse (bad) or just different (neutral, e.g. tempo)
// with him on the floor.
export const toneOf = s => (!s.good || !s.diff ? 'neutral' : Math.sign(s.diff) * s.good > 0 ? 'good' : 'bad')

// A tile's tag and whether it's lit. Every effect is listed: the notable ones that help
// or hurt his team are lit (LIFT / COST); the rest stay dim, tagged with how they fared
// (a notable neutral one, e.g. tempo, is NEUTRAL).
const TAGS = { good: 'LIFT', bad: 'COST', neutral: 'NEUTRAL' }
const QUIET = { noise: 'WITHIN NOISE', typical: 'TYPICAL', thin: 'THIN SAMPLE' }
export const tagOf = e => {
  if (e.status !== 'notable') return { tag: QUIET[e.status], tone: 'neutral', lit: false }
  const tone = toneOf(e)
  return { tag: TAGS[tone], tone, lit: tone !== 'neutral' }
}

// The context verdicts, as stamped on a tile (with the legend's icon).
export const STAMPS = {
  own: { label: 'HIS OWN', icon: '■' },
  replacement: { label: 'BACKUP EFFECT', icon: '◐' },
  partner: { label: 'PARTNER EFFECT', icon: '◇' },
  thin: { label: 'THIN SAMPLE', icon: '○' }
}

// Positions (0–100) of the off value, on value and league value on a tile's meter, which
// spans the three (at least half a point) with a margin so neither end sits on the edge.
export const meter = ({ on, off, lg }) => {
  const vals = [on, off, lg].filter(v => v !== null && v !== undefined)
  const lo = Math.min(...vals)
  const span = Math.max(Math.max(...vals) - lo, 0.5)
  const pad = span * 0.35
  const at = v => (v === null || v === undefined ? null : ((v - lo + pad) / (span + 2 * pad)) * 100)
  return { off: at(off), on: at(on), lg: at(lg) }
}

// The team's net rating swing with him on vs. off (net on − net off).
export const netSwing = ({ ortg, drtg }) => (ortg.on - drtg.on) - (ortg.off - drtg.off)

// The context text split around the teammate's name, so the name can link to him.
export const mateSegments = (text, mate) => {
  if (!mate || !mate.name || !text.includes(mate.name)) return [{ text }]
  const out = []
  text.split(mate.name).forEach((part, i, parts) => {
    if (part) out.push({ text: part })
    if (i < parts.length - 1) out.push({ mate })
  })
  return out
}

// The seasons a footprint covers with his team in each: "DEN, 2024–25 and 2025–26", or
// "DAL 2024–25 and LAL 2025–26" when they differ (a traded season lists both teams).
export const spanText = spans => {
  const dash = season => season.replace('-', '–')
  const seasons = [...new Set(spans.map(s => s.season))]
  const teams = [...new Set(spans.map(s => s.team))]
  if (teams.length === 1) return `${teams[0]}, ${seasons.map(dash).join(' and ')}`
  return seasons.map(season => `${spans.filter(s => s.season === season).map(s => s.team).join('/')} ${dash(season)}`).join(' and ')
}

// The calendar years a footprint's seasons cover: "2024–2026" for 2024-25 and 2025-26.
export const yearsText = spans => {
  const seasons = spans.map(s => s.season).sort()
  return `${seasons[0].slice(0, 4)}–${Number(seasons[seasons.length - 1].slice(0, 4)) + 1}`
}

// How strong a notable effect is, 0–1: the average of how far it clears the noise bar
// (|z| from 2.5 to 5) and how far it stands out against the league's swings (percentile
// from 75 to 100). A borderline one sits near 0, an emphatic one at 1.
const clamp01 = v => Math.max(0, Math.min(1, v))
export const strengthOf = e => (clamp01((Math.abs(e.z) - 2.5) / 2.5) + clamp01((e.pctl - 75) / 25)) / 2

// A lit tile's color at its strength: the weakest is mostly grey, the strongest the full color.
export const shade = (color, strength) => `color-mix(in srgb, ${color} ${Math.round(40 + 60 * strength)}%, #5a5550)`
