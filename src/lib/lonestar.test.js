import { describe, expect, test } from 'vitest'
import { STATS, change, litOf, seasonsText, starsText, stripOf, toneOf, value } from './lonestar.js'

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

  test('the rank meter lights all for #1 and none for the last', () => {
    expect(litOf({ rank: 1, of: 200 })).toBe(10)
    expect(litOf({ rank: 200, of: 200 })).toBe(0)
    expect(litOf({ rank: 100, of: 199 })).toBe(5)
    expect(litOf(null)).toBe(0)
  })

  test('a strip marks where he is with and without his stars, and the cells between', () => {
    // 40th with them (cell 8), 70th without (cell 14).
    const up = stripOf(40, 70)
    expect(up[8]).toBe('with')
    expect(up[14]).toBe('without')
    expect(up.slice(9, 14)).toEqual(['between', 'between', 'between', 'between', 'between'])
    expect(up.filter(c => c === 'empty')).toHaveLength(13)
    // The other way round.
    const down = stripOf(70, 40)
    expect([down[14], down[8], down[11]]).toEqual(['with', 'without', 'between'])
    // The same cell either way; the 100th in the last cell.
    expect(stripOf(50, 52)[10]).toBe('both')
    expect(stripOf(100, 100)[19]).toBe('both')
    // A missing side marks only the other.
    expect(stripOf(null, 40).filter(c => c !== 'empty')).toEqual(['without'])
  })

  test('stars and seasons as words', () => {
    expect(starsText([{ name: 'Jamal Murray' }, { name: 'Jonas Valančiūnas' }])).toBe('Murray & Valančiūnas')
    expect(starsText([{ name: null }])).toBe('?')
    expect(seasonsText(['2024-25', '2025-26'])).toBe('2024–25 and 2025–26')
  })
})
