import { describe, expect, test } from 'vitest'
import { mateSegments, meter, toneOf } from './footprint.js'

describe('footprint', () => {
  test('a swing is good or bad for the team by its direction, neutral when it is neither', () => {
    expect(toneOf({ good: 1, diff: 8.4 })).toBe('good')
    expect(toneOf({ good: -1, diff: 5.6 })).toBe('bad')
    expect(toneOf({ good: -1, diff: -3.3 })).toBe('good')
    expect(toneOf({ good: 0, diff: 2.1 })).toBe('neutral')
  })

  test('the meter spans off, on and the league value with a margin at both ends', () => {
    const m = meter({ off: 61.4, on: 69.8, lg: 64 })
    expect(m.off).toBeGreaterThan(0)
    expect(m.on).toBeLessThan(100)
    expect(m.off).toBeLessThan(m.lg)
    expect(m.lg).toBeLessThan(m.on)
  })

  test("the context text splits around the teammate's name", () => {
    const mate = { name: 'Zeke Nnaji', slug: 'zeke-nnaji' }
    expect(mateSegments('With Zeke Nnaji also off, the gap is +1.1.', mate)).toEqual([{ text: 'With ' }, { mate }, { text: ' also off, the gap is +1.1.' }])
    expect(mateSegments('Holds up.', null)).toEqual([{ text: 'Holds up.' }])
  })
})
