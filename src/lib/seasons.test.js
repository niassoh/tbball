import { describe, expect, test } from 'vitest'
import { emptyNote, openingSeasons, seasonsBetween, shortSeason, spanId, spanText } from './seasons.js'

describe('seasons', () => {
  test('a card opens on his last three seasons until he has 500 minutes in the latest, then his last two', () => {
    const his = ['2023-24', '2024-25', '2025-26', '2026-27']
    const p = mp => ({ seasons: [{ season: '2025-26', mp: 2400 }, { season: '2026-27', mp }] })
    expect(openingSeasons(p(36), his)).toEqual(['2024-25', '2025-26', '2026-27'])
    expect(openingSeasons(p(500), his)).toEqual(['2025-26', '2026-27'])
    // No row for the latest (under the sheet's floor) counts as under 500.
    expect(openingSeasons({ seasons: [] }, his)).toEqual(['2024-25', '2025-26', '2026-27'])
    expect(openingSeasons(p(36), ['2026-27'])).toEqual(['2026-27'])
  })

  test('an empty season says whether he played under the floor or not at all', () => {
    // Rondo's two games for Dallas in the 2015 playoffs: 37 minutes, under the sheet's 50.
    expect(emptyNote({ card: { lineups: { on: { minutes: 37 } } } }, 'playoffs')).toBe('37 MIN · UNDER THE 50-MIN FLOOR')
    expect(emptyNote({ card: null }, 'playoffs')).toBe('NO PLAYOFF GAMES')
    expect(emptyNote({ card: null }, 'regular')).toBe('UNDER THE 800-MIN FLOOR')
  })

  test('an empty season never puts minutes at or over the floor under it', () => {
    // Kobe's 1996-97: 1,101 minutes, and no row for him on the historical tab.
    expect(emptyNote({ unsourced: true, card: { lineups: { on: { minutes: 1101 } } } }, 'regular')).toBe('NOT IN THE SOURCE DATA')
    // Tim Thomas's 1998-99: 624 of his 812 minutes in New Jersey; still the tab's gap.
    expect(emptyNote({ unsourced: true, card: { lineups: { on: { minutes: 624 } } } }, 'regular')).toBe('NOT IN THE SOURCE DATA')
    // Aldrich's 2015-16: 799.6 minutes on the floor, rounded to 800; the sheet's floor kept him off.
    expect(emptyNote({ card: { lineups: { on: { minutes: 800 } } } }, 'regular')).toBe('UNDER THE 800-MIN FLOOR')
    expect(emptyNote({ card: { lineups: { on: { minutes: 792 } } } }, 'regular')).toBe('792 MIN · UNDER THE 800-MIN FLOOR')
    // Over the floor without the flag (an export from before it): not under it either.
    expect(emptyNote({ card: { lineups: { on: { minutes: 1101 } } } }, 'regular')).toBe('NOT IN THE SOURCE DATA')
  })

  test('short seasons, every season between two, a span and its view', () => {
    expect(shortSeason('2013-14')).toBe('’14')
    expect(seasonsBetween('2018-19', '2021-22')).toEqual(['2018-19', '2019-20', '2020-21', '2021-22'])
    expect(seasonsBetween('2025-26', '2025-26')).toEqual(['2025-26'])
    expect(spanText('2025-26', '2025-26')).toBe('2025–26')
    expect(spanText('2018-19', '2020-21')).toBe('2018–19 → 2020–21')
    expect(spanId('2025-26', '2025-26')).toBe('2025-26')
    expect(spanId('2018-19', '2020-21')).toBe('2018-19..2020-21')
  })
})
