import { describe, expect, test } from 'vitest'
import { teamStints } from './teams.js'

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
    // The last season gets the second half of the final gap (0.5..1), shared in order.
    expect(s.map(x => [x.team, x.from, x.to])).toEqual([['LAC', 0, 0.75], ['CLE', 0.75, 1]])
  })
  test('a team new in the latest season starts halfway into the final gap', () => {
    const s = teamStints([season('2023–24', ['NYK']), season('2024–25', ['NYK']), season('2025–26', ['OKC'])])
    expect(s.map(x => [x.team, x.from, x.to])).toEqual([['NYK', 0, 1.5], ['OKC', 1.5, 2]])
  })
  test('seasons without a team list fall back to tm', () => {
    expect(teamStints([{ label: '2013–14', tm: 'MIA' }])[0].team).toBe('MIA')
  })
})
