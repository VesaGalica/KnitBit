import { describe, expect, it } from 'vitest'
import { rleToRow, rowToRLE } from '../../core/rle'
import type { BitRow } from '../../core/types'

describe('rowToRLE', () => {
  it('writes [0,0,1,1,0,0,1,1] as "D2, P2, D2, P2"', () => {
    expect(rowToRLE([0, 0, 1, 1, 0, 0, 1, 1])).toBe('D2, P2, D2, P2')
  })

  it('handles a single-cell row', () => {
    expect(rowToRLE([0])).toBe('D1')
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
  it('reverses "D2, P2, D2, P2"', () => {
    expect(rleToRow('D2, P2, D2, P2')).toEqual([0, 0, 1, 1, 0, 0, 1, 1])
  })

  it('accepts lower case and missing or extra spaces', () => {
    expect(rleToRow('  d2,p1 ,  D1 ')).toEqual([0, 0, 1, 0])
  })

  it('handles counts with more than one digit', () => {
    expect(rleToRow('D12')).toHaveLength(12)
  })

  it('returns an empty row for an empty string', () => {
    expect(rleToRow('')).toEqual([])
    expect(rleToRow('   ')).toEqual([])
  })

  it.each(['X2', 'D', '2D', 'D2 P2', 'D2,,P2', 'D0', 'D-1'])('rejects "%s"', (input) => {
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
