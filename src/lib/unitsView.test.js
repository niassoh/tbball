import { describe, expect, it } from 'vitest'
import { columns, combine, statsOf, teamRow, tracks } from './unitsView.js'

const FIELDS = ['Points', 'FG2M', 'FG2A', 'FG3M', 'FG3A', 'AtRimFGM', 'AtRimFGA', 'ShortMidRangeFGM', 'ShortMidRangeFGA', 'LongMidRangeFGM', 'LongMidRangeFGA', 'Corner3FGM', 'Corner3FGA', 'FTA', 'Turnovers', 'LiveBallTurnovers', 'OffRebounds', 'DefRebounds', 'Assists', 'Steals', 'Blocks', 'Fouls']
// Counts by name, the rest 0.
const C = o => FIELDS.map(f => o[f] || 0)
const unit = (ids, minutes, offPoss, defPoss, t, o) => ({ ids, seconds: minutes * 60, offPoss, defPoss, t: C(t), o: C(o), rank: { rank: 3, of: 100 } })
// A season's file: the league scores 110 per 100 on offense and defense in 2001, 100 in 2002.
const season = (s, lg, units) => ({
  season: s, team: 'BOS', fields: FIELDS, floors: { 2: 200, 3: 150, 4: 100, 5: 50 }, viewFloors: { 2: 100, 3: 60, 4: 40, 5: 20 },
  league: { seconds: 0, offPoss: 1000, defPoss: 1000, t: C({ Points: lg * 10 }), o: C({ Points: lg * 10 }) },
  total: { seconds: 6000, offPoss: 200, defPoss: 200, t: C({ Points: 220 }), o: C({ Points: 210 }) },
  players: [{ id: 'A', name: 'A A', minutes: 90 }, { id: 'B', name: 'B B', minutes: 60 }, { id: 'C', name: 'C C', minutes: 30 }],
  units: { 2: units, 3: [], 4: [], 5: [] }
})

describe('unitsView', () => {
  it('takes ratings, net as ORTG less DRTG, the four factors and shot mix from counts', () => {
    // 110 on 100 offensive possessions, 105 on 95 defensive.
    const u = unit(['A', 'B'], 48, 100, 95,
      { Points: 110, FG2M: 30, FG2A: 60, FG3M: 10, FG3A: 30, AtRimFGA: 25, ShortMidRangeFGA: 20, LongMidRangeFGA: 15, Corner3FGA: 10, FTA: 18, Turnovers: 12, OffRebounds: 10, DefRebounds: 30 },
      { Points: 105, FG2A: 50, FG3A: 40, OffRebounds: 15, DefRebounds: 40, Turnovers: 19 })
    const s = statsOf({ ...u, lgOff: 108 * 100, lgDef: 110 * 95 }, FIELDS)
    expect(s.ortg).toBeCloseTo(110)
    expect(s.drtg).toBeCloseTo(110.526, 2)
    expect(s.net).toBeCloseTo(-0.526, 2)
    expect(s.rortg).toBeCloseTo(2)
    expect(s.rdrtg).toBeCloseTo(0.526, 2)
    expect(s.pace).toBeCloseTo(97.5)
    expect(s.off.efg).toBeCloseTo(50) // (30 + 1.5·10) / 90
    expect(s.off.tov).toBeCloseTo(12)
    expect(s.off.oreb).toBeCloseTo(20) // 10 / (10 + 40)
    expect(s.off.ftr).toBeCloseTo(20)
    expect(s.def.tov).toBeCloseTo(20) // 19 / 95
    expect(s.def.oreb).toBeCloseTo(33.33, 1) // 15 / (15 + 30)
    expect(s.off.mix).toEqual({ rim: expect.closeTo(27.78, 1), short: expect.closeTo(22.22, 1), long: expect.closeTo(16.67, 1), corner: expect.closeTo(11.11, 1), above: expect.closeTo(22.22, 1) })
  })

  it('sums a unit over a span, each season set against its own league', () => {
    const view = combine([
      season('2000-01', 110, [unit(['A', 'B'], 100, 100, 100, { Points: 120 }, { Points: 100 })]),
      season('2001-02', 100, [unit(['B', 'A'], 50, 300, 300, { Points: 330 }, { Points: 300 }), unit(['A', 'C'], 30, 50, 50, { Points: 50 }, { Points: 60 })])
    ])
    const ab = view.units[2].find(u => u.key === 'A-B')
    expect(ab.seasons).toEqual(['2000-01', '2001-02'])
    expect(ab.rank).toBeNull()
    const s = statsOf(ab, view.fields)
    expect(s.minutes).toBe(150)
    expect(s.ortg).toBeCloseTo(112.5) // 450 / 400
    expect(s.drtg).toBeCloseTo(100)
    // The league's ORTG over its possessions: (110·100 + 100·300) / 400 = 102.5.
    expect(s.rortg).toBeCloseTo(10)
    expect(s.rdrtg).toBeCloseTo(-2.5)
    expect(view.players.map(p => [p.id, p.minutes])).toEqual([['A', 180], ['B', 120], ['C', 60]])
  })

  it('keeps a single season its league rank, and orders and floors columns', () => {
    const view = combine([season('2001-02', 100, [
      unit(['A', 'B'], 200, 100, 100, { Points: 100 }, { Points: 110 }),
      unit(['A', 'C'], 150, 100, 100, { Points: 120 }, { Points: 100 }),
      unit(['B', 'C'], 50, 100, 100, { Points: 130 }, { Points: 90 })
    ])])
    expect(view.units[2][0].rank).toEqual({ rank: 3, of: 100 })
    expect(columns(view, 2).map(c => c.key)).toEqual(['A-B', 'A-C', 'B-C'])
    expect(columns(view, 2, { sort: 'net' }).map(c => c.key)).toEqual(['B-C', 'A-C', 'A-B'])
    expect(columns(view, 2, { sort: 'drtg', floor: 100 }).map(c => c.key)).toEqual(['A-C', 'A-B'])
    expect(tracks(view, columns(view, 2, { floor: 160 })).map(p => p.id)).toEqual(['A', 'B'])
  })
})

describe('teamRow', () => {
  it('reads a team by its units: the most-used one, the rest, the best over the floor', () => {
    const view = combine([season('2001-02', 100, [
      unit(['A', 'B'], 60, 50, 50, { Points: 60 }, { Points: 50 }), // +20, the most used
      unit(['A', 'C'], 40, 40, 40, { Points: 52 }, { Points: 40 }), // +30, under the 200-min floor
      unit(['B', 'C'], 30, 30, 30, { Points: 27 }, { Points: 30 }) // −10
    ])])
    view.floors[2] = 35
    const r = teamRow(view, 2)
    expect(r.top.key).toBe('A-B')
    expect(r.share).toBeCloseTo(60) // 60 of the team's 100 minutes
    // The team (220 − 210 on 200 each way) less the unit (60 − 50 on 50): 160 − 160 on 150.
    expect(r.rest.net).toBeCloseTo(0)
    expect(r.best.key).toBe('A-C')
    expect(r.over).toBe(2)
    expect(r.positive).toBe(100) // A-B and A-C, both up; B-C is under 35 min
  })
})

describe('combine floors', () => {
  it('asks a span of seasons for one season’s minutes floor, the highest of them', () => {
    const a = { ...season('2000-01', 110, []), floors: { 2: 200, 3: 150, 4: 100, 5: 50 } }
    const b = { ...season('2001-02', 100, []), floors: { 2: 250, 3: 120, 4: 100, 5: 60 } }
    expect(combine([a, b]).floors).toEqual({ 2: 250, 3: 150, 4: 100, 5: 60 })
  })
})
