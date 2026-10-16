import { describe, expect, test } from 'vitest'
import { changeProfile } from './change.js'
import { spanMean } from './span.js'

const seasons = mps => mps.map((mp, i) => ({ label: `${2020 + i}–${21 + i}`, mp }))
const stat = (ps, extra = {}) => ({ available: true, dec: 1, relative: false, lowerBetter: false, vals: ps.map(p => (p === null ? null : { n: p / 10, p })), lg: ps.map(() => 0), ...extra })

describe('year-to-year percentile change', () => {
  test('each season is the percentile change from the season before', () => {
    const p = changeProfile({ seasons: seasons([2000, 2000, 2000]), stats: { BPM: stat([40, 55, 50]) } }, ['BPM'])
    expect(p.stats.BPM.vals.map(v => v && v.n)).toEqual([null, 15, -5])
    expect(p.stats.BPM.vals[1].detail).toBe('40 → 55 PCTL')
    expect(p.stats.BPM.lg).toEqual([null, 0, 0])
  })

  test('the colour percentile centres on no change and saturates at big moves', () => {
    const p = changeProfile({ seasons: seasons([1, 1, 1]), stats: { BPM: stat([10, 60, 0]) } }, ['BPM'])
    expect(p.stats.BPM.vals[1].p).toBe(100)
    expect(p.stats.BPM.vals[2].p).toBe(0)
  })

  test('a missing season breaks the chain on both sides', () => {
    const p = changeProfile({ seasons: seasons([1, 1, 1]), stats: { BPM: stat([40, null, 60]) } }, ['BPM'])
    expect(p.stats.BPM.vals).toEqual([null, null, null])
  })

  test('raw: the change in the stat\'s own terms, coloured by the percentile change', () => {
    const p = changeProfile({ seasons: seasons([1, 1]), stats: { BPM: stat([40, 55]) } }, ['BPM'], { raw: true })
    expect(p.stats.BPM.vals[1].n).toBeCloseTo(1.5)
    expect(p.stats.BPM.vals[1].p).toBe(80)
    expect(p.stats.BPM.vals[1].detail).toBe('4.0 → 5.5')
    expect(p.stats.BPM.dec).toBe(1)
  })

  test('a season without games of the type is passed over, not a break', () => {
    // Rondo's playoffs: 2011-12, none in 2012-13 to 2015-16, then 2016-17.
    const ss = [...seasons([1, 1, 1]).slice(0, 1), { label: 'x', mp: null, empty: true }, ...seasons([1, 1, 1]).slice(2)]
    const p = changeProfile({ seasons: ss, stats: { BPM: stat([40, null, 60]) } }, ['BPM'])
    expect(p.stats.BPM.vals.map(v => v && v.n)).toEqual([null, null, 20])
    expect(p.stats.BPM.lg).toEqual([null, null, 0])
  })

  test('span averages of a shooting change weight by minutes, not attempts', () => {
    const base = { seasons: seasons([1000, 1000, 3000]), stats: { 'Rim FG%': stat([50, 60, 50]), 'Rim FGA': stat([10, 90, 10]) } }
    const p = changeProfile(base, ['Rim FG%', 'Rim FGA'])
    // +10 over 1000 MP and -10 over 3000 MP.
    expect(spanMean(p, 'Rim FG%', 0, 2)).toBe(-5)
  })
})
