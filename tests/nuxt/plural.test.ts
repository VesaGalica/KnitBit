import { describe, expect, it } from 'vitest'
import { plural } from '../../app/utils/plural'

describe('plural', () => {
  it('uses the singular only for exactly 1', () => {
    expect(plural(1, 'character')).toBe('1 character')
    expect(plural(0, 'character')).toBe('0 characters')
    expect(plural(2, 'character')).toBe('2 characters')
  })

  it('takes an irregular plural', () => {
    expect(plural(1, 'stitch', 'stitches')).toBe('1 stitch')
    expect(plural(4, 'purl stitch', 'purl stitches')).toBe('4 purl stitches')
  })
})
