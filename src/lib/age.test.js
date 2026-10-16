import { describe, expect, test } from 'vitest'
import { ageIn, agesText, liveAges, seasonAges } from './age.js'

describe('age', () => {
  const today = new Date('2026-10-13T12:00:00Z')

  test("a season's age is his age on February 1 of it, whenever it's asked", () => {
    expect(ageIn('1995-02-19', '2025-26', today)).toBeCloseTo(30.95, 2)
    expect(ageIn('1995-02-19', '2020-21', today)).toBeCloseTo(25.95, 2)
    // A retired player's seasons don't run on from today: Jordan was 34 in 1997-98.
    expect(Math.floor(ageIn('1963-02-17', '1997-98', today))).toBe(34)
    expect(ageIn('1963-02-17', '1997-98', new Date('2030-01-01'))).toBe(ageIn('1963-02-17', '1997-98', today))
  })

  test("a season before its February 1 (the depth chart's) is his age today", () => {
    expect(ageIn('1995-02-19', '2026-27', today)).toBeCloseTo(31.65, 2)
  })

  test("a document's rows take their birth dates' ages, the rest keep the sheet's", () => {
    const doc = { season: '2024-25', seasons: ['2024-25', '2025-26'], players: [{ born: '1999-09-27', age: null }, { born: null, age: 30.2 }] }
    const out = liveAges(doc, today)
    expect(out.players[0].age).toBeCloseTo(25.35, 2)
    expect(out.players[1].age).toBe(30.2)
  })

  test('ages as the picker writes them, and a player\'s age in any season of his career', () => {
    expect(agesText(25, 25)).toBe('Age 25')
    expect(agesText(25, 28)).toBe('Ages 25–28')
    // By his birth date (LeBron: 25 on February 1, 2010), or counted on from the sheet's age.
    expect(seasonAges({ bio: { born: '1984-12-30' }, seasons: [] })('2009-10')).toBe(25)
    const sheet = seasonAges({ bio: {}, seasons: [{ season: '2020-21', age: 24.6 }] })
    expect([sheet('2020-21'), sheet('2023-24')]).toEqual([24, 27])
    expect(seasonAges({ bio: {}, seasons: [{ season: '2020-21', age: null }] })).toBe(null)
  })
})
