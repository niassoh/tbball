import { describe, expect, test } from 'vitest'
import { frameOf, frameStyle, wipeClass } from './jersey.js'

const layers = { v: 'abc', top: 0.58, ids: ['OKC', 'GSW', 'BKN'], current: 'HOU' }

describe('jersey', () => {
  test('a jersey is a sprite frame, or none when the base already wears it', () => {
    expect(frameOf(layers, 'GSW')).toBe(1)
    expect(frameOf(layers, 'HOU')).toBe(-1)
    expect(frameOf(layers, 'MIA')).toBe(-1)
    expect(frameOf(null, 'GSW')).toBe(-1)
    expect(frameOf(layers, null)).toBe(-1)
  })

  test('the overlay shows its frame of the sprite, from the band top down', () => {
    const s = frameStyle('u.webp', layers, 2)
    expect(s.top).toBe('58%')
    expect(s.backgroundSize).toBe('300% 100%')
    expect(s.backgroundPosition).toBe('100% 0')
    expect(frameStyle('u.webp', layers, 0).backgroundPosition).toBe('0% 0')
    expect(frameStyle('u.webp', { ...layers, ids: ['OKC'] }, 0).backgroundPosition).toBe('0% 0')
  })

  test('wipes rise going forward and fall going back', () => {
    expect(wipeClass('in', 'up')).toBe('jersey-in-up')
    expect(wipeClass('out', 'down')).toBe('jersey-out-down')
    expect(wipeClass('in', undefined)).toBe('jersey-in-up')
  })
})
