import { describe, expect, test } from 'vitest'
import { trophiesRisen } from './trophies.js'

const awards = { champion: ['2012-13'], fmvp: ['2012-13'], mvp: ['2012-13'], allnba1: ['2012-13', '2013-14'], alldef1: ['2012-13'], allstar: ['2012-13', '2013-14'] }

describe('trophies', () => {
  test('the case has risen once its last trophy has', () => {
    // Two trophies with room to spare: the second rises from 95ms, for 400ms.
    expect(trophiesRisen(awards, '2013-14', 1000)).toBe(495)
  })

  test('a crowded case counts its "+n" as the last to rise', () => {
    // Room for two at the smallest scale: two trophies, then "+4" from 150ms.
    expect(trophiesRisen(awards, '2012-13', 70)).toBe(550)
  })

  test('no case, no wait', () => {
    expect(trophiesRisen(awards, '2003-04', 1000)).toBe(0)
    expect(trophiesRisen(null, '2012-13', 1000)).toBe(0)
    expect(trophiesRisen(awards, '2012-13', 20)).toBe(0)
  })
})
