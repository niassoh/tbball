import { useState } from 'react'
import { jerseyUrl } from '../api.js'
import { frameOf, frameStyle, reducedMotion, wipeClass } from '../lib/jersey.js'

// Dresses a portrait in jersey `id`: the base headshot wears his current jersey, so any
// other is a band of his jersey sprite laid over it (lib/jersey.js). Goes inside the
// portrait's square box, after the image. With `animate`, a change of jersey wipes the
// new one in (rising when `dir` is 'up', falling when 'down') over the old one, or wipes
// the old one away back to the base jersey; a change arriving mid-wipe starts from the
// jersey that was coming in.
export default function JerseyOverlay({ slug, size, layers, id, dir, animate = false }) {
  const k = frameOf(layers, id)
  const [state, setState] = useState({ k, prev: -1, dir, n: 0, moving: false })
  if (state.k !== k) {
    const moving = animate && !reducedMotion()
    setState({ k, prev: moving ? state.k : -1, dir, n: state.n + 1, moving })
  }
  if (!layers || (state.k < 0 && !(state.moving && state.prev >= 0))) return null
  const url = jerseyUrl(slug, size, layers.v)
  const settle = () => setState(s => ({ ...s, prev: -1, moving: false }))
  if (state.moving && state.k < 0) {
    return <div key={state.n} className={wipeClass('out', state.dir)} onAnimationEnd={settle} style={frameStyle(url, layers, state.prev)} />
  }
  return (
    <>
      {state.moving && state.prev >= 0 && <div style={frameStyle(url, layers, state.prev)} />}
      <div key={state.n} className={state.moving ? wipeClass('in', state.dir) : undefined} onAnimationEnd={settle} style={frameStyle(url, layers, state.k)} />
    </>
  )
}
