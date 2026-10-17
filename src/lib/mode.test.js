import { describe, expect, it } from 'vitest'
import { modeless, readMode, withMode } from './mode.js'

describe('playoffs mode', () => {
  it('lives in the URL only: no ?playoffs is the regular season', () => {
    expect(readMode('?playoffs')).toBe(true)
    expect(readMode('?playoffs=0')).toBe(false)
    expect(readMode('')).toBe(false)
    expect(readMode('?other=1')).toBe(false)
  })

  it('keeps a path in the mode', () => {
    expect(withMode('/player/nikola-jokic', true)).toBe('/player/nikola-jokic?playoffs')
    expect(withMode('/player/nikola-jokic', false)).toBe('/player/nikola-jokic')
  })

  it('only means something on a player page', () => {
    expect(modeless('/')).toBe(true)
    expect(modeless('/player/nikola-jokic')).toBe(false)
    expect(modeless('/leaderboard')).toBe(false)
  })
})
