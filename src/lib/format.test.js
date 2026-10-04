import { describe, expect, test } from 'vitest'
import { col, heat, ord, fmt } from './format.js'
import { chartModel, seasonTick } from './chart.js'
import { BANDS, shotModel, zoneFill } from './shot.js'

describe('format', () => {
  test('percentile color endpoints', () => {
    expect(col(100)).toBe('rgb(89,126,193)')
    expect(col(0)).toBe('rgb(250,150,42)')
    expect(col(50)).toBe('rgb(122,117,112)')
  })
  test('heat caps alpha and boosts the current season', () => {
    expect(heat(100)).toBe('rgba(89,126,193,0.60)')
    expect(heat(100, 0.5)).toBe('rgba(89,126,193,0.85)')
    expect(heat(0)).toBe('rgba(250,150,42,0.60)')
  })
  test('ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 99].map(ord)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '99th'])
  })
  test('fmt signs relative stats and uses a typographic minus', () => {
    expect(fmt({ dec: 1, relative: true }, 2.34)).toBe('+2.3')
    expect(fmt({ dec: 1, relative: true }, -2.34)).toBe('−2.3')
    expect(fmt({ dec: 0, relative: false }, 119.4)).toBe('119')
    expect(fmt({ dec: 1 }, null)).toBe('—')
  })
})

const seasons = n => Array.from({ length: n }, (_, i) => ({ label: `${2010 + i}–${String(11 + i).padStart(2, '0')}` }))
const stat = (vals, lg, extra = {}) => ({ dec: 1, relative: false, lowerBetter: false, vals: vals.map(n => (n === null ? null : { n, p: 60 })), lg, ...extra })

describe('chart', () => {
  test('bands are blue when the player beats the league and flip for lower-is-better', () => {
    const higher = chartModel(stat([5, 6], [4, 4]), seasons(2))
    expect(higher.bands[0].fill).toBe('rgba(89,126,193,.12)')
    const lower = chartModel(stat([5, 6], [4, 4], { lowerBetter: true }), seasons(2))
    expect(lower.bands[0].fill).toBe('rgba(250,150,42,.12)')
  })
  test('value labels thin out beyond 6 seasons', () => {
    const m = chartModel(stat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], Array(10).fill(5)), seasons(10))
    expect(m.pts.filter(p => p.showValue).map(p => p.i)).toEqual([0, 5, 9])
  })
  test("season ticks switch to 'YY style past 9 seasons and hide alternates past 13", () => {
    expect(seasonTick('2015–16', 9)).toBe('15–16')
    expect(seasonTick('2015–16', 10)).toBe("'16")
    const m = chartModel(stat(Array(15).fill(1), Array(15).fill(1)), seasons(15))
    expect(m.pts.filter(p => p.hideSeason).length).toBe(7)
  })
  test('missing seasons split the player line and drop their bands', () => {
    const m = chartModel(stat([null, null, 3, 4], [2, 2, 2, 2]), seasons(4))
    expect(m.playerLines.length).toBe(1)
    expect(m.bands.length).toBe(1)
  })
  test('relative stats hide league labels', () => {
    const m = chartModel(stat([1, 2], [0, 0], { relative: true }), seasons(2))
    expect(m.legend).toBe('LG AVG = 0')
    expect(m.pts.every(p => !p.showLg)).toBe(true)
  })
})

describe('shot map', () => {
  const zones = Object.fromEntries(BANDS.map(({ id }) => [id, { rest: { fga: 10, fgm: 5 }, recent: { fga: 10, fgm: 5 } }]))
  const league = Object.fromEntries(BANDS.map(({ id }) => [id, { fga: 100, fgm: 40 }]))
  const band = (shift, mode, id) => shotModel({ zones: shift, league }, mode).find(z => z.id === id)
  test('the map shows four distance bands', () => {
    expect(shotModel({ zones, league }, 'freq').map(z => z.name)).toEqual(['RIM', 'SHORT MID', 'LONG MID', '3PT'])
  })
  test('no change is neutral in every mode', () => {
    for (const mode of ['value', 'freq', 'fg']) expect(shotModel({ zones, league }, mode).every(z => z.small)).toBe(true)
  })
  test('a hotter rim is a positive FG% and value delta', () => {
    const hot = { ...zones, rim: { rest: { fga: 10, fgm: 5 }, recent: { fga: 10, fgm: 8 } } }
    expect(band(hot, 'fg', 'rim').label).toBe('+30.0')
    expect(band(hot, 'value', 'rim').delta).toBeGreaterThan(0)
  })
  test('more 3s at below-league shooting is a negative value delta', () => {
    const shift = { ...zones, three: { rest: { fga: 10, fgm: 3 }, recent: { fga: 30, fgm: 9 } } }
    expect(band(shift, 'freq', 'three').delta).toBeGreaterThan(0)
    expect(band(shift, 'fg', 'three').small).toBe(true)
    expect(band(shift, 'value', 'three').delta).toBeLessThan(0)
  })
  test('value is points above league per 100 FGA', () => {
    // 4 bands x 10 FGA; rim vs league 40% at 2 pts: 2 * (8 - 4) / 40 * 100 = 20, before 2 * (5 - 4) / 40 * 100 = 5
    const hot = { ...zones, rim: { rest: { fga: 10, fgm: 5 }, recent: { fga: 10, fgm: 8 } } }
    expect(band(hot, 'value', 'rim').label).toBe('+15.0')
  })
  test('small changes match the court background; the extremes are muted green and near-black', () => {
    expect(zoneFill(0.3, 'value')).toBe('rgb(39,37,36)')
    expect(zoneFill(0.5, 'freq')).toBe('rgb(39,37,36)')
    expect(zoneFill(10, 'fg')).toBe('rgb(84,98,79)')
    expect(zoneFill(-10, 'fg')).toBe('rgb(19,18,17)')
  })
  test('the largest change on the map gets the deepest color', () => {
    const cold = { rest: { fga: 10, fgm: 6 }, recent: { fga: 10, fgm: 2 } }
    const cool = { rest: { fga: 10, fgm: 6 }, recent: { fga: 10, fgm: 4 } }
    const m = shotModel({ zones: { ...zones, rim: cold, short_mid: cool }, league }, 'fg')
    const brightness = id => m.find(z => z.id === id).fill.match(/\d+/g).map(Number).reduce((a, b) => a + b)
    expect(m.find(z => z.id === 'rim').fill).toBe('rgb(19,18,17)')
    expect(brightness('short_mid')).toBeGreaterThan(brightness('rim'))
  })
})
