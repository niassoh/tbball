import { describe, expect, test } from 'vitest'
import { adjustment, bar, changeText, seasonsText, shade, strengthOf, toneOf, yearsText } from './footprint.js'

describe('footprint', () => {
  test('a lift or a cost by the sign of its points', () => {
    expect(toneOf({ pts: 2.1 })).toBe('good')
    expect(toneOf({ pts: -0.99 })).toBe('bad')
  })

  test('strength grows with z from the 2.5 bar to 7, and shades the color', () => {
    expect(strengthOf({ z: 2.5 })).toBe(0)
    expect(strengthOf({ z: -4.75 })).toBeCloseTo(0.5)
    expect(strengthOf({ z: 10.8 })).toBe(1)
    expect(shade('#fa962a', 0)).toBe('color-mix(in srgb, #fa962a 40%, #5a5550)')
    expect(shade('#fa962a', 1)).toBe('color-mix(in srgb, #fa962a 100%, #5a5550)')
  })

  test('the bar runs from the middle to the points, capped at the scale', () => {
    expect(bar(1.5)).toEqual({ left: 50, width: 25 })
    expect(bar(-1.5)).toEqual({ left: 25, width: 25 })
    expect(bar(6)).toEqual({ left: 50, width: 50 })
  })

  test('seasons and years', () => {
    expect(seasonsText(['2024-25', '2025-26'])).toBe('2024–25 and 2025–26')
    expect(yearsText(['2025-26', '2024-25'])).toBe('2024–2026')
    expect(yearsText(['2025-26'])).toBe('2025–2026')
  })

  test('stat changes with one decimal, none for the shot-location tiles', () => {
    expect(changeText({ change: -2.28 })).toBe('−2.3')
    expect(changeText({ change: null })).toBe(null)
  })

  test('the adjustment: before, after, and only the teammates who moved it noticeably', () => {
    const a = adjustment({ raw: 1.42, own: 1.03, top: [{ name: 'A B', slug: 'a-b', v: 0.27 }, { name: 'C D', slug: null, v: 0.06 }], others: 0.06, opponents: -0.16, schedule: 0, rest: 0.1 })
    expect(a.before).toBe(1.42)
    expect(a.after).toBe(1.03)
    expect(a.mates.map(m => m.name)).toEqual(['A B'])
  })
})
