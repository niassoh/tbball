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

// His jerseys over a season or a span of a profile's `seasons` (from..to, 'YYYY-YY'), in
// the order he played for the teams: a traded season's each (`jerseys`), else its own; one
// worn on into the next season counts once.
export const jerseysOver = (seasons, from, to) => seasons
  .filter(s => s.season >= from && s.season <= to)
  .flatMap(s => s.jerseys || [s.jersey])
  .filter((id, i, all) => id && id !== all[i - 1])

// The jerseys to split a portrait between (SplitJersey): two or more, each one he has
// (built in his sprite, or the base portrait's own); else null, for one jersey instead.
export const splitIds = (layers, ids) => (layers && ids && ids.length > 1 && ids.every(id => id === layers.current || layers.ids.includes(id)) ? ids : null)

export const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
