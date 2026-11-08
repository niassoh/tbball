import { describe, expect, it } from 'vitest'
import { onTest } from './changelog.js'

describe('onTest', () => {
  it('reads only the On test section, split at the first colon', () => {
    const md = '# Changelog\n\nintro\n\n## On test\n\n- Teams: a UNITS view: new\n- No area here\n\n## Shipped 2026-11-01\n\n- Old: gone\n'
    expect(onTest(md)).toEqual([['Teams', 'a UNITS view: new'], ['', 'No area here']])
  })
  it('is empty without the section', () => {
    expect(onTest('# Changelog\n\n## Shipped 2026-11-01\n\n- Old: gone\n')).toEqual([])
  })
})
