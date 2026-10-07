import { describe, expect, test } from 'vitest'
import { histogram } from './dist.js'

describe('hover histogram', () => {
  // Range 0..10 in 5 bins of width 2.
  const values = [0, 1, 1, 2, 2, 2, 3, 3, 4, 10]

  test('bins are counted with the tallest at full height', () => {
    const h = histogram(values, false, 5)
    expect(h.bars.map(b => b.count)).toEqual([3, 5, 1, 0, 1])
    expect(h.bars[1].height).toBe(1)
    expect(h.bars[0].height).toBe(0.6)
  })

  test('better is to the right, so lower-is-better flips the axis', () => {
    expect(histogram(values, false, 5).pos(10)).toBe(1)
    const flipped = histogram(values, true, 5)
    expect(flipped.pos(10)).toBe(0)
    expect(flipped.worst).toBe(10)
    expect(flipped.best).toBe(0)
    expect(flipped.bars.map(b => b.count)).toEqual([1, 0, 0, 3, 6])
  })

  test('bar percentiles rise left to right and a value finds its bin', () => {
    const h = histogram(values, false, 5)
    expect(h.bars.map(b => b.pct)).toEqual([15, 55, 85, 90, 95])
    expect(h.bin(10)).toBe(4)
    expect(h.bin(2)).toBe(1)
  })
})
