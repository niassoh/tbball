import { jerseyUrl } from '../api.js'
import { frameOf, frameStyle } from '../lib/jersey.js'

// Dresses a portrait in each of `ids` (his jerseys over a season he was traded in, or a
// span, in the order he played for the teams): the portrait split into as many upright
// strips, left to right, each in one jersey (the base portrait's own where it's the one
// he wears now). Goes inside the portrait's box, after the image, as JerseyOverlay does;
// `ids` come from splitIds (two or more, every one built), else the caller dresses him in
// one jersey.
export default function SplitJersey({ slug, size, layers, ids }) {
  const url = jerseyUrl(slug, size, layers.v)
  const n = ids.length
  return ids.map((id, i) => {
    const k = frameOf(layers, id)
    return k < 0 ? null : <div key={`${i}-${id}`} className="jersey-in" style={{ ...frameStyle(url, layers, k), clipPath: `inset(0 ${+(100 - ((i + 1) / n) * 100).toFixed(3)}% 0 ${+((i / n) * 100).toFixed(3)}%)` }} />
  })
}
