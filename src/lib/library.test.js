import { describe, expect, test } from 'vitest'
import { depthTiers, franchiseOf, seasonRows, topSeasons } from './library.js'

const board = (season, players) => ({ season, labels: ['Load', 'BPM'], players: players.map(([slug, team, mp, bpm]) => ({ slug, team, mp, v: [1, bpm] })) })

describe('library', () => {
  test("a qualified season is 800+ minutes with a BPM, and a traded one no franchise's", () => {
    const rows = seasonRows([board('2007-08', [['durant', 'SEA', 2768, -1.6], ['bench', 'SEA', 799, 4], ['traded', '2 TM', 2000, 3], ['none', 'SEA', 900, null]])])
    expect(rows.map(r => r.slug)).toEqual(['durant', 'traded'])
    expect(rows[0]).toEqual({ slug: 'durant', season: '2007-08', team: 'SEA', bpm: -1.6 })
    expect(topSeasons(rows, 'OKC').map(r => r.slug)).toEqual(['durant'])
  })

  test("a franchise's best players, once each by his best season there, as many as 5% of its seasons", () => {
    expect(franchiseOf('SEA')).toBe('OKC')
    expect(franchiseOf('CHH')).toBe('CHA')
    expect(franchiseOf('DEN')).toBe('DEN')
    const players = Array.from({ length: 38 }, (_, k) => [`p${k}`, 'OKC', 1000, k / 10])
    const rows = seasonRows([board('2007-08', [['durant', 'SEA', 2768, 9]]), board('2012-13', [['durant', 'OKC', 3119, 8], ...players]), board('2013-14', [['lebron', 'MIA', 3000, 10]])])
    // 40 OKC seasons: 2 tiles, Durant's best and the next player's, not his second season.
    expect(topSeasons(rows, 'OKC').map(r => `${r.slug} ${r.season}`)).toEqual(['durant 2007-08', 'p37 2012-13'])
    // Both of Durant's are in the top 2 seasons: his collection, by season; p37's isn't, so his is his best alone.
    expect(topSeasons(rows, 'OKC').map(r => r.set.map(t => t.season))).toEqual([['2007-08', '2012-13'], ['2012-13']])
    expect(topSeasons(rows, 'MIA')).toHaveLength(1)
    expect(topSeasons(rows, 'BOS')).toEqual([])
  })

  test('a depth chart reads starters first, then the bench in depth order, each player once', () => {
    const depth = { rows: [
      { pos: 'PG', players: [{ slug: 'a' }, { slug: 'f' }, { slug: 'c' }] },
      { pos: 'SG', players: [{ slug: 'b' }, { slug: 'g' }] },
      { pos: 'SF', players: [{ slug: 'c' }, { slug: 'b' }, { slug: 'h' }] }
    ] }
    expect(depthTiers(depth)).toEqual([['a', 'b', 'c'], ['f', 'g', 'h']])
    expect(depthTiers(null)).toEqual([[], []])
  })
})
