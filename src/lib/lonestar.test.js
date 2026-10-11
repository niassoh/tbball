import { describe, expect, test } from 'vitest'
import { GROUPS, STATS, cellsOf, change, litOf, seasonsText, segmentsOf, shiftsOf, starsText, toneOf, value } from './lonestar.js'

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
    expect(toneOf(stat('load'), 5)).toBe('neutral')
    expect(toneOf(stat('net'), null)).toBe('neutral')
  })

  test('the rank meter lights all for #1 and none for the last', () => {
    expect(litOf({ rank: 1, of: 200 })).toBe(10)
    expect(litOf({ rank: 200, of: 200 })).toBe(0)
    expect(litOf({ rank: 100, of: 199 })).toBe(5)
    expect(litOf(null)).toBe(0)
  })

  test('a column lights a segment per 10 percentile points', () => {
    expect(segmentsOf(0)).toBe(0)
    expect(segmentsOf(46)).toBe(5)
    expect(segmentsOf(100)).toBe(10)
    expect(segmentsOf(null)).toBe(0)
  })

  test('a column shows what he holds, gains and loses without his stars', () => {
    // 40th with them, 70th without: four held, three gained.
    expect(cellsOf(40, 70)).toEqual(['held', 'held', 'held', 'held', 'gained', 'gained', 'gained', 'empty', 'empty', 'empty'])
    // 60th with them, 30th without: three held, three lost.
    expect(cellsOf(60, 30)).toEqual(['held', 'held', 'held', 'lost', 'lost', 'lost', 'empty', 'empty', 'empty', 'empty'])
  })

  test('the biggest shifts are the stats whose percentile moves most, either way', () => {
    const pctl = { on: { load: 80, passerRating: 51, rts: 43, pct3: 40, net: null }, off: { load: 98, passerRating: 96, rts: 18, pct3: 12, net: 70 } }
    expect(shiftsOf(pctl).map(x => [x.stat.key, x.delta])).toEqual([['passerRating', 45], ['pct3', -28], ['rts', -25]])
  })

  test('the stats fall in four groups, in order', () => {
    expect(GROUPS.map(g => g.name)).toEqual(['Role', 'Shot diet', 'Efficiency', 'Team'])
    expect(GROUPS.flatMap(g => g.stats)).toEqual(STATS)
  })

  test('stars and seasons as words', () => {
    expect(starsText([{ name: 'Jamal Murray' }, { name: 'Jonas Valančiūnas' }])).toBe('Murray & Valančiūnas')
    expect(starsText([{ name: null }])).toBe('?')
    expect(seasonsText(['2024-25', '2025-26'])).toBe('2024–25 and 2025–26')
  })
})
