import { describe, expect, test } from 'vitest'
import { arrange } from './units.js'

const pl = slug => ({ slug, name: slug })

describe('units', () => {
  test('the clicked player keeps his spot, and so does anyone else from the unit', () => {
    // Clicked B in [A, B, C]: on B's page his unit [B, A, D] reads [A, B, D].
    expect(arrange([pl('b'), pl('a'), pl('d')], ['a', 'b', 'c']).map(p => p.slug)).toEqual(['a', 'b', 'd'])
    // A different unit: B still second, the others fill in their usual order.
    expect(arrange([pl('b'), pl('x'), pl('y')], ['a', 'b', 'c']).map(p => p.slug)).toEqual(['x', 'b', 'y'])
  })

  test('without an order of the same size, the usual order', () => {
    const unit = [pl('b'), pl('x')]
    expect(arrange(unit, null)).toBe(unit)
    expect(arrange(unit, ['a', 'b', 'c'])).toBe(unit)
  })

  test('players without a profile fill open spots', () => {
    expect(arrange([pl('b'), { slug: null, name: '?' }, pl('a')], ['a', 'b', 'c']).map(p => p.slug)).toEqual(['a', 'b', null])
  })
})
