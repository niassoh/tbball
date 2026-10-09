import { describe, expect, it } from 'vitest'
import { dotRadius, dotTint, rankColor, rankLabel, rankPct, swarm } from './swarm.js'

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

  it('fits the domain to the middle of the data in steps of 5 and pins outliers to the edges', () => {
    const many = Array.from({ length: 101 }, (_, i) => -8 + i * 0.3) // -8 … +22
    const { lo, hi, x } = swarm([...many, -60, 90], { width: 200, height: 40, r: 2 })
    expect([lo, hi]).toEqual([-10, 25])
    expect(x(1000)).toBe(x(hi))
    expect(x(-1000)).toBe(x(lo))
  })

  it('stretches the domain to hold the marked value', () => {
    const { lo, hi } = swarm([0, 1, 2, 3], { width: 200, height: 40, include: [-12.4] })
    expect([lo, hi]).toEqual([-15, 5])
  })

  it('ticks every 5 over a narrow span and every 10 over a wide one', () => {
    expect(swarm([-4, 0, 9], { width: 200, height: 40 }).ticks).toEqual([-5, 0, 5, 10])
    expect(swarm([-12, 0, 33], { width: 200, height: 40 }).ticks).toEqual([-10, 0, 10, 20, 30])
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

describe('swarm paint', () => {
  it('fades from orange through grey to blue', () => {
    expect(dotTint(0)).toBe('rgb(176,120,72)')
    expect(dotTint(0.5)).toBe('rgb(110,104,98)')
    expect(dotTint(1)).toBe('rgb(110,140,190)')
  })

  it('shrinks dots for big pools, within limits', () => {
    expect(dotRadius(100)).toBe(1.5)
    expect(dotRadius(1200)).toBe(0.8)
    expect(dotRadius(300)).toBe(1.5)
    expect(dotRadius(600)).toBeCloseTo(1.06, 2)
  })
})
