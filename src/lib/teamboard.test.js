import { describe, expect, it } from 'vitest'
import { frameOf, netLines, placeOf, tiedOf } from './teamboard.js'

describe('team board chart', () => {
  it('frames every team on one scale, centred on the league', () => {
    const f = frameOf([118.9, 108.1], [107, 121], 116, 1)
    // DRTG 107 is the farthest from 116 (9 points), plus 1.
    expect(f).toEqual({ x: [106, 126], y: [106, 126] })
  })

  it('draws net-rating lines where they cross the frame', () => {
    const lines = netLines({ x: [110, 122], y: [110, 122] }, 5)
    expect(lines.map(l => l[0])).toEqual([-10, -5, 0, 5, 10])
    // Net 0 runs corner to corner; +10 only across the frame's high-ORTG, low-DRTG corner.
    expect(lines[2]).toEqual([0, [110, 110], [122, 122]])
    expect(lines[4]).toEqual([10, [120, 110], [122, 112]])
  })

  it('places a team among the rest, a lower-is-better stat by its lowest', () => {
    const doc = { labels: ['ORTG', 'DRTG'], stats: { ORTG: {}, DRTG: { lowerBetter: true } }, teams: [{ v: [118, 107] }, { v: [117, 110] }, { v: [null, 112] }] }
    expect(placeOf(doc, doc.teams[1], 'ORTG')).toBe(2)
    expect(placeOf(doc, doc.teams[0], 'DRTG')).toBe(1)
    expect(placeOf(doc, doc.teams[2], 'ORTG')).toBe(null)
  })

  it('shares a place when two teams tie, and says so', () => {
    const doc = { labels: ['W'], stats: { W: {} }, teams: [{ v: [64] }, { v: [55] }, { v: [55] }, { v: [40] }] }
    expect(doc.teams.map(t => placeOf(doc, t, 'W'))).toEqual([1, 2, 2, 4])
    expect(doc.teams.map(t => tiedOf(doc, t, 'W'))).toEqual([false, true, true, false])
  })
})
