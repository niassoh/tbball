import { describe, expect, it } from 'vitest'
import { boardOver, frameOf, netLines, placeOf, tiedOf } from './teamboard.js'

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

describe('team board over seasons', () => {
  const doc = (season, rows, extra = []) => ({
    season,
    labels: ['Wins', 'Losses', 'ORTG', 'DRTG', ...extra],
    stats: { Wins: {}, Losses: {}, ORTG: {}, DRTG: { lowerBetter: true }, ...Object.fromEntries(extra.map(l => [l, {}])) },
    groups: [{ id: 'overview', stats: ['Wins', 'Losses', 'ORTG', 'DRTG'] }, ...(extra.length ? [{ id: 'last-month', stats: extra }] : [])],
    league: { ORTG: 110, DRTG: 110 },
    teams: rows.map(([team, w, l, o, d, ...x]) => ({ team, name: team, v: [w, l, o, d, ...x], p: [50, 50, 50, 50, ...x.map(() => 50)] }))
  })
  const a = doc('2014-15', [['GSW', 60, 20, 112, 102], ['NYK', 20, 60, 100, null]])
  const b = doc('2015-16', [['GSW', 70, 10, 116, 104], ['NYK', 30, 50, 102, 108]])
  const c = doc('2016-17', [['GSW', 2, 0, 130, 100], ['NYK', 0, 2, 90, 120]], ['ORTG last month'])

  it('leaves one season as it is, each team its own id', () => {
    expect(boardOver([a]).teams.map(t => t.id)).toEqual(['GSW', 'NYK'])
  })

  it('combines a team over a span: record summed, ratings weighted by games, a gap left out', () => {
    const board = boardOver([a, b])
    const gsw = board.teams.find(t => t.team === 'GSW')
    expect(gsw.v.slice(0, 3)).toEqual([130, 30, 114])
    // NYK's 2014-15 DRTG is missing: 2015-16's alone.
    expect(board.teams.find(t => t.team === 'NYK').v[3]).toBe(108)
    // Percentiles again among the rows: GSW's ORTG beats NYK's, its DRTG (lower) too.
    expect(gsw.p.slice(2)).toEqual([50, 50])
    expect(board.teams.find(t => t.team === 'NYK').p[2]).toBe(0)
  })

  it('weights a season just begun by its few games', () => {
    const gsw = boardOver([b, c]).teams.find(t => t.team === 'GSW')
    expect(gsw.v[2]).toBeCloseTo((116 * 80 + 130 * 2) / 82)
  })

  it('drops the latest season\'s last-month stats over many seasons', () => {
    const board = boardOver([b, c])
    expect(board.labels).not.toContain('ORTG last month')
    expect(board.groups.map(g => g.id)).toEqual(['overview'])
  })

  it('gives a row per team-season, as its season ranked it', () => {
    const board = boardOver([a, b], { each: true })
    expect(board.teams.map(t => t.id)).toEqual(['GSW|2014-15', 'NYK|2014-15', 'GSW|2015-16', 'NYK|2015-16'])
    expect(board.teams[2]).toMatchObject({ season: '2015-16', span: '’16', p: [50, 50, 50, 50] })
  })

  it('makes every team\'s runs of n seasons in a row', () => {
    // Runs whatever the span's rows were set to.
    const board = boardOver([a, b, c], { run: 2, each: true })
    expect(board.teams.map(t => t.id)).toEqual(['GSW|2014-15..2015-16', 'NYK|2014-15..2015-16', 'GSW|2015-16..2016-17', 'NYK|2015-16..2016-17'])
    expect(board.teams[0]).toMatchObject({ season: '2015-16', span: '2015–16' })
    expect(board.teams[0].v[0]).toBe(130)
  })
})
