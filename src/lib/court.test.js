import { describe, expect, test } from 'vitest'
import { ZONES, contains, classify, isThree, P, BASKET, R3 } from './court.js'

const zonesAt = (x, y) => ZONES.filter(z => contains(z.rings, x, y)).map(z => z.id)

describe('court geometry', () => {
  test('the wedge divider ends exactly on the 3pt arc', () => {
    expect(Math.hypot(P.x - BASKET.x, P.y - BASKET.y)).toBeCloseTo(R3, 6)
  })

  test('every label sits inside its own zone and no other', () => {
    for (const z of ZONES) expect(zonesAt(z.lx, z.ly)).toEqual([z.id])
  })

  // Sample the court on a grid (offset so points don't land on boundaries).
  const grid = []
  for (let x = 3.37; x < 498; x += 6.1) for (let y = 3.29; y < 318; y += 6.1) grid.push([x, y])

  test('zones tile the court: each point is in exactly one zone', () => {
    const bad = grid.filter(([x, y]) => zonesAt(x, y).length !== 1)
    expect(bad.length / grid.length).toBeLessThan(0.002) // only arc-sampling slivers
  })

  test('the drawn zone matches the classifier for every point', () => {
    const mismatched = grid.filter(([x, y]) => {
      const drawn = zonesAt(x, y)
      return drawn.length === 1 && drawn[0] !== classify(x, y, isThree(x, y) ? 3 : 2)
    })
    expect(mismatched.length / grid.length).toBeLessThan(0.002)
  })

  test('3pt land straight below the arc is TOP 3, not long midrange', () => {
    expect(zonesAt(250, 300)).toEqual(['top3'])
    expect(classify(250, 300, 3)).toBe('top3')
  })

  test('the rim is not shaded by MID C, and paint halves do not overlap', () => {
    expect(zonesAt(250, 52)).toEqual(['rim'])
    expect(zonesAt(200, 150)).toEqual(['paint_l'])
    expect(zonesAt(300, 150)).toEqual(['paint_r'])
  })
})
