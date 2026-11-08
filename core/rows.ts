import { rowToShortestRLE } from './rle'
import type { Bit, BitMatrix, BitRow } from './types'

/**
 * From chart to the rows a knitter actually works (thesis chapter 4).
 *
 * A chart shows the right side (RS) of the fabric: 0 = K, 1 = P as seen
 * from the front. Knitting it raises two questions the chart does not answer.
 *
 * 1. Which chart row is knitted first?
 *    Chart row 1 (index 0) is knitted row 1, the first row after casting
 *    on. Row r of a chart is byte r of the text, generation r of an
 *    automaton or state r of a sort, so the knitter works through the
 *    computation forwards in time, and every page uses the same row numbers.
 *    The fabric grows upwards from the cast-on edge, so every chart in the
 *    app (screen, print sheet and SVG download) is drawn bottom-up: row 1 at
 *    the bottom, the picture looks like the fabric.
 *
 * 2. In which direction is a row worked, and which stitch is made?
 *    Stitches are always taken from the tip of the left needle.
 *    - RS row: the knitter faces the front, the left needle tip holds the
 *      stitch at the chart's right edge, so the row is worked right to left:
 *      the working order is the chart row reversed.
 *    - WS row: the knitter has turned the work and faces the back. The left
 *      needle tip now holds the stitch at the chart's left edge, so the row
 *      is worked left to right. Every stitch is also inverted (K ↔ P): a knit
 *      stitch made from the back shows as a purl on the front, and the other
 *      way round.
 *
 * The app supports flat knitting only. Flat knitting turns the work after
 * every row, so RS and WS rows alternate: odd rows RS, even rows WS.
 */

export type Side = 'RS' | 'WS'

/** One row as the knitter works it. */
export interface KnittingRow {
  /** Position in knitting order, starting at 1 (= chart row number). */
  number: number
  side: Side
  /** The stitches to make, in the order they are worked. */
  stitches: BitRow
  /** The shortest written form of `stitches`, e.g. "[K2, P2] x2". */
  instruction: string
}

/** Odd rows (row 1 first) are RS, even rows WS, because the work is turned after every row. */
export function rowSide(number: number): Side {
  return number % 2 === 0 ? 'WS' : 'RS'
}

/**
 * One chart row → the stitches in working order (see the comment at the top).
 * The input row is not changed.
 */
export function toWorkingOrder(chartRow: BitRow, side: Side): BitRow {
  if (side === 'RS') return [...chartRow].reverse()
  return chartRow.map(invert)
}

/**
 * Inverse of toWorkingOrder: what the worked stitches look like on the chart.
 * Reversing twice and inverting twice both give the original back.
 */
export function fromWorkingOrder(stitches: BitRow, side: Side): BitRow {
  if (side === 'RS') return [...stitches].reverse()
  return stitches.map(invert)
}

/** The whole chart as knitting rows, in knitting order (chart row 1 first). */
export function knittingRows(matrix: BitMatrix): KnittingRow[] {
  return matrix.map((chartRow, index) => {
    const number = index + 1
    const side = rowSide(number)
    const stitches = toWorkingOrder(chartRow, side)
    return { number, side, stitches, instruction: rowToShortestRLE(stitches) }
  })
}

/**
 * "Knits" the rows back into a chart, i.e. what the RS of the fabric shows.
 * Used to prove that knittingRows loses nothing: rowsToMatrix(knittingRows(m))
 * equals m. Each row carries its own side.
 */
export function rowsToMatrix(rows: KnittingRow[]): BitMatrix {
  return rows.map(row => fromWorkingOrder(row.stitches, row.side))
}

function invert(bit: Bit): Bit {
  return bit === 0 ? 1 : 0
}
