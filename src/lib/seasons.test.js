import { describe, expect, test } from 'vitest'
import { seasonsBetween, shortSeason, spanId, spanText } from './seasons.js'

describe('seasons', () => {
  test('short seasons, every season between two, a span and its view', () => {
    expect(shortSeason('2013-14')).toBe('’14')
    expect(seasonsBetween('2018-19', '2021-22')).toEqual(['2018-19', '2019-20', '2020-21', '2021-22'])
    expect(seasonsBetween('2025-26', '2025-26')).toEqual(['2025-26'])
    expect(spanText('2025-26', '2025-26')).toBe('2025–26')
    expect(spanText('2018-19', '2020-21')).toBe('2018–19 → 2020–21')
    expect(spanId('2025-26', '2025-26')).toBe('2025-26')
    expect(spanId('2018-19', '2020-21')).toBe('2018-19..2020-21')
  })
})
