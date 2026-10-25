import { describe, expect, test } from 'vitest'
import { UNITS, anchorName, bar, medalOf, shade, strengthOf, swingText, toneOf, topPlaceOf, tourExample, unitOf, valueText, worstText } from './footprint.js'

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
    expect(shade('#fa962a', 0)).toBe('color-mix(in srgb, #fa962a 60%, #5a5550)')
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
    // A stat measured in a named percentage swings in it; the rest by their kind.
    expect(unitOf('tmTs', 'pct')).toBe('TS%')
    expect(unitOf('tm3Pct', 'pct')).toBe('3P%')
    expect(unitOf('tovPct', 'pct')).toBe('TOV%')
    expect(unitOf('orebPct', 'pct')).toBe('ORB%')
    expect(unitOf('tm3Rate', 'pct')).toBe('PCT PTS')
  })

  test('the teammate check is named for his anchor', () => {
    const lillard = { name: 'Damian Lillard', slug: 'damian-lillard', seasons: ['2023-24', '2024-25'] }
    expect(anchorName([lillard])).toBe('LILLARD')
    // A span with a different anchor by season names each.
    expect(anchorName([{ name: 'Draymond Green' }, { name: 'Jimmy Butler III' }])).toBe('GREEN/BUTLER III')
  })

  test("a medal for the league's top 1, 2 or 3% at the end that helps his team", () => {
    // Of 500: places 1–5 gold, 6–10 silver, 11–15 bronze.
    expect(medalOf({ good: 1, rank: [1, 500, 'best'] })).toBe(1)
    expect(medalOf({ good: 1, rank: [5, 500, 'best'] })).toBe(1)
    expect(medalOf({ good: 1, rank: [6, 500, 'best'] })).toBe(2)
    expect(medalOf({ good: -1, rank: [15, 500, 'best'] })).toBe(3)
    expect(medalOf({ good: 1, rank: [16, 500, 'best'] })).toBe(null)
    // A smaller league (a span's top half by minutes) has fewer: of 305, gold is 1–3.
    expect(medalOf({ good: 1, rank: [4, 305, 'best'] })).toBe(2)
    // The worst end, or unplaced (unlit, or a style stat): none.
    expect(medalOf({ good: 1, rank: [1, 500, 'worst'] })).toBe(null)
    expect(medalOf({ good: 1, rank: null })).toBe(null)
  })

  test("a badge for a place among the league's 10 best or 10 worst", () => {
    expect(topPlaceOf({ good: 1, rank: [1, 500, 'best'] })).toEqual({ place: 1, worst: false })
    expect(topPlaceOf({ good: -1, rank: [10, 500, 'best'] })).toEqual({ place: 10, worst: false })
    expect(topPlaceOf({ good: 1, rank: [3, 500, 'worst'] })).toEqual({ place: 3, worst: true })
    expect(topPlaceOf({ good: 1, rank: [11, 500, 'best'] })).toBe(null)
    expect(topPlaceOf({ good: 1, rank: null })).toBe(null)
    expect(worstText(1)).toBe('LEAGUE WORST')
    expect(worstText(2)).toBe('2ND WORST')
    expect(worstText(10)).toBe('10TH WORST')
  })

  test("the tour's tile: his best-placed lift, never a teammate effect, else any lit tile, else his biggest swing", () => {
    const tile = (key, x) => ({ key, effect: key, label: key, unit: 'pts', good: 1, diff: 2, on: 110, off: 108, status: 'notable', mate: false, rank: null, pctl: 80, swingPctl: 80, ...x })
    const ortg = tile('ortg', { diff: 16.1, rank: [1, 242, 'best'], effect: 'Offensive rating' })
    const rim = tile('rimPts', { rank: [1, 242, 'best'], mate: true, pctl: 99 })
    const pace = tile('pace', { good: 0, pctl: 100, swingPctl: null, z: 3 })
    const drtg = tile('drtg', { good: -1, diff: 3, z: 2.6, rank: [2, 242, 'worst'], pctl: 2, swingPctl: 2 })
    expect(tourExample([pace, rim, tile('tov', { rank: [4, 242, 'best'] }), ortg], 'Jokić')).toEqual({ key: 'ortg', text: '**good:Offensive rating +16.1** with Jokić on: league **good:#1**.' })
    expect(tourExample([tile('a', { pctl: 70 }), tile('b', { pctl: 91, swingPctl: 93 })], 'X').text).toBe('**good:b +2.0** with X on: 93rd percentile.')
    expect(tourExample([pace, drtg], 'X').text).toBe("**bad:drtg +3.0** with X on: league's **bad:2nd worst**.")
    expect(tourExample([pace, { ...drtg, rank: null }], 'X').text).toBe('**pace +2.0** with X on: style, not better or worse.')
    expect(tourExample([tile('a', { status: 'noise', pctl: 40, swingPctl: 40 }), tile('b', { status: 'noise', pctl: 60, swingPctl: 60 }), tile('c', { status: 'na', diff: null })], 'X').text).toBe('**b +2.0** with X on: within the noise.')
    expect(tourExample([], 'X')).toBe(null)
  })
})
