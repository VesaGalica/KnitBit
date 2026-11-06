import { describe, expect, it } from 'vitest'
import { BinaryRowError, parseRow, rowToBitString } from '../../core/notation'

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

  it('reads a repeated pattern', () => {
    expect(parseRow('[K2, P2] x2')).toEqual(parseRow('00110011'))
    expect(() => parseRow('[K2, P2]')).toThrow(/Invalid repeat/)
  })

  it('returns an empty row for an empty line', () => {
    expect(parseRow('')).toEqual([])
    expect(parseRow('   ')).toEqual([])
  })

  it('rejects anything that is neither binary nor a pattern', () => {
    expect(() => parseRow('hello')).toThrow(/Invalid stitch group/)
  })

  it('treats a line starting with a digit as binary and names the bad character', () => {
    // The letter O instead of a zero, typed by hand.
    expect(() => parseRow('0100011O')).toThrow(BinaryRowError)
    expect(() => parseRow('0102')).toThrow(/"2" is not one of them/)
    try {
      parseRow('0100011O')
    }
    catch (error) {
      expect((error as BinaryRowError).invalid).toBe('O')
    }
  })

  it('reads a mixed line of repeats and plain groups', () => {
    expect(parseRow('[K1, P1] x3, K2')).toEqual([0, 1, 0, 1, 0, 1, 0, 0])
    expect(parseRow('K1, [K2, P2] x2, K1')).toEqual([0, 0, 0, 1, 1, 0, 0, 1, 1, 0])
    expect(parseRow('[k1,p1]x2, [P2] x2')).toEqual([0, 1, 0, 1, 1, 1, 1, 1])
  })

  it('reads every line of the encode page hint the same as its binary form', () => {
    expect(parseRow('K1, P1, K3, P2, K1')).toEqual(parseRow('01000110'))
    expect(parseRow('[K1, P1] x3, K2')).toEqual(parseRow('01010100'))
  })

  it('rejects broken brackets, nested repeats and empty groups', () => {
    expect(() => parseRow('[K1, P1 x3, K2')).toThrow(/without a matching "]"/)
    expect(() => parseRow('K1, P1] x3')).toThrow(/without a matching "\["/)
    expect(() => parseRow('[[K1] x2, P1] x2')).toThrow(/Nested repeats/)
    expect(() => parseRow('K1,, K2')).toThrow(/Invalid stitch group ""/)
    expect(() => parseRow('[K1, P1] x3,')).toThrow(/Invalid stitch group ""/)
  })

  it('names the bad part inside a mixed line', () => {
    expect(() => parseRow('[K1, P1] x3, Q2')).toThrow(/Invalid stitch group "Q2"/)
    expect(() => parseRow('[K1, Q1] x3, K2')).toThrow(/Invalid stitch group "Q1"/)
  })
})
