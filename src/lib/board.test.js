import { describe, expect, test } from 'vitest'
import { combined, combinedDelta, eachSeason, percentileOf, qualified } from './board.js'

// Two seasons' documents: BPM, and C&S 3% weighted by C&S 3s/36.
const labels = ['BPM', 'C&S 3%', 'C&S 3s/36']
const stats = { BPM: { dec: 1 }, 'C&S 3%': { dec: 1 }, 'C&S 3s/36': { dec: 1 } }
const P = (slug, mp, v, extra = {}) => ({ slug, name: slug.toUpperCase(), team: 'BOS', mp, gp: 10, v, p: v.map(() => 50), ...extra })
const doc = (season, players, type = 'regular') => ({ season, type, labels, stats, groups: [], players })
const s1 = doc('2023-24', [P('a', 1000, [2, 40, 1]), P('b', 2000, [0, 30, 4])])
const s2 = doc('2024-25', [P('a', 3000, [6, 30, 3]), P('c', 500, [-1, null, 0])])

describe('board', () => {
  test('percentiles count the share strictly worse, as the sheet does', () => {
    expect(percentileOf(3, [1, 2, 3, 4])).toBe(50)
    expect(percentileOf(1, [1, 2, 3, 4], true)).toBe(75)
    expect(percentileOf(null, [1, 2])).toBe(null)
  })

  test('each season: a row per player-season, ids telling them apart', () => {
    const b = eachSeason([s1, s2])
    expect(b.players.map(p => p.id)).toEqual(['a|2023-24', 'b|2023-24', 'a|2024-25', 'c|2024-25'])
    expect(b.many).toBe(true)
    expect(eachSeason([s2]).players.map(p => p.id)).toEqual(['a', 'c'])
  })

  test('combined: minutes-weighted, shooting by minutes times attempts, ranked among the combined', () => {
    const b = combined([s1, s2])
    const a = b.players.find(p => p.slug === 'a')
    // BPM by minutes: (2·1000 + 6·3000) / 4000.
    expect(a.v[0]).toBe(5)
    // C&S 3% by minutes × attempt rate: (40·1000·1 + 30·3000·3) / (1000 + 9000).
    expect(a.v[1]).toBe(31)
    expect(a.mp).toBe(4000)
    expect(a.gp).toBe(20)
    expect(a.seasons).toEqual(['2023-24', '2024-25'])
    // c took no catch-and-shoot threes: no C&S 3%.
    expect(b.players.find(p => p.slug === 'c').v[1]).toBe(null)
    // Ranked among the three combined players: a's BPM is the best.
    expect(a.p[0]).toBe(67)
  })

  test('combined delta: his playoffs against his regular seasons in the same seasons', () => {
    const po1 = doc('2023-24', [P('a', 200, [4, 50, 2])], 'playoffs')
    const po2 = doc('2024-25', [P('b', 100, [1, 20, 1])], 'playoffs')
    const d = combinedDelta([po1, po2], [s1, s2])
    expect(d.type).toBe('delta')
    // a made the playoffs in 2023-24 only: against his 2023-24 regular season (BPM 2).
    expect(d.players.find(p => p.slug === 'a').v[0]).toBe(2)
    // b's 2024-25 run, but he has no 2024-25 regular season: not compared.
    expect(d.players.find(p => p.slug === 'b')).toBe(undefined)
    expect(d.stats.BPM.relative).toBe(true)
  })

  test('qualifiers keep the top share of the minutes', () => {
    const rows = [100, 200, 300, 400].map(mp => ({ mp }))
    expect(qualified(rows, 1)).toHaveLength(4)
    expect(qualified(rows, 0.5).map(r => r.mp)).toEqual([300, 400])
    expect(qualified(rows, 0.25).map(r => r.mp)).toEqual([400])
  })
})
