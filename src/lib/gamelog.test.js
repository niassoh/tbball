import { describe, expect, test } from 'vitest'
import { recentLine } from './gamelog.js'

describe('game-log summary', () => {
  test('per-game averages, with TS% as total points over total attempts', () => {
    // 30 points on 20 attempts and 10 points on 20 attempts: 40 / (2 * 40) = 50%.
    const l = recentLine([{ pts: 30, reb: 10, ast: 4, ts: 75, tsa: 20 }, { pts: 10, reb: 2, ast: 6, ts: 25, tsa: 20 }])
    expect(l).toEqual({ n: 2, pts: 20, reb: 6, ast: 5, ts: 50 })
  })

  test('attempts are recovered from points and TS% when the log lacks them', () => {
    const l = recentLine([{ pts: 30, reb: 0, ast: 0, ts: 75 }, { pts: 10, reb: 0, ast: 0, ts: 25 }])
    expect(l.ts).toBeCloseTo(50, 10)
  })

  test('a scoreless game without attempts still counts for the per-game averages', () => {
    const l = recentLine([{ pts: 20, reb: 4, ast: 2, ts: 50 }, { pts: 0, reb: 2, ast: 0, ts: null }])
    expect(l.pts).toBe(10)
    expect(l.ts).toBeCloseTo(50, 10)
    expect(recentLine([])).toBe(null)
  })
})
