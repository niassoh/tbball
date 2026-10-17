import { describe, expect, test } from 'vitest'
import { unpackDots } from './shot.js'

describe('unpackDots', () => {
  test('reads the shots analysis/footprint/shot_bands.py packs, three characters a shot', () => {
    // As shot_bands.pack writes them: x 30, y 80 (tenths of a foot), made, short mid (band 1)
    // is "jDV"; behind the basket and wide (x -205, y -15), missed, a three (band 3) is "Lg7".
    expect(unpackDots('jDVLg7')).toEqual([[30, 80, 1, 1], [-205, -15, 0, 3]])
  })
})
