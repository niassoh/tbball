import { describe, expect, test } from 'vitest'
import { along, median, pctlOf, quadrantOf, radiusOf, ranked, valueOf } from './leaderboard.js'

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

  test('dots grow by area with minutes; axes run better up and right', () => {
    expect(radiusOf(0, 3000)).toBe(3)
    expect(radiusOf(3000, 3000)).toBe(11)
    expect(radiusOf(750, 3000)).toBe(7)
    // From the fewest minutes in the pool, not from none.
    expect(radiusOf(800, 3000, 2, 11, 800)).toBe(2)
    expect(radiusOf(3000, 3000, 2, 11, 800)).toBe(11)
    expect(along(5, 0, 10, false)).toBe(0.5)
    expect(along(2, 0, 10, true)).toBe(0.8)
    expect(along(20, 0, 10, false)).toBe(1)
  })
})
