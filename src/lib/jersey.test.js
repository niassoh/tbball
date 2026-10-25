import { describe, expect, test } from 'vitest'
import { frameOf, frameStyle, jerseyIn, jerseysOver, splitIds } from './jersey.js'

const layers = { v: 'abc', top: 0.58, ids: ['OKC', 'GSW', 'BKN'], current: 'HOU' }

describe('jersey', () => {
  test('a jersey is a sprite frame, or none when the base already wears it', () => {
    expect(frameOf(layers, 'GSW')).toBe(1)
    expect(frameOf(layers, 'HOU')).toBe(-1)
    expect(frameOf(layers, 'MIA')).toBe(-1)
    expect(frameOf(null, 'GSW')).toBe(-1)
    expect(frameOf(layers, null)).toBe(-1)
  })

  test('the overlay shows its frame of the sprite, from the band top down', () => {
    const s = frameStyle('u.webp', layers, 2)
    expect(s.top).toBe('58%')
    expect(s.backgroundSize).toBe('300% 100%')
    expect(s.backgroundPosition).toBe('100% 0')
    expect(frameStyle('u.webp', layers, 0).backgroundPosition).toBe('0% 0')
    expect(frameStyle('u.webp', { ...layers, ids: ['OKC'] }, 0).backgroundPosition).toBe('0% 0')
  })

  test('a traded season or a span splits between his jerseys, in the order he wore them', () => {
    const seasons = [
      { season: '2019-20', jersey: 'OKC' },
      { season: '2020-21', jersey: 'BKN', jerseys: ['OKC', 'BKN'] },
      { season: '2021-22', jersey: 'BKN' },
      { season: '2022-23', jersey: 'HOU' }
    ]
    expect(jerseysOver(seasons, '2020-21', '2020-21')).toEqual(['OKC', 'BKN'])
    expect(jerseysOver(seasons, '2019-20', '2022-23')).toEqual(['OKC', 'BKN', 'HOU'])
    expect(jerseysOver(seasons, '2021-22', '2021-22')).toEqual(['BKN'])
    // Split only between two or more he has (the base portrait wears HOU).
    expect(splitIds(layers, ['OKC', 'BKN', 'HOU'])).toEqual(['OKC', 'BKN', 'HOU'])
    expect(splitIds(layers, ['BKN'])).toBe(null)
    expect(splitIds(layers, ['OKC', 'MIA'])).toBe(null)
    expect(splitIds(null, ['OKC', 'BKN'])).toBe(null)
  })

  test("a season's team names his jersey only when he has just the one of it", () => {
    const eras = { v: 'abc', top: 0.58, ids: ['SEA.2001', 'DEN.2013', 'OKC'], current: 'DEN' }
    expect(jerseyIn(eras, 'SEA')).toBe('SEA.2001')
    expect(jerseyIn(eras, 'OKC')).toBe('OKC')
    expect(jerseyIn(eras, 'DEN')).toBe(null)
    expect(jerseyIn(eras, 'MIA')).toBe(null)
    expect(jerseyIn(null, 'SEA')).toBe(null)
  })
})
