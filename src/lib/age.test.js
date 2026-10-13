import { describe, expect, test } from 'vitest'
import { ageIn, liveAges } from './age.js'

describe('age', () => {
  const today = new Date('2026-10-13T12:00:00Z')

  test('in the latest season, his age today; earlier, at the same point of that season', () => {
    expect(Math.floor(ageIn('1995-02-19', '2025-26', '2025-26', today))).toBe(31)
    expect(ageIn('1995-02-19', '2025-26', '2025-26', today)).toBeCloseTo(31.65, 1)
    expect(ageIn('1995-02-19', '2020-21', '2025-26', today)).toBeCloseTo(26.65, 1)
  })

  test("a document's rows take their birth dates' ages, the rest keep the sheet's", () => {
    const doc = { season: '2024-25', seasons: ['2024-25', '2025-26'], players: [{ born: '1999-09-27', age: null }, { born: null, age: 30.2 }] }
    const out = liveAges(doc, today)
    expect(out.players[0].age).toBeCloseTo(26.04, 1)
    expect(out.players[1].age).toBe(30.2)
  })
})
