import { describe, expect, it } from 'vitest'
import { modeless, readMode, withMode } from './mode.js'

describe('playoffs mode', () => {
  it('follows the URL first, then the stored choice', () => {
    expect(readMode('?playoffs', null)).toBe(true)
    expect(readMode('?playoffs', 'regular')).toBe(true)
    expect(readMode('?playoffs=0', 'playoffs')).toBe(false)
    expect(readMode('', 'playoffs')).toBe(true)
    expect(readMode('', 'regular')).toBe(false)
    expect(readMode('', null)).toBe(false)
    expect(readMode('?other=1', 'playoffs')).toBe(true)
  })

  it('keeps a path in the mode', () => {
    expect(withMode('/player/nikola-jokic', true)).toBe('/player/nikola-jokic?playoffs')
    expect(withMode('/player/nikola-jokic', false)).toBe('/player/nikola-jokic')
  })

  it('only means something on a player page', () => {
    expect(modeless('/')).toBe(true)
    expect(modeless('/player/nikola-jokic')).toBe(false)
  })
})
