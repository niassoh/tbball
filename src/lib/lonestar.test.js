import { describe, expect, test } from 'vitest'
import { STATS, change, namesText, posOf, seasonRanges, seasonTag, starsText, toneOf, tourExample, unpackLonestar, value } from './lonestar.js'

const stat = key => STATS.find(s => s.key === key)

describe('lonestar', () => {
  test('values and changes, percentages as percent', () => {
    expect(value(stat('pts75'), 26.44)).toBe('26.4')
    expect(value(stat('rts'), -0.016)).toBe('-1.6')
    expect(value(stat('pct3'), null)).toBe('—')
    expect(change(stat('rts'), 0.0213)).toBe('+2.1')
    expect(change(stat('load'), -3.04)).toBe('−3.0')
    expect(change(stat('net'), 0.01)).toBe('0.0')
  })

  test('a rise is a lift, a cost, or neither for a volume stat', () => {
    expect(toneOf(stat('rts'), 0.02)).toBe('good')
    expect(toneOf(stat('ctov'), 0.02)).toBe('bad')
    expect(toneOf(stat('ctov'), -0.01)).toBe('good')
    // A volume stat: blue for more, orange for less.
    expect(toneOf(stat('load'), 5)).toBe('good')
    expect(toneOf(stat('load'), -2)).toBe('bad')
    expect(toneOf(stat('load'), 0)).toBe('neutral')
    // A change that shows as 0.0 is neither.
    expect(toneOf(stat('pa3_75'), -0.03)).toBe('neutral')
    expect(toneOf(stat('rts'), 0.0004)).toBe('neutral')
    expect(toneOf(stat('net'), null)).toBe('neutral')
  })

  test("a value's place on its stat's league range is linear and clamped", () => {
    const scale = [10, 20, 60]
    expect(posOf(scale, 35)).toBe(0.5)
    expect(posOf(scale, 0)).toBe(0)
    expect(posOf(scale, 99)).toBe(1)
    expect(posOf(scale, null)).toBe(null)
    expect(posOf(null, 30)).toBe(null)
  })

  test('stars and seasons as words', () => {
    expect(starsText([{ name: 'Jamal Murray' }, { name: 'Jonas Valančiūnas' }])).toBe('Murray & Valančiūnas')
    expect(starsText([{ name: null }])).toBe('?')
    expect(namesText([{ name: 'Jalen Williams' }, { name: 'Ajay Mitchell' }])).toBe('Jalen Williams & Ajay Mitchell')
    expect(namesText([{ name: null }])).toBe('?')
    expect(seasonTag(['2025-26'])).toBe('25–26')
    expect(seasonTag(['2018-19', '2019-20', '2020-21'])).toBe('’19–’21')
    // With a gap, in runs: Curry for Green, without his lost 2019-20.
    expect(seasonRanges(['2017-18', '2018-19', '2020-21', '2021-22'])).toBe('’18–’19, ’21–’22')
    expect(seasonRanges(['2018-19', '2020-21'])).toBe('18–19, 20–21')
  })

  test('a packed document reads back as objects per stat, its change taken here', () => {
    const doc = unpackLonestar({
      fields: ['minutes', 'load', 'pct3'],
      views: [{ id: '2025-26', scenarios: [{ kind: 'one', on: [900, 25.4, null], off: [400, 31.1, 0.36], pctl: [[60, 40, null], [20, 70, 55]], ranks: { rank: [12, 3, null], of: [395, 395, null] } }] }]
    })
    const s = doc.views[0].scenarios[0]
    expect(s.on).toEqual({ minutes: 900, load: 25.4, pct3: null })
    expect(s.change.load).toBeCloseTo(5.7, 6)
    expect(s.change.pct3).toBe(null)
    expect(s.pctl.off).toEqual({ minutes: 20, load: 70, pct3: 55 })
    expect(s.ranks).toEqual({ minutes: { rank: 12, of: 395 }, load: { rank: 3, of: 395 } })
    expect(s.kind).toBe('one')
  })

  test("the tour's row: the stat his change ranks nearest either end in, else Load", () => {
    const s = {
      on: { load: 53.9, pts75: 27.4, ctov: 0.0767 },
      off: { load: 59.6, pts75: 30.8, ctov: 0.0969 },
      change: { load: 5.7, pts75: 3.4, ctov: 0.0202 },
      ranks: { load: { rank: 274, of: 723 }, pts75: { rank: 216, of: 723 }, ctov: { rank: 690, of: 723 } }
    }
    expect(tourExample(s, 'Murray', 'Jokić')).toEqual({
      key: 'ctov',
      title: 'cTOV%',
      text: "cTOV% is **how often his chances to score or pass end in a turnover**. Lower is better. The vectors start with the values **with** Jokić's best teammates (the square) and point to Jokić's stats **without** his best teammates.",
      math: [['W/O', '9.7'], '−', ['WITH', '7.7'], '=', '**bad:+2.0**'],
      example: 'Without Murray, his cTOV% rises by 2.0 points, which is worse.'
    })
    const load = tourExample({ ...s, ranks: null }, 'Murray', 'Jokić')
    expect([load.key, load.example]).toEqual(['load', 'Without Murray, his Load rises by 5.7.'])
    // A volume stat says no way is better, only how its vector reads.
    expect(load.text).toBe("Load is **how much of the offense runs through him, in possessions used or created per 100**. The vectors start with the values **with** Jokić's best teammates (the square) and point to Jokić's stats **without** his best teammates.")
  })
})
