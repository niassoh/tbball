import { describe, expect, test } from 'vitest'
import { define } from './glossary.js'

describe('glossary', () => {
  test('a label reads its definition; one it doesn’t know reads nothing', () => {
    expect(define('Load')).toMatch(/per 100 possessions/)
    expect(define('Load Δ')).toBeNull()
  })

  test('a board’s single-season column reads its rolling-window namesake’s', () => {
    expect(define('1yr Wide Open 3s/36')).toBe(define('Wide Open 3s/36'))
  })
})
