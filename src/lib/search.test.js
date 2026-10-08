import { describe, expect, test } from 'vitest'
import { matchParts, searchPlayers, searchTeams } from './search.js'

const teams = [{ team: 'LAC', name: 'Clippers' }, { team: 'LAL', name: 'Lakers' }, { team: 'PHI', name: '76ers' }, { team: 'ORL', name: 'Magic' }]

describe('top-bar search', () => {
  test('players: name-start matches lead, diacritics fold', () => {
    const players = [{ name: 'Nikola Jokić' }, { name: 'Cole Anthony' }, { name: 'Anthony Edwards' }]
    expect(searchPlayers(players, 'jokic', 8).map(p => p.name)).toEqual(['Nikola Jokić'])
    expect(searchPlayers(players, 'anth', 8).map(p => p.name)).toEqual(['Cole Anthony', 'Anthony Edwards'])
    expect(searchPlayers(players, '  ', 8)).toEqual([])
  })

  test('teams match nickname or abbreviation', () => {
    expect(searchTeams(teams, 'lak', 3).map(t => t.team)).toEqual(['LAL'])
    expect(searchTeams(teams, 'LAL', 3).map(t => t.team)).toEqual(['LAL'])
    expect(searchTeams(teams, 'la', 3).map(t => t.team)).toEqual(['LAC', 'LAL'])
    expect(searchTeams(teams, '76', 3).map(t => t.team)).toEqual(['PHI'])
  })

  test('nickname-prefix matches come before matches inside a name, and one letter finds no team', () => {
    expect(searchTeams(teams, 'ic', 3).map(t => t.team)).toEqual(['ORL'])
    expect(searchTeams([{ team: 'X', name: 'Magic' }, { team: 'MIA', name: 'Mice' }], 'mi', 3).map(t => t.name)).toEqual(['Mice'])
    expect(searchTeams(teams, 'l', 3)).toEqual([])
  })

  test('match parts: highlights the typed text, preferring a word start, through diacritics', () => {
    expect(matchParts('Karl-Anthony Towns', 't')).toEqual(['Karl-Anthony ', 'T', 'owns'])
    expect(matchParts('Cole Anthony', 'an')).toEqual(['Cole ', 'An', 'thony'])
    expect(matchParts('Nikola Jokić', 'jokic')).toEqual(['Nikola ', 'Jokić', ''])
    expect(matchParts('Tyrese Maxey', 'ese')).toEqual(['Tyr', 'ese', ' Maxey'])
    expect(matchParts('Amen Thompson', 'zz')).toEqual(['Amen Thompson', '', ''])
    expect(matchParts('Amen Thompson', ' ')).toEqual(['Amen Thompson', '', ''])
  })
})
