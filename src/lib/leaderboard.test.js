import { describe, expect, test } from 'vitest'
import { axisOf, median, pctlOf, quadrantOf, quantile, radiusOf, ranked, valueOf } from './leaderboard.js'

const doc = {
  labels: ['BPM', 'cTOV%'],
  stats: { BPM: {}, 'cTOV%': { lowerBetter: true } }
}
const P = (slug, bpm, tov) => ({ slug, v: [bpm, tov], p: [50, 50] })
const players = [P('a', 1.5, 12), P('b', null, 9), P('c', 6.2, null), P('d', -2, 14)]

describe('leaderboard', () => {
  test('a player’s value and percentile by stat', () => {
    expect(valueOf(doc, players[0], 'cTOV%')).toBe(12)
    expect(valueOf(doc, players[1], 'BPM')).toBe(null)
    expect(pctlOf(doc, players[0], 'BPM')).toBe(50)
  })

  test('best first, lower first where lower is better, no value last', () => {
    expect(ranked(doc, players, 'BPM').map(p => p.slug)).toEqual(['c', 'a', 'd', 'b'])
    expect(ranked(doc, players, 'BPM', true).map(p => p.slug)).toEqual(['d', 'a', 'c', 'b'])
    expect(ranked(doc, players, 'cTOV%').map(p => p.slug)).toEqual(['b', 'a', 'd', 'c'])
  })

  test('median of the values there are', () => {
    expect(median([3, null, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([null])).toBe(null)
  })

  test('quadrants read each axis the way its stat is good', () => {
    expect(quadrantOf(5, 5, 0, 0, false, false)).toBe('both')
    expect(quadrantOf(-1, -1, 0, 0, false, false)).toBe('neither')
    expect(quadrantOf(5, -1, 0, 0, false, false)).toBe('split')
    // A low turnover rate is the good side.
    expect(quadrantOf(5, 9, 0, 12, false, true)).toBe('both')
    expect(quadrantOf(0, 12, 0, 12, false, true)).toBe('both')
  })

  test('quantiles of the values there are', () => {
    expect(quantile([4, 1, null, 3, 2, 5], 0.5)).toBe(3)
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2)
    expect(quantile([0, 10], 0.99)).toBeCloseTo(9.9)
    expect(quantile([null], 0.5)).toBe(null)
  })

  test('a scatter axis: the median at its middle, every player inside, a long tail on a square root', () => {
    // A spread-out stat around 0: linear, the median in the middle, the ends inside.
    const evenVals = [-6, -3, -1, 0, 1, 2, 5]
    const even = axisOf(evenVals)
    expect(even.root).toBe(false)
    expect(even.pos(0)).toBe(0.5)
    for (const v of evenVals) expect(even.pos(v) > 0 && even.pos(v) < 1).toBe(true)
    // Drives: most players low, one far out. On a square root, the median still in the
    // middle; nobody on an edge, and the low end not below zero.
    const drivesVals = [1, 2, 3, 4, 4, 5, 6, 25]
    const drives = axisOf(drivesVals)
    expect(drives.root).toBe(true)
    expect(drives.pos(4)).toBe(0.5)
    expect(drives.lo).toBeGreaterThanOrEqual(0)
    for (const v of drivesVals) expect(drives.pos(v) > 0 && drives.pos(v) < 1).toBe(true)
    // The lowest and highest sit just inside their ends: no empty side.
    expect(drives.pos(1)).toBeLessThan(0.05)
    expect(drives.pos(25)).toBeGreaterThan(0.95)
    // Lower is better: reversed.
    expect(axisOf(evenVals, true).pos(5)).toBeLessThan(0.5)
  })

  test('dots grow by area with minutes', () => {
    expect(radiusOf(0, 3000)).toBe(3)
    expect(radiusOf(3000, 3000)).toBe(11)
    expect(radiusOf(750, 3000)).toBe(7)
    // From the fewest minutes in the pool, not from none.
    expect(radiusOf(800, 3000, 2, 11, 800)).toBe(2)
    expect(radiusOf(3000, 3000, 2, 11, 800)).toBe(11)
  })
})
