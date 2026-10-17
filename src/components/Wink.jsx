import { asset } from '../lib/static.js'

// Players whose portrait has a wink (public/wink/<slug>.webp, painted by thinking-bball's
// scripts/portraits/wink.js).
const WINKS = new Set(['lebron-james'])

// His wink, laid over his headshot: a sprite of the lid half down, then closed, that a
// hover on the bio card's header or his index tile steps through (index.css), `delay` ms
// in (the header's: once its trophies have risen). Goes inside the portrait's square
// box, after the image; an <img> so the index tile's hover zoom takes it with the face.
export default function Wink({ slug, delay = 0 }) {
  if (!WINKS.has(slug)) return null
  return <img className="wink" src={asset(`wink/${slug}.webp`)} alt="" style={{ '--wink-delay': `${delay}ms`, position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '0 0', pointerEvents: 'none' }} />
}
