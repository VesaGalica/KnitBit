import type { Bit, BitMatrix } from './types'

/**
 * A chart stored as one flat array, row by row: the stitch in row r,
 * column c is at index r * width + c. This is how the Pinia store keeps the
 * active chart (one byte per stitch, cheap to copy for undo/redo).
 * The rest of the core works with BitMatrix (an array of rows), which is
 * easier to read; the functions below convert between the two.
 */
export interface FlatChart {
  width: number
  height: number
  cells: Uint8Array
}

/** A width × height chart with only K (0) stitches. */
export function createChart(width: number, height: number): FlatChart {
  assertSize(width, height)
  return { width, height, cells: new Uint8Array(width * height) }
}

/** [[0, 1], [1, 1]] → { width: 2, height: 2, cells: [0, 1, 1, 1] } */
export function matrixToChart(matrix: BitMatrix): FlatChart {
  const height = matrix.length
  const width = matrix[0]?.length ?? 0
  const cells = new Uint8Array(width * height)
  matrix.forEach((row, r) => {
    if (row.length !== width) {
      throw new Error(`Row ${r} has ${row.length} stitches, expected ${width}.`)
    }
    cells.set(row, r * width)
  })
  return { width, height, cells }
}

/** Inverse of matrixToChart. */
export function chartToMatrix(chart: FlatChart): BitMatrix {
  const { width, height, cells } = chart
  return Array.from({ length: height }, (_, r) =>
    Array.from(cells.subarray(r * width, (r + 1) * width), cell => cell as Bit),
  )
}

/**
 * Returns a new chart with one stitch flipped (K ↔ P).
 * The input is not changed: the store keeps the old chart in its undo history.
 */
export function toggleCell(chart: FlatChart, row: number, col: number): FlatChart {
  if (row < 0 || row >= chart.height || col < 0 || col >= chart.width) {
    throw new Error(`Cell (${row}, ${col}) is outside the ${chart.width}×${chart.height} chart.`)
  }
  const cells = chart.cells.slice()
  const index = row * chart.width + col
  cells[index] = cells[index] === 1 ? 0 : 1
  return { ...chart, cells }
}

/**
 * Returns a chart with a new size. Stitches in the part both sizes share
 * (the top-left corner) are kept; new stitches are K (0). Growing and then
 * shrinking back therefore gives the original chart.
 */
export function resizeChart(chart: FlatChart, width: number, height: number): FlatChart {
  const resized = createChart(width, height)
  const keepWidth = Math.min(width, chart.width)
  const keepHeight = Math.min(height, chart.height)
  for (let r = 0; r < keepHeight; r++) {
    const start = r * chart.width
    resized.cells.set(chart.cells.subarray(start, start + keepWidth), r * width)
  }
  return resized
}

function assertSize(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 0 || height < 0) {
    throw new Error(`Invalid chart size ${width}×${height}.`)
  }
}
