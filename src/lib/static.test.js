import { describe, expect, it } from 'vitest'
import { asset, statKey } from './static.js'

describe('static site paths', () => {
  // Same cases as thinking-bball test/export.test.js, so the two copies agree.
  it('turns stat labels into the export file names', () => {
    expect(statKey('Pts / 75')).toBe('pts-75')
    expect(statKey('rTS%')).toBe('rts')
    expect(statKey('Net On/Off')).toBe('net-on-off')
    expect(statKey('Def FGA <6ft /36')).toBe('def-fga-6ft-36')
  })

  it('addresses public files through the base path', () => {
    expect(asset('logos/DEN.png')).toBe(`${import.meta.env.BASE_URL}logos/DEN.png`)
  })
})
