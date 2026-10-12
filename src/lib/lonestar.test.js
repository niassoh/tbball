import { describe, expect, test } from 'vitest'
import { STATS, change, namesText, posOf, seasonTag, seasonsText, starsText, toneOf, value } from './lonestar.js'

const stat = key => STATS.find(s => s.key === key)

describe('lonestar', () => {
  test('values and changes, percentages as percent', () => {
    expect(value(stat('pts75'), 26.44)).toBe('26.4')
    expect(value(stat('rts'), -0.016)).toBe('-1.6')
    expect(value(stat('pct3'), null)).toBe('—')
    expect(change(stat('rts'), 0.0213)).toBe('+2.1')
    expect(change(stat('load'), -3.04)).toBe('−3.0')
    expect(change(stat('net'), 0.01)).toBe('0.0')
  })

  test('a rise is a lift, a cost, or neither for a volume stat', () => {
    expect(toneOf(stat('rts'), 0.02)).toBe('good')
    expect(toneOf(stat('ctov'), 0.02)).toBe('bad')
    expect(toneOf(stat('ctov'), -0.01)).toBe('good')
    // A volume stat: blue for more, orange for less.
    expect(toneOf(stat('load'), 5)).toBe('good')
    expect(toneOf(stat('load'), -2)).toBe('bad')
    expect(toneOf(stat('load'), 0)).toBe('neutral')
    // A change that shows as 0.0 is neither.
    expect(toneOf(stat('pa3_75'), -0.03)).toBe('neutral')
    expect(toneOf(stat('rts'), 0.0004)).toBe('neutral')
    expect(toneOf(stat('net'), null)).toBe('neutral')
  })

  test("a value's place on its stat's league range is linear and clamped", () => {
    const scale = [10, 20, 60]
    expect(posOf(scale, 35)).toBe(0.5)
    expect(posOf(scale, 0)).toBe(0)
    expect(posOf(scale, 99)).toBe(1)
    expect(posOf(scale, null)).toBe(null)
    expect(posOf(null, 30)).toBe(null)
  })

  test('stars and seasons as words', () => {
    expect(starsText([{ name: 'Jamal Murray' }, { name: 'Jonas Valančiūnas' }])).toBe('Murray & Valančiūnas')
    expect(starsText([{ name: null }])).toBe('?')
    expect(namesText([{ name: 'Jalen Williams' }, { name: 'Ajay Mitchell' }])).toBe('Jalen Williams & Ajay Mitchell')
    expect(namesText([{ name: null }])).toBe('?')
    expect(seasonsText(['2024-25', '2025-26'])).toBe('2024–25 and 2025–26')
    expect(seasonTag(['2025-26'])).toBe('25–26')
  })
})
