import { describe, expect, test } from 'vitest'
import { spanMean, spanLabel, spanTeams } from './span.js'

const seasons = (mps, tms = []) => mps.map((mp, i) => ({ label: `${2016 + i}–${String(17 + i).padStart(2, '0')}`, mp, tm: tms[i] || 'BOS' }))
const stat = vals => ({ vals: vals.map(n => (n === null ? null : { n, p: 50 })) })

describe('span averages', () => {
  test('most stats are weighted by minutes', () => {
    const p = { seasons: seasons([1000, 3000]), stats: { BPM: stat([2, 6]) } }
    expect(spanMean(p, 'BPM', 0, 1)).toBe(5)
  })

  test('shooting percentages are weighted by attempts, not minutes', () => {
    // Same minutes, but 1 rim attempt per 36 the first season and 9 the second.
    const p = { seasons: seasons([2000, 2000]), stats: { 'Rim FG%': stat([50, 70]), 'Rim FGA': stat([1, 9]) } }
    expect(spanMean(p, 'Rim FG%', 0, 1)).toBe(68)
  })

  test('only seasons inside the span count', () => {
    const p = { seasons: seasons([1000, 1000, 1000]), stats: { BPM: stat([1, 2, 9]) } }
    expect(spanMean(p, 'BPM', 0, 1)).toBe(1.5)
  })

  test('seasons without a value, or a shooting season without attempts, are left out', () => {
    const p = { seasons: seasons([1000, 1000, 1000]), stats: { BPM: stat([2, null, 4]), 'FT%': stat([80, 90, 70]), FTA: stat([5, null, 5]) } }
    expect(spanMean(p, 'BPM', 0, 2)).toBe(3)
    expect(spanMean(p, 'FT%', 0, 2)).toBe(75)
  })

  test('no usable season gives null', () => {
    const p = { seasons: seasons([1000, 1000]), stats: { BPM: stat([null, null]) } }
    expect(spanMean(p, 'BPM', 0, 1)).toBe(null)
  })

  test('label and teams', () => {
    const s = seasons([1, 1, 1], ['BOS', 'BOS', 'PHI'])
    expect(spanLabel(s, 0, 2)).toBe('2016–19')
    expect(spanTeams(s, 0, 1)).toBe('BOS')
    expect(spanTeams(s, 0, 2)).toBe('2 TM')
  })
})
