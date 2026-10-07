import { describe, expect, it } from 'vitest'
import { rankColor, rankLabel, rankPct, swarm } from './swarm.js'

describe('swarm', () => {
  const values = [-30, -4, -1, 0, 0, 0, 1, 2, 3, 12, 40]

  it('places every value, inside the box', () => {
    const { dots } = swarm(values, { width: 200, height: 40 })
    expect(dots).toHaveLength(values.length)
    for (const d of dots) {
      expect(d.x).toBeGreaterThanOrEqual(0)
      expect(d.x).toBeLessThanOrEqual(200)
      expect(d.y).toBeGreaterThanOrEqual(0)
      expect(d.y).toBeLessThanOrEqual(40)
    }
  })

  it('uses a symmetric domain in steps of 5 and pins outliers to the edges', () => {
    const { lo, hi, x } = swarm(values, { width: 200, height: 40, r: 2 })
    expect(lo).toBe(-hi)
    expect(hi % 5).toBe(0)
    expect(x(1000)).toBe(x(hi))
    expect(x(0)).toBeCloseTo(100)
  })

  it('reads a net back from an x position (the hover readout)', () => {
    const { x, value, lo, hi } = swarm(values, { width: 200, height: 40, r: 2 })
    for (const v of [-7.5, 0, 3.2, 12]) expect(value(x(v))).toBeCloseTo(v)
    expect(value(-50)).toBe(lo)
    expect(value(500)).toBe(hi)
  })

  it('stacks equal values out from the middle', () => {
    const { dots } = swarm([0, 0, 0], { width: 100, height: 40, r: 2 })
    expect(dots.map(d => d.y).sort((a, b) => a - b)).toEqual([15.7, 20, 24.3])
  })

  it('squeezes a crowded column to fit the height', () => {
    const { dots } = swarm(Array(200).fill(0), { width: 100, height: 20, r: 1.5 })
    for (const d of dots) {
      expect(d.y).toBeGreaterThanOrEqual(1.5 - 1e-9)
      expect(d.y).toBeLessThanOrEqual(18.5 + 1e-9)
    }
  })
})

describe('rank', () => {
  it('labels from the nearer end', () => {
    expect(rankLabel(1, 953)).toBe('TOP 1%')
    expect(rankLabel(17, 953)).toBe('TOP 2%')
    expect(rankLabel(900, 953)).toBe('BOTTOM 6%')
    expect(rankLabel(953, 953)).toBe('BOTTOM 1%')
  })

  it('colours blue for the better half and orange for the worse', () => {
    expect(rankPct(1, 79)).toBe(1)
    expect(rankPct(79, 79)).toBe(0)
    expect(rankColor(rankPct(1, 79))).toBe('#8fb0e6')
    expect(rankColor(rankPct(30, 79))).toBe('#6e8bbd')
    expect(rankColor(rankPct(60, 79))).toBe('#c98a4b')
    expect(rankColor(rankPct(79, 79))).toBe('#fa962a')
  })
})
