import type { Bit, BitMatrix } from './types'

/**
 * Two-dimensional (even) parity for knitting charts.
 *
 * addParity appends one parity stitch to the end of every row and one parity
 * row at the bottom, so that every row and every column of the result has an
 * even number of P stitches (1s). The bottom-right corner is the parity of the
 * parity row, so the parity row and column also check each other.
 *
 *     data      with parity
 *     0 1       0 1 | 1
 *     1 1       1 1 | 0
 *               ----+--
 *               1 0 | 1
 *
 * If exactly one stitch is knitted wrong, exactly one row and one column
 * become odd, and their crossing is the wrong stitch. This also works when the
 * mistake is in a parity stitch itself.
 */

export interface CellPosition {
  row: number
  col: number
}

/** Adds a parity column and a parity row. An empty chart stays empty. */
export function addParity(matrix: BitMatrix): BitMatrix {
  assertRectangular(matrix)
  if (matrix.length === 0) return []

  const withRowParity = matrix.map(row => [...row, parityOf(row)])
  const width = withRowParity[0]!.length
  const parityRow = Array.from({ length: width }, (_, col) =>
    parityOf(withRowParity.map(row => row[col]!)),
  )
  return [...withRowParity, parityRow]
}

/**
 * Checks a chart produced by addParity.
 *
 * Returns null if every row and column is even (no error found), or the
 * position of the single wrong stitch. Throws if the pattern of odd rows and
 * columns cannot come from a single error, because then the position cannot
 * be determined; the user has to check the chart by hand.
 */
export function checkParity(matrix: BitMatrix): CellPosition | null {
  assertRectangular(matrix)
  if (matrix.length === 0) return null

  const width = matrix[0]!.length
  const oddRows = matrix
    .map((row, index) => (parityOf(row) === 1 ? index : -1))
    .filter(index => index !== -1)
  const oddCols = Array.from({ length: width }, (_, col) => col)
    .filter(col => parityOf(matrix.map(row => row[col]!)) === 1)

  if (oddRows.length === 0 && oddCols.length === 0) return null
  if (oddRows.length === 1 && oddCols.length === 1) {
    return { row: oddRows[0]!, col: oddCols[0]! }
  }
  throw new Error(
    `More than one error: odd rows [${oddRows.join(', ')}], odd columns [${oddCols.join(', ')}].`,
  )
}

/** 0 if the row has an even number of 1s, otherwise 1. */
function parityOf(bits: Bit[]): Bit {
  let parity = 0
  for (const bit of bits) parity ^= bit
  return parity as Bit
}

function assertRectangular(matrix: BitMatrix): void {
  const width = matrix[0]?.length ?? 0
  matrix.forEach((row, index) => {
    if (row.length !== width) {
      throw new Error(`Row ${index} has ${row.length} stitches, expected ${width}.`)
    }
  })
}
