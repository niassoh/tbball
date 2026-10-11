// Jersey layers on a portrait (API profile.jerseys[slug] = { v, top, ids, current }): the
// base headshot wears his current jersey; a sprite holds a band of each other jersey of
// his career, side by side (ids = frame order), from `top` (a share of the height) down.

// The sprite frame that dresses him in jersey `id`, or -1 for none (the base portrait
// already wears it, or there's no such jersey for him).
export const frameOf = (layers, id) => (!layers || !id || id === layers.current ? -1 : layers.ids.indexOf(id))

// An overlay box showing frame k, laid over the portrait's square box.
export const frameStyle = (url, layers, k) => {
  const n = layers.ids.length
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: `${+(layers.top * 100).toFixed(2)}%`,
    backgroundImage: `url(${url})`,
    backgroundSize: `${n * 100}% 100%`,
    backgroundPosition: `${n > 1 ? (k / (n - 1)) * 100 : 0}% 0`,
    backgroundRepeat: 'no-repeat',
    pointerEvents: 'none'
  }
}

// The wipe a jersey change plays (index.css): the incoming jersey rises from the bottom
// moving forward through seasons ('up') and falls from the top moving back ('down');
// back to the base jersey, the outgoing one clears the same way.
export const wipeClass = (kind, dir) => `jersey-${kind}-${dir === 'down' ? 'down' : 'up'}`

export const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
