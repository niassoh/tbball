import { describe, expect, test } from 'vitest'
import { DIVISIONS, TEAM_COLORS, teamStints } from './teams.js'

describe('divisions', () => {
  test('every team appears once, five per division', () => {
    const teams = DIVISIONS.flatMap(([, divs]) => divs.flatMap(([, t]) => t))
    expect([...teams].sort()).toEqual(Object.keys(TEAM_COLORS).sort())
    expect(DIVISIONS.flatMap(([, divs]) => divs).every(([, t]) => t.length === 5)).toBe(true)
  })
})

describe('team stints', () => {
  const season = (label, teams) => ({ label, tm: teams.length > 1 ? `${teams.length} TM` : teams[0], teams })
  test('consecutive seasons on one team merge', () => {
    expect(teamStints([season('2022–23', ['PHI']), season('2023–24', ['LAC']), season('2024–25', ['LAC'])])).toEqual([
      { team: 'PHI', from: 0, to: 1, first: '2022–23', last: '2022–23' },
      { team: 'LAC', from: 1, to: 2, first: '2023–24', last: '2024–25' }
    ])
  })
  test('a traded season splits its slot in order and joins its neighbours', () => {
    const s = teamStints([season('2024–25', ['LAC']), season('2025–26', ['LAC', 'CLE'])])
    // A new team in the latest season gets half a slot past its point (1..1.5), shared in order.
    expect(s.map(x => [x.team, x.from, x.to])).toEqual([['LAC', 0, 1.25], ['CLE', 1.25, 1.5]])
  })
  test('a team new in the latest season starts on its point and trails past it', () => {
    const s = teamStints([season('2023–24', ['NYK']), season('2024–25', ['NYK']), season('2025–26', ['OKC'])])
    expect(s.map(x => [x.team, x.from, x.to])).toEqual([['NYK', 0, 2], ['OKC', 2, 2.5]])
  })
  test('the same team in the latest season ends on its point', () => {
    const s = teamStints([season('2024–25', ['LAC', 'CLE']), season('2025–26', ['CLE'])])
    expect(s.map(x => [x.team, x.from, x.to])).toEqual([['LAC', 0, 0.5], ['CLE', 0.5, 1]])
  })
  test('seasons without a team list fall back to tm', () => {
    expect(teamStints([{ label: '2013–14', tm: 'MIA' }])[0].team).toBe('MIA')
  })
})
