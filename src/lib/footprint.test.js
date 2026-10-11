import { describe, expect, test } from 'vitest'
import { bar, seasonsOf, seasonsText, shade, strengthOf, swingText, toneOf, yearsText } from './footprint.js'

describe('footprint', () => {
  test('a lift or a cost by which way the stat helps, neither for a style stat', () => {
    expect(toneOf({ good: 1, diff: 2.1 })).toBe('good')
    expect(toneOf({ good: -1, diff: 2.1 })).toBe('bad')
    expect(toneOf({ good: -1, diff: -0.4 })).toBe('good')
    expect(toneOf({ good: 0, diff: 4.5 })).toBe('neutral')
  })

  test('strength grows with z from the 2.5 bar to 7, and shades the color', () => {
    expect(strengthOf({ z: 2.5 })).toBe(0)
    expect(strengthOf({ z: -4.75 })).toBeCloseTo(0.5)
    expect(strengthOf({ z: 10.8 })).toBe(1)
    expect(shade('#fa962a', 0)).toBe('color-mix(in srgb, #fa962a 40%, #5a5550)')
    expect(shade('#fa962a', 1)).toBe('color-mix(in srgb, #fa962a 100%, #5a5550)')
  })

  test('the bar is as long as the swing ranks among players, toward the lift or the cost', () => {
    expect(bar({ good: 1, diff: 3, pctl: 90 })).toEqual({ left: 50, width: 45 })
    expect(bar({ good: -1, diff: 3, pctl: 50 })).toEqual({ left: 25, width: 25 })
    expect(bar({ good: 0, diff: -2, pctl: 100 })).toEqual({ left: 0, width: 50 })
    expect(bar({ good: 1, diff: null, pctl: null })).toEqual({ left: 50, width: 0 })
  })

  test('swings with a sign and one decimal', () => {
    expect(swingText(9.26)).toBe('+9.3')
    expect(swingText(-2)).toBe('−2.0')
    expect(swingText(-0.04)).toBe('0.0')
    expect(swingText(null)).toBe('—')
  })

  test('seasons and years', () => {
    expect(seasonsOf({ spans: [{ season: '2025-26' }, { season: '2024-25' }, { season: '2025-26' }] })).toEqual(['2024-25', '2025-26'])
    expect(seasonsText(['2024-25', '2025-26'])).toBe('2024–25 and 2025–26')
    expect(yearsText(['2025-26', '2024-25'])).toBe('2024–2026')
    expect(yearsText(['2025-26'])).toBe('2025–2026')
  })
})
