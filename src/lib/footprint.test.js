import { describe, expect, test } from 'vitest'
import { UNITS, anchorName, bar, rankText, shade, standoutsOf, strengthOf, swingText, toneOf, valueText, wowyText, wowyVerdict } from './footprint.js'

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

  test('values in their terms, and every unit named', () => {
    expect(valueText({ unit: 'pct' }, 57.43)).toBe('57.4%')
    expect(valueText({ unit: 'shots' }, 32.1)).toBe('32.1')
    expect(valueText({ unit: 'pct' }, null)).toBe('—')
    for (const unit of ['pct', 'pts', 'pace', 'shots']) expect(UNITS[unit]).toBeTruthy()
  })

  test('a rank from its end of the league', () => {
    expect(rankText([1, 465, 'high'])).toBe('HIGHEST OF 465')
    expect(rankText([2, 465, 'high'])).toBe('2ND-HIGHEST OF 465')
    expect(rankText([8, 465, 'low'])).toBe('8TH-LOWEST OF 465')
    expect(rankText([11, 465, 'low'])).toBe('11TH-LOWEST OF 465')
    expect(rankText(null)).toBe(null)
  })

  test('the teammate check: his anchor, its halves and its verdict', () => {
    const lillard = { name: 'Damian Lillard', slug: 'damian-lillard', seasons: ['2023-24', '2024-25'] }
    expect(anchorName([lillard])).toBe('LILLARD')
    expect(anchorName([lillard, { name: 'Khris Middleton', slug: 'khris-middleton', seasons: ['2022-23'] }])).toBe('TOP OBPM MATE')
    const w = { with: [11, 9], without: [16.4, 11.3], kind: 'holds' }
    expect(wowyText(w, 'LILLARD')).toBe('W/ LILLARD +11.0 · W/O +16.4')
    expect(wowyText({ ...w, without: null, kind: 'thin' }, 'LILLARD')).toBe('W/ LILLARD +11.0 · W/O —')
    expect(wowyVerdict(w, 'LILLARD')).toBe('HOLDS WITH OR WITHOUT LILLARD')
    expect(wowyVerdict({ ...w, kind: 'with' }, 'LILLARD')).toBe('ONLY WITH LILLARD ON')
    expect(wowyVerdict(null, 'LILLARD')).toBe(null)
  })

  test("the standouts come with their effects, in the view's order", () => {
    const fp = { standouts: [{ key: 'tm3Rate', kind: 'level' }, { key: 'gone', kind: 'swing' }, { key: 'ortg', kind: 'swing' }], effects: [{ key: 'ortg' }, { key: 'tm3Rate' }] }
    expect(standoutsOf(fp).map(s => [s.key, s.kind, s.e.key])).toEqual([['tm3Rate', 'level', 'tm3Rate'], ['ortg', 'swing', 'ortg']])
    expect(standoutsOf({ effects: [] })).toEqual([])
  })
})
