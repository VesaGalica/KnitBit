import { describe, expect, it } from 'vitest'
import { parseRow, rowToBitString } from '../../core/notation'

describe('rowToBitString', () => {
  it('writes a row as digits', () => {
    expect(rowToBitString([0, 1, 0, 0, 0, 1, 1, 0])).toBe('01000110')
  })

  it('writes an empty row as an empty string', () => {
    expect(rowToBitString([])).toBe('')
  })
})

describe('parseRow', () => {
  it('reads binary digits', () => {
    expect(parseRow('01000110')).toEqual([0, 1, 0, 0, 0, 1, 1, 0])
  })

  it('allows spaces inside binary digits', () => {
    expect(parseRow(' 0100 0110 ')).toEqual([0, 1, 0, 0, 0, 1, 1, 0])
  })

  it('reads a K/P pattern', () => {
    expect(parseRow('K1, P1, K3, P2, K1')).toEqual([0, 1, 0, 0, 0, 1, 1, 0])
  })

  it('gives the same row for both notations of "F"', () => {
    expect(parseRow('01000110')).toEqual(parseRow('K1, P1, K3, P2, K1'))
  })

  it('reads a single stitch in both notations', () => {
    expect(parseRow('1')).toEqual([1])
    expect(parseRow('P1')).toEqual([1])
  })

  it('returns an empty row for an empty line', () => {
    expect(parseRow('')).toEqual([])
    expect(parseRow('   ')).toEqual([])
  })

  it('rejects anything that is neither binary nor a pattern', () => {
    expect(() => parseRow('0102')).toThrow(/Invalid stitch group/)
    expect(() => parseRow('hello')).toThrow(/Invalid stitch group/)
  })
})
