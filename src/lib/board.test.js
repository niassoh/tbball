import { describe, expect, test } from 'vitest'
import { bestEras, combined, combinedDelta, eachSeason, eras, percentileOf, qualified, singleYear, withPlayer } from './board.js'

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

  test('withPlayer: age and height as a Player group, with their own percentiles', () => {
    const d = withPlayer(doc('2024-25', [P('a', 1000, [1, 30, 2], { age: 24.5, ht: 80 }), P('b', 900, [0, 30, 2], { age: 31, ht: null })]))
    expect(d.labels.slice(-2)).toEqual(['Age', 'Height'])
    expect(d.groups.at(-1)).toEqual({ id: 'player', name: 'Player', stats: ['Age', 'Height'] })
    expect(d.players[0].v.slice(-2)).toEqual([24.5, 80])
    expect(d.players[1].v.slice(-1)).toEqual([null])
    expect(d.players[1].p.at(-2)).toBe(50)
    expect(d.stats.Height.feet).toBe(true)
    // Once only.
    expect(withPlayer(d).labels.length).toBe(d.labels.length)
  })

  test('each season: a row per player-season, ids telling them apart', () => {
    const b = eachSeason([s1, s2])
    expect(b.players.map(p => p.id)).toEqual(['a|2023-24', 'b|2023-24', 'a|2024-25', 'c|2024-25'])
    expect(b.many).toBe(true)
    expect(eachSeason([s2]).players.map(p => p.id)).toEqual(['a', 'c'])
  })

  test('eras: a row for each run of n of a player\'s seasons, averaged as combined, ranked among them all', () => {
    const s3 = doc('2025-26', [P('a', 2000, [4, 20, 2])])
    const b = eras([s1, s2, s3], 2)
    expect(b.players.map(p => p.id)).toEqual(['a|2023-24..2024-25', 'a|2024-25..2025-26'])
    const [first, second] = b.players
    expect(first.era).toEqual(['2023-24', '2024-25'])
    expect(first.season).toBe('2024-25')
    // The first run is the combined span's: BPM (2·1000 + 6·3000) / 4000.
    expect(first.v[0]).toBe(5)
    // The second: (6·3000 + 4·2000) / 5000.
    expect(second.v[0]).toBe(5.2)
    expect(second.p[0]).toBe(50)
    expect(b.eras).toBe(2)
    expect(eras([s1, s2, s3], 4).players).toEqual([])
    // The chart's one dot for him: his era with the best BPM and C&S 3% percentiles.
    const best = bestEras(b, 'BPM', 'C&S 3%')
    expect(best.players.map(p => p.id)).toEqual([second.p[1] + second.p[0] > first.p[1] + first.p[0] ? second.id : first.id])
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

  test('single year: a window stat takes its season-alone column, values and percentiles', () => {
    const d = {
      season: '2023-24',
      labels: ['BPM', 'C&S 3%', 'Def FGA Diff%', '1yr C&S 3%'],
      stats: { BPM: { years: null }, 'C&S 3%': { years: 3 }, 'Def FGA Diff%': { years: 2 }, '1yr C&S 3%': { years: null, hidden: true } },
      players: [{ slug: 'a', v: [2, 38, -3, 41], p: [60, 70, 80, 90] }]
    }
    const one = singleYear(d)
    expect(one.players[0].v).toEqual([2, 41, -3, 41])
    expect(one.players[0].p).toEqual([60, 90, 80, 90])
    expect(one.stats['C&S 3%'].years).toBe(null)
    // No single season on file: keeps its window.
    expect(one.stats['Def FGA Diff%'].years).toBe(2)
    // The document itself is untouched (the page caches it).
    expect(d.players[0].v[1]).toBe(38)
    expect(d.stats['C&S 3%'].years).toBe(3)
    // A playoffs document has no window columns: as it was.
    expect(singleYear(s1)).toBe(s1)
  })

  test('qualifiers keep the top share of the minutes', () => {
    const rows = [100, 200, 300, 400].map(mp => ({ mp }))
    expect(qualified(rows, 1)).toHaveLength(4)
    expect(qualified(rows, 0.5).map(r => r.mp)).toEqual([300, 400])
    expect(qualified(rows, 0.25).map(r => r.mp)).toEqual([400])
  })
})
