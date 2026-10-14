import { jerseyUrl } from '../api.js'
import { frameOf, frameStyle } from '../lib/jersey.js'

// Dresses a portrait in each of `ids` (his jerseys over a season he was traded in, or a
// span, in the order he played for the teams): the portrait split into as many upright
// strips, left to right, each in one jersey (the base portrait's own where it's the one
// he wears now), blended into the next over BLEND% of the width at each seam. Goes inside
// the portrait's box, after the image, as JerseyOverlay does; `ids` come from splitIds
// (two or more, every one built), else the caller dresses him in one jersey.
// A strip fades in over the one before it, which runs on solid under the fade (so the
// base jersey never shows through between two others), or fades out itself where the
// next is the base's.
const BLEND = 12
const fade = BLEND / 2
export default function SplitJersey({ slug, size, layers, ids }) {
  const url = jerseyUrl(slug, size, layers.v)
  const n = ids.length
  const base = i => frameOf(layers, ids[i]) < 0
  return ids.map((id, i) => {
    const k = frameOf(layers, id)
    if (k < 0) return null
    const a = +((i / n) * 100).toFixed(3)
    const b = +(((i + 1) / n) * 100).toFixed(3)
    const left = i === 0 ? '#000 0%' : `transparent ${a - fade}%, #000 ${a + fade}%`
    const right = i === n - 1 ? '#000 100%' : base(i + 1) ? `#000 ${b - fade}%, transparent ${b + fade}%` : `#000 ${b + fade}%, transparent ${b + fade}%`
    const mask = `linear-gradient(90deg, ${left}, ${right})`
    return <div key={`${i}-${id}`} className="jersey-in" style={{ ...frameStyle(url, layers, k), WebkitMaskImage: mask, maskImage: mask }} />
  })
}
