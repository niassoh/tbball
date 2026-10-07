import { describe, expect, test } from 'vitest'
import { depthSlot, bestFit, slotName } from './depth.js'

const pl = (slug, hasProfile = true) => ({ slug, name: slug, hasProfile })
const chart = rows => ({ rows: Object.entries(rows).map(([pos, players]) => ({ pos, players })) })

describe('team switcher slots', () => {
  test('a player is placed at his highest slot', () => {
    const den = chart({ PG: [pl('murray')], SG: [pl('braun'), pl('derozan')], SF: [pl('derozan'), pl('johnson')], PF: [pl('gordon')], C: [pl('jokic')] })
    expect(depthSlot(den, 'jokic')).toEqual({ pos: 'C', index: 0 })
    expect(depthSlot(den, 'derozan')).toEqual({ pos: 'SF', index: 0 })
    expect(depthSlot(den, 'nobody')).toBe(null)
  })

  test('the same slot on the other team', () => {
    const lal = chart({ PG: [pl('doncic')], C: [pl('ayton'), pl('hayes')] })
    expect(bestFit({ pos: 'C', index: 1 }, lal).player.slug).toBe('hayes')
    expect(bestFit({ pos: 'C', index: 0 }, lal).player.slug).toBe('ayton')
  })

  test('players without a profile are skipped for the nearest depth, higher on ties', () => {
    const t = chart({ C: [pl('a', false), pl('b'), pl('c', false), pl('d')] })
    expect(bestFit({ pos: 'C', index: 0 }, t).player.slug).toBe('b')
    expect(bestFit({ pos: 'C', index: 2 }, t).player.slug).toBe('b')
    expect(bestFit({ pos: 'C', index: 3 }, t).player.slug).toBe('d')
  })

  test('an empty position falls to the nearest position', () => {
    const t = chart({ PG: [pl('pg')], SG: [], SF: [pl('sf')], PF: [pl('pf', false)], C: [pl('c')] })
    expect(bestFit({ pos: 'PF', index: 0 }, t).pos).toBe('SF')
    expect(bestFit({ pos: 'SG', index: 0 }, t).player.slug).toBe('pg')
    expect(bestFit({ pos: 'C', index: 0 }, chart({ C: [pl('x', false)] }))).toBe(null)
  })

  test('slot names', () => {
    expect(slotName({ pos: 'C', index: 0 })).toBe('STARTING C')
    expect(slotName({ pos: 'SG', index: 1 })).toBe('SG #2')
  })
})
