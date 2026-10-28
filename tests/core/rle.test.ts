import { describe, expect, it } from 'vitest'
import { rleToRow, rowToRepeatedRLE, rowToRLE } from '../../core/rle'
import type { BitRow } from '../../core/types'

describe('rowToRLE', () => {
  it('writes [0,0,1,1,0,0,1,1] as "K2, P2, K2, P2"', () => {
    expect(rowToRLE([0, 0, 1, 1, 0, 0, 1, 1])).toBe('K2, P2, K2, P2')
  })

  it('handles a single-cell row', () => {
    expect(rowToRLE([0])).toBe('K1')
    expect(rowToRLE([1])).toBe('P1')
  })

  it('handles a row of one stitch type', () => {
    expect(rowToRLE([1, 1, 1, 1, 1])).toBe('P5')
  })

  it('returns an empty string for an empty row', () => {
    expect(rowToRLE([])).toBe('')
  })
})

describe('rleToRow', () => {
  it('reverses "K2, P2, K2, P2"', () => {
    expect(rleToRow('K2, P2, K2, P2')).toEqual([0, 0, 1, 1, 0, 0, 1, 1])
  })

  it('accepts lower case and missing or extra spaces', () => {
    expect(rleToRow('  k2,p1 ,  K1 ')).toEqual([0, 0, 1, 0])
  })

  it('handles counts with more than one digit', () => {
    expect(rleToRow('K12')).toHaveLength(12)
  })

  it('returns an empty row for an empty string', () => {
    expect(rleToRow('')).toEqual([])
    expect(rleToRow('   ')).toEqual([])
  })

  it.each(['X2', 'D2', 'K', '2K', 'K2 P2', 'K2,,P2', 'K0', 'K-1'])('rejects "%s"', (input) => {
    expect(() => rleToRow(input)).toThrow(/Invalid stitch group/)
  })
})

describe('rowToRLE and rleToRow', () => {
  const rows: BitRow[] = [
    [0],
    [1, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  ]
  it.each(rows)('round trip %#', (...row) => {
    expect(rleToRow(rowToRLE(row))).toEqual(row)
  })
})

describe('rowToRepeatedRLE', () => {
  it('writes a clear repeat as a group with a count', () => {
    expect(rowToRepeatedRLE([0, 0, 1, 1, 0, 0, 1, 1])).toBe('[K2, P2] x2')
  })

  it('finds the shortest repeating group', () => {
    // "[K1, P1, K1, P1] x2" also fits; the shorter group "[K1, P1]" is chosen.
    expect(rowToRepeatedRLE([0, 1, 0, 1, 0, 1, 0, 1])).toBe('[K1, P1] x4')
  })

  it('handles a group repeated three times', () => {
    expect(rowToRepeatedRLE([0, 1, 1, 0, 1, 1, 0, 1, 1])).toBe('[K1, P2] x3')
  })

  it('falls back to plain RLE when there is no repeat', () => {
    // "F" = 01000110
    expect(rowToRepeatedRLE([0, 1, 0, 0, 0, 1, 1, 0])).toBe('K1, P1, K3, P2, K1')
  })

  it('handles a single stitch', () => {
    expect(rowToRepeatedRLE([1])).toBe('P1')
  })

  it('does not use a repeat that does not divide the row evenly', () => {
    // K1, P1 fits 2.5 times into 5 stitches: no whole number of repeats.
    expect(rowToRepeatedRLE([0, 1, 0, 1, 0])).toBe('K1, P1, K1, P1, K1')
  })

  it('keeps plain RLE for a row of one stitch type', () => {
    expect(rowToRepeatedRLE([0, 0, 0, 0, 0, 0, 0, 0])).toBe('K8')
  })

  it('returns an empty string for an empty row', () => {
    expect(rowToRepeatedRLE([])).toBe('')
  })

  it('always describes the same row as plain RLE (checked for every 8-stitch row)', () => {
    for (let value = 0; value < 256; value++) {
      const row = Array.from({ length: 8 }, (_, i) => ((value >> (7 - i)) & 1) as 0 | 1)
      const repeated = rowToRepeatedRLE(row)
      const match = /^\[(.*)\] x(\d+)$/.exec(repeated)
      const expanded = match
        ? Array.from({ length: Number(match[2]) }, () => rleToRow(match[1]!)).flat()
        : rleToRow(repeated)
      expect(expanded).toEqual(row)
    }
  })
})
