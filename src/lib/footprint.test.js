import { describe, expect, test } from 'vitest'
import { mateSegments, meter, netSwing, shade, spanText, strengthOf, tagOf, toneOf, yearsText } from './footprint.js'

describe('footprint', () => {
  test('the seasons covered name his team once, or each season\'s when they differ', () => {
    const span = (season, team) => ({ season, team, minutes: { on: 1, off: 1 } })
    expect(spanText([span('2024-25', 'DEN'), span('2025-26', 'DEN')])).toBe('DEN, 2024–25 and 2025–26')
    expect(spanText([span('2024-25', 'DAL'), span('2024-25', 'LAL'), span('2025-26', 'LAL')])).toBe('DAL/LAL 2024–25 and LAL 2025–26')
    expect(spanText([span('2025-26', 'SAS')])).toBe('SAS, 2025–26')
  })

  test('a swing is good or bad for the team by its direction, neutral when it is neither', () => {
    expect(toneOf({ good: 1, diff: 8.4 })).toBe('good')
    expect(toneOf({ good: -1, diff: 5.6 })).toBe('bad')
    expect(toneOf({ good: -1, diff: -3.3 })).toBe('good')
    expect(toneOf({ good: 0, diff: 2.1 })).toBe('neutral')
  })

  test('notable effects that help or hurt are lit; the rest are dim with how they fared', () => {
    expect(tagOf({ status: 'notable', good: 1, diff: 4.3 })).toEqual({ tag: 'LIFT', tone: 'good', lit: true })
    expect(tagOf({ status: 'notable', good: -1, diff: 2.8 })).toEqual({ tag: 'COST', tone: 'bad', lit: true })
    expect(tagOf({ status: 'notable', good: 0, diff: -3.8 })).toEqual({ tag: 'NEUTRAL', tone: 'neutral', lit: false })
    expect(tagOf({ status: 'noise', good: 1, diff: 2.2 })).toEqual({ tag: 'WITHIN NOISE', tone: 'neutral', lit: false })
    expect(tagOf({ status: 'typical', good: 1, diff: 1.1 }).tag).toBe('TYPICAL')
    expect(tagOf({ status: 'thin', good: 1, diff: null }).tag).toBe('THIN SAMPLE')
  })

  test('the meter spans off, on and the league value with a margin at both ends', () => {
    const m = meter({ off: 61.4, on: 69.8, lg: 64 })
    expect(m.off).toBeGreaterThan(0)
    expect(m.on).toBeLessThan(100)
    expect(m.off).toBeLessThan(m.lg)
    expect(m.lg).toBeLessThan(m.on)
    // A tiny swing still spans half a point, so its markers don't sit on top of each other.
    const tiny = meter({ off: 10, on: 10.1, lg: 10 })
    expect(tiny.on - tiny.off).toBeLessThan(20)
  })

  test('the years covered run from the first season\'s start to the last one\'s end', () => {
    expect(yearsText([{ season: '2025-26' }, { season: '2024-25' }])).toBe('2024–2026')
    expect(yearsText([{ season: '2025-26' }])).toBe('2025–2026')
  })

  test('a borderline effect is weak and an emphatic one strong, and shades accordingly', () => {
    expect(strengthOf({ z: -2.6, pctl: 77 })).toBeCloseTo(0.06)
    expect(strengthOf({ z: 7.1, pctl: 99 })).toBeCloseTo(0.98)
    expect(strengthOf({ z: 4, pctl: 100 })).toBeCloseTo(0.8)
    expect(shade('#fa962a', 0)).toBe('color-mix(in srgb, #fa962a 40%, #5a5550)')
    expect(shade('#fa962a', 1)).toBe('color-mix(in srgb, #fa962a 100%, #5a5550)')
  })

  test('the net swing is net rating on minus net rating off', () => {
    expect(netSwing({ ortg: { on: 121, off: 113.1 }, drtg: { on: 114.9, off: 114.7 } })).toBeCloseTo(7.7)
  })

  test("the context text splits around the teammate's name", () => {
    const mate = { name: 'Zeke Nnaji', slug: 'zeke-nnaji' }
    expect(mateSegments('With Zeke Nnaji also off, the gap is +1.1.', mate)).toEqual([{ text: 'With ' }, { mate }, { text: ' also off, the gap is +1.1.' }])
    expect(mateSegments('Holds up.', null)).toEqual([{ text: 'Holds up.' }])
  })
})
