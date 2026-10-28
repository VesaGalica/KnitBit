import { describe, expect, it } from 'vitest'
import { addParity, checkParity } from '../../core/parity'
import { textToMatrix } from '../../core/encoding'
import type { BitMatrix } from '../../core/types'

/** Returns a copy of the matrix with one cell flipped (0 ↔ 1). */
function flip(matrix: BitMatrix, row: number, col: number): BitMatrix {
  return matrix.map((r, i) => r.map((bit, j) => (i === row && j === col ? (1 - bit) as 0 | 1 : bit)))
}

describe('addParity', () => {
  it('adds a parity column and a parity row with even parity', () => {
    expect(addParity([
      [0, 1],
      [1, 1],
    ])).toEqual([
      [0, 1, 1],
      [1, 1, 0],
      [1, 0, 1],
    ])
  })

  it('handles a single cell', () => {
    expect(addParity([[1]])).toEqual([
      [1, 1],
      [1, 1],
    ])
    expect(addParity([[0]])).toEqual([
      [0, 0],
      [0, 0],
    ])
  })

  it('leaves an empty chart empty', () => {
    expect(addParity([])).toEqual([])
  })

  it('does not change the input', () => {
    const input: BitMatrix = [[1, 0]]
    addParity(input)
    expect(input).toEqual([[1, 0]])
  })

  it('rejects rows of different lengths', () => {
    expect(() => addParity([[0, 1], [1]])).toThrow(/Row 1/)
  })
})

describe('checkParity', () => {
  const protectedChart = addParity(textToMatrix('FIEK'))

  it('returns null for a valid chart', () => {
    expect(checkParity(protectedChart)).toBeNull()
  })

  it('returns null for an empty chart', () => {
    expect(checkParity([])).toBeNull()
  })

  it('finds one flipped cell at the right position', () => {
    expect(checkParity(flip(protectedChart, 2, 5))).toEqual({ row: 2, col: 5 })
  })

  it('finds a single flipped cell anywhere, including in the parity row and column', () => {
    for (let row = 0; row < protectedChart.length; row++) {
      for (let col = 0; col < protectedChart[0]!.length; col++) {
        expect(checkParity(flip(protectedChart, row, col))).toEqual({ row, col })
      }
    }
  })

  it('finds a flipped cell in a single-cell chart', () => {
    const tiny = addParity([[1]])
    expect(checkParity(flip(tiny, 0, 0))).toEqual({ row: 0, col: 0 })
  })

  it('throws when two cells in different rows and columns are wrong', () => {
    const twoErrors = flip(flip(protectedChart, 0, 0), 2, 3)
    expect(() => checkParity(twoErrors)).toThrow(/More than one error/)
  })
})

describe('checkParity – limits of 2D parity', () => {
  const protectedChart = addParity(textToMatrix('FIEK'))

  it('does not detect four flipped stitches at the corners of a rectangle (known limitation of 2D parity)', () => {
    // Each affected row and each affected column has exactly two flips,
    // so all parities stay even and the chart looks valid.
    const fourErrors = flip(flip(flip(flip(protectedChart, 0, 1), 0, 5), 3, 1), 3, 5)
    expect(fourErrors).not.toEqual(protectedChart)
    expect(checkParity(fourErrors)).toBeNull()
  })

  it('cannot locate two flipped stitches in the same row (reports more than one error)', () => {
    // Two odd columns but no odd row: the pattern of a single error is missing.
    const twoInOneRow = flip(flip(protectedChart, 1, 2), 1, 6)
    expect(() => checkParity(twoInOneRow)).toThrow(/More than one error/)
  })
})
