import { describe, expect, test } from 'vitest'
import { depthTiers, franchiseOf, franchisePlayers, seasonRows, topSeasons } from './library.js'

const board = (season, players) => ({ season, labels: ['Load', 'BPM'], players: players.map(([slug, team, mp, bpm]) => ({ slug, team, mp, v: [1, bpm] })) })

describe('library', () => {
  test("a qualified season is 800+ minutes with a BPM, and a traded one no franchise's", () => {
    const rows = seasonRows([board('2007-08', [['durant', 'SEA', 2768, -1.6], ['bench', 'SEA', 799, 4], ['traded', '2 TM', 2000, 3], ['none', 'SEA', 900, null]])])
    expect(rows.map(r => r.slug)).toEqual(['durant', 'traded'])
    expect(rows[0]).toEqual({ slug: 'durant', season: '2007-08', team: 'SEA', bpm: -1.6 })
    expect(franchisePlayers(rows, 'OKC').map(r => r.slug)).toEqual(['durant'])
  })

  test("a franchise's players with a season in the league's top 5%, once each by his best there", () => {
    expect(franchiseOf('SEA')).toBe('OKC')
    expect(franchiseOf('CHH')).toBe('CHA')
    expect(franchiseOf('DEN')).toBe('DEN')
    const players = Array.from({ length: 38 }, (_, k) => [`p${k}`, 'OKC', 1000, k / 10])
    const rows = seasonRows([board('2007-08', [['durant', 'SEA', 2768, 9]]), board('2012-13', [['durant', 'OKC', 3119, 8], ...players, ['jokic', 'DEN', 2500, 7.9]]), board('2013-14', [['lebron', 'MIA', 3000, 10]])])
    // 42 seasons league-wide: the top 5% is 3 (LeBron's and both of Durant's), so the bar is 8.
    expect(topSeasons(rows, 'OKC').map(r => `${r.slug} ${r.season}`)).toEqual(['durant 2007-08'])
    expect(topSeasons(rows, 'OKC').map(r => r.set.map(t => t.season))).toEqual([['2007-08', '2012-13']])
    expect(topSeasons(rows, 'MIA')).toHaveLength(1)
    // Denver's best is under the league's bar, however good it is for Denver.
    expect(topSeasons(rows, 'DEN')).toEqual([])
    expect(topSeasons(rows, 'BOS')).toEqual([])
  })

  test("everyone with a franchise's qualified season, once by his best there, but the tiles' players", () => {
    const rows = seasonRows([
      board('2007-08', [['durant', 'SEA', 2768, 9], ['collison', 'SEA', 1800, 1.5], ['bench', 'SEA', 700, 6], ['traded', '2 TM', 2000, 5]]),
      board('2012-13', [['durant', 'OKC', 3119, 8], ['collison', 'OKC', 1500, 2], ['ibaka', 'OKC', 2500, 3], ['lebron', 'MIA', 3000, 10]])
    ])
    expect(franchisePlayers(rows, 'OKC').map(r => `${r.slug} ${r.season}`)).toEqual(['durant 2007-08', 'ibaka 2012-13', 'collison 2012-13'])
    expect(franchisePlayers(rows, 'OKC', new Set(['durant'])).map(r => r.slug)).toEqual(['ibaka', 'collison'])
  })

  test('a depth chart reads starters first, then the bench in depth order, each player once', () => {
    const depth = { rows: [
      { pos: 'PG', players: [{ slug: 'a' }, { slug: 'f' }, { slug: 'c' }] },
      { pos: 'SG', players: [{ slug: 'b' }, { slug: 'g' }] },
      { pos: 'SF', players: [{ slug: 'c' }, { slug: 'b' }, { slug: 'h' }] }
    ] }
    expect(depthTiers(depth).map(tier => tier.map(p => p.slug))).toEqual([['a', 'b', 'c'], ['f', 'g', 'h']])
    expect(depthTiers(null)).toEqual([[], []])
  })
})
