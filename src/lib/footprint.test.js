import { describe, expect, test } from 'vitest'
import { UNITS, anchorName, bar, medalOf, pctlText, shade, strengthOf, swingText, toneOf, topPlaceOf, unitOf, valueText } from './footprint.js'

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
    // A stat measured in a named percentage swings in it; the rest by their kind.
    expect(unitOf('tmTs', 'pct')).toBe('TS%')
    expect(unitOf('tm3Pct', 'pct')).toBe('3P%')
    expect(unitOf('tovPct', 'pct')).toBe('TOV%')
    expect(unitOf('orebPct', 'pct')).toBe('ORB%')
    expect(unitOf('tm3Rate', 'pct')).toBe('PCT PTS')
  })

  test('percentiles as ordinals', () => {
    expect(pctlText(95)).toBe('95TH PCTL')
    expect(pctlText(1)).toBe('1ST PCTL')
    expect(pctlText(22)).toBe('22ND PCTL')
    expect(pctlText(13)).toBe('13TH PCTL')
    expect(pctlText(null)).toBe(null)
  })

  test('the teammate check is named for his anchor', () => {
    const lillard = { name: 'Damian Lillard', slug: 'damian-lillard', seasons: ['2023-24', '2024-25'] }
    expect(anchorName([lillard])).toBe('LILLARD')
    // A span with a different anchor by season names each.
    expect(anchorName([{ name: 'Draymond Green' }, { name: 'Jimmy Butler III' }])).toBe('GREEN/BUTLER III')
  })

  test("a medal for the league's top 1, 2 or 3% at the end that helps his team", () => {
    // Of 500: places 1–5 gold, 6–10 silver, 11–15 bronze.
    expect(medalOf({ good: 1, rank: [1, 500, 'high'] })).toBe(1)
    expect(medalOf({ good: 1, rank: [5, 500, 'high'] })).toBe(1)
    expect(medalOf({ good: 1, rank: [6, 500, 'high'] })).toBe(2)
    expect(medalOf({ good: -1, rank: [15, 500, 'low'] })).toBe(3)
    expect(medalOf({ good: 1, rank: [16, 500, 'high'] })).toBe(null)
    // A smaller league (a span's top half by minutes) has fewer: of 305, gold is 1–3.
    expect(medalOf({ good: 1, rank: [4, 305, 'high'] })).toBe(2)
    // The wrong end, or a style stat: none.
    expect(medalOf({ good: 1, rank: [1, 500, 'low'] })).toBe(null)
    expect(medalOf({ good: 0, rank: [1, 500, 'high'] })).toBe(null)
    expect(medalOf({ good: 1, rank: null })).toBe(null)
  })

  test('a badge for a top-10 place at the end that helps his team', () => {
    expect(topPlaceOf({ good: 1, rank: [1, 500, 'high'] })).toBe(1)
    expect(topPlaceOf({ good: -1, rank: [10, 500, 'low'] })).toBe(10)
    expect(topPlaceOf({ good: 1, rank: [11, 500, 'high'] })).toBe(null)
    expect(topPlaceOf({ good: 1, rank: [3, 500, 'low'] })).toBe(null)
    expect(topPlaceOf({ good: 0, rank: [1, 500, 'high'] })).toBe(null)
    expect(topPlaceOf({ good: 1, rank: null })).toBe(null)
  })
})
