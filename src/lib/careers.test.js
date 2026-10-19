import { describe, expect, it } from 'vitest'
import { TIME, careersOf, column, envelope, peakOf } from './careers.js'

const STATS = { BPM: { dec: 1 }, 'C&S 3%': { dec: 1 }, 'C&S 3s/36': { dec: 1 }, '1yr C&S 3%': { dec: 1 } }
const LABELS = ['BPM', 'C&S 3%', 'C&S 3s/36', '1yr C&S 3%']
const doc = (season, players, labels = LABELS) => ({
  season, type: 'regular', labels, groups: [], stats: STATS,
  players: players.map(([slug, born, mp, v, p]) => ({ slug, name: slug.toUpperCase(), team: 'BOS', born, mp, age: 13.2, v, p }))
})

describe('careersOf', () => {
  const docs = [
    doc('2002-03', [['old', '1975-06-23', 2000, [1, 30, 2, 40], [60, 50, 50, 70]], ['kid', '1984-12-30', 1000, [0, null, null, null], [50, null, null, null]]]),
    doc('2001-02', [['old', '1975-06-23', 2000, [2, 30, 2, 40], [70, 50, 50, 70]]], ['BPM', 'C&S 3%']),
    doc('2004-05', [['kid', '1984-12-30', 1500, [4, 35, 3, 36], [90, 50, 60, 55]]])
  ]
  const s = careersOf(docs)
  const old = s.bySlug.get('old')
  const kid = s.bySlug.get('kid')

  it('merges the boards in season order, a player once', () => {
    expect(s.seasons).toEqual(['2001-02', '2002-03', '2004-05'])
    expect(s.players.map(p => p.slug)).toEqual(['old', 'kid'])
    expect(old.rows.map(r => r.year)).toEqual([2002, 2003])
  })

  it('takes ages from the birth date, not the board', () => {
    expect(old.rows.map(r => r.age)).toEqual([26, 27])
    expect(kid.rows.map(r => r.age)).toEqual([18, 20])
  })

  it('counts years of career with gaps, unknown for a career begun before the first board', () => {
    expect(kid.rows.map(r => r.cy)).toEqual([1, 3])
    expect(old.censored).toBe(true)
    expect(old.rows.map(r => r.cy)).toEqual([null, null])
  })

  it('reads an older board by label name and uses single seasons', () => {
    expect(old.rows[0].v).toEqual([2, 30, null, null])
    // 1yr C&S 3% stands in for C&S 3%.
    expect(old.rows[1].v[1]).toBe(40)
    expect(s.stats['C&S 3s/36'].since).toBe('2002-03')
    expect(s.stats.BPM.since).toBe('2001-02')
  })

  it('drops a career’s ages when one is implausible or the birth date is missing', () => {
    const t = careersOf([doc('2001-02', [['x', '1950-01-01', 900, [0], [50]], ['y', null, 900, [0], [50]]], ['BPM'])])
    expect(t.players.map(p => p.rows[0].age)).toEqual([null, null])
  })

  it('places rows on time axes', () => {
    const r = kid.rows[1]
    expect([TIME.season(r), TIME.age(r), TIME.career(r)]).toEqual([2005, 20, 3])
  })

  it('ages a season in progress as if it were done', () => {
    const t = careersOf([doc('2030-31', [['z', '2010-03-01', 900, [0], [50]]], ['BPM'])])
    expect(t.players[0].rows[0].age).toBe(20)
  })
})

describe('column', () => {
  const s = careersOf([
    doc('2010-11', [['a', null, 1000, [1, 30, 2, 30], [10, 10, 10, 10]]]),
    doc('2011-12', [['a', null, 3000, [3, null, null, null], [50, null, null, null]]]),
    doc('2012-13', [['a', null, 1000, [5, 40, 6, 40], [90, 90, 90, 90]]]),
    doc('2014-15', [['a', null, 1000, [9, 20, 2, 20], [99, 5, 5, 5]]])
  ])

  it('reads single seasons as they are', () => {
    expect(column(s, 'BPM')[0]).toEqual({ v: [1, 3, 5, 9], p: [10, 50, 90, 99] })
  })

  it('smooths over a year either side, by minutes', () => {
    const { v, p } = column(s, 'BPM', 3)[0]
    expect(v[1]).toBeCloseTo((1 * 1000 + 3 * 3000 + 5 * 1000) / 5000)
    expect(p[1]).toBe(50)
    // 2014-15's neighbours are two years off and one away (none): itself.
    expect(v[3]).toBe(9)
  })

  it('weights a shooting stat by attempts and leaves a season without it empty', () => {
    const { v } = column(s, 'C&S 3%', 3)[0]
    expect(v[0]).toBeCloseTo(30)
    expect(v[1]).toBeNull()
    expect(v[2]).toBeCloseTo(40)
    const t = column(s, 'C&S 3%', 3)[0]
    expect(t.v[2]).toBe(40)
  })

  it('gives nothing for a stat the store lacks', () => {
    expect(column(s, 'Nope')[0].v).toEqual([null, null, null, null])
  })
})

describe('envelope', () => {
  it('spreads each x, dropping thin ones', () => {
    const pts = [...Array.from({ length: 11 }, (_, i) => [25, i * 10]), [26, 5], [24, 1], [24, 3]]
    expect(envelope(pts, 2)).toEqual([{ x: 24, n: 2, lo: 1.2, mid: 2, hi: 2.8 }, { x: 25, n: 11, lo: 10, mid: 50, hi: 90 }])
  })
})

describe('peakOf', () => {
  const s = careersOf([
    doc('2010-11', [['a', null, 1000, [1], [80]]], ['BPM']),
    doc('2011-12', [['a', null, 2000, [2], [95]]], ['BPM']),
    doc('2012-13', [['a', null, 2500, [3], [95]]], ['BPM']),
    doc('2013-14', [['a', null, 2000, [null], [null]]], ['BPM']),
    doc('2015-16', [['a', null, 1000, [0], [40]]], ['BPM'])
  ])
  const a = s.players[0]

  it('finds the peak, more minutes breaking a tie', () => {
    expect(peakOf(s, a, 'BPM').peak).toBe(2)
  })

  it('finds the best run of three seasons with the stat, by minutes', () => {
    const { run } = peakOf(s, a, 'BPM')
    expect([run.from, run.to]).toEqual([0, 2])
    expect(run.p).toBe(Math.round((80 * 1000 + 95 * 2000 + 95 * 2500) / 5500))
    expect(run.v).toBeCloseTo((1000 + 4000 + 7500) / 5500)
  })

  it('marks 90th-percentile seasons and has no run under three seasons', () => {
    expect(peakOf(s, a, 'BPM').elite).toEqual([false, true, true, null, false])
    const t = careersOf([doc('2010-11', [['b', null, 900, [1], [50]]], ['BPM'])])
    expect(peakOf(t, t.players[0], 'BPM').run).toBeNull()
  })
})
