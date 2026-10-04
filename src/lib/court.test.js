import { describe, expect, test } from 'vitest'
import { BANDS, BASKET, RIM_R, SHORT_MID_R, classify, isThree } from './court.js'

describe('court bands', () => {
  test('band edges match thinking-bball lib/zones.js (6 ft and 14 ft)', () => {
    expect(RIM_R).toBe(60)
    expect(SHORT_MID_R).toBe(140)
  })

  test('each band label sits inside its own band', () => {
    for (const b of BANDS) expect(classify(b.lx, b.ly, isThree(b.lx, b.ly) ? 3 : 2)).toBe(b.id)
  })

  test('bands follow distance from the basket', () => {
    expect(classify(BASKET.x, BASKET.y + 59, 2)).toBe('rim')
    expect(classify(BASKET.x + 100, BASKET.y + 50, 2)).toBe('short_mid') // 11.2 ft
    expect(classify(BASKET.x - 150, BASKET.y + 60, 2)).toBe('long_mid') // 16.2 ft
    expect(classify(20, 40, 3)).toBe('three')
  })

  test('the corners and beyond the arc are threes', () => {
    expect(isThree(15, 60)).toBe(true)
    expect(isThree(250, 300)).toBe(true)
    expect(isThree(250, 280)).toBe(false)
  })
})
