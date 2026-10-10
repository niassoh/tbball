// The Footprint cell's helpers (Career section): how to read each swing from the
// profile's `footprint` (thinking-bball lib/footprint.js).

// Whether his team is better (good), worse (bad) or just different (neutral, e.g. tempo)
// with him on the floor.
export const toneOf = s => (!s.good || !s.diff ? 'neutral' : Math.sign(s.diff) * s.good > 0 ? 'good' : 'bad')

// The context verdicts, as stamped on a tile.
export const STAMPS = {
  own: 'HIS OWN',
  replacement: 'BACKUP EFFECT',
  partner: 'PARTNER EFFECT',
  thin: 'THIN SAMPLE'
}

// Positions (0–100) of the off value, on value and league value on a tile's meter, which
// spans the three with a margin so neither end sits on the edge.
export const meter = ({ on, off, lg }) => {
  const vals = [on, off, lg].filter(v => v !== null && v !== undefined)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = (hi - lo || 1) * 0.15
  const at = v => (v === null || v === undefined ? null : ((v - lo + pad) / (hi - lo + 2 * pad)) * 100)
  return { off: at(off), on: at(on), lg: at(lg) }
}

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
