import { rowToShortestRLE } from './rle'
import type { Bit, BitMatrix, BitRow } from './types'

/**
 * From chart to the rows a knitter actually works (thesis chapter 4).
 *
 * A chart shows the right side (RS) of the fabric: 0 = K, 1 = P as seen
 * from the front. Knitting it raises two questions the chart does not answer.
 *
 * 1. Which chart row is knitted first?
 *    Chart row 1 (the top row on screen) is knitted row 1, the first row
 *    after casting on. Row r of a chart is byte r of the text, generation r
 *    of an automaton or state r of a sort, so the knitter works through the
 *    computation forwards in time, and every page uses the same row numbers.
 *    The price: the finished fabric, held with the cast-on edge at the
 *    bottom, is the chart turned upside down. The knit page, the print sheet
 *    and the SVG download therefore draw the chart bottom-up, like the fabric.
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
 * Flat knitting turns the work after every row, so RS and WS rows alternate
 * (odd rows RS, even rows WS). Knitting in the round never turns the work,
 * so every row is an RS row.
 */

export type KnitMode = 'flat' | 'round'
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

/** Row 1 is always RS; in flat knitting every even row is WS. */
export function rowSide(number: number, mode: KnitMode): Side {
  return mode === 'flat' && number % 2 === 0 ? 'WS' : 'RS'
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
export function knittingRows(matrix: BitMatrix, mode: KnitMode): KnittingRow[] {
  return matrix.map((chartRow, index) => {
    const number = index + 1
    const side = rowSide(number, mode)
    const stitches = toWorkingOrder(chartRow, side)
    return { number, side, stitches, instruction: rowToShortestRLE(stitches) }
  })
}

/**
 * "Knits" the rows back into a chart, i.e. what the RS of the fabric shows.
 * Used to prove that knittingRows loses nothing: rowsToMatrix(knittingRows(m))
 * equals m. Each row carries its own side, so no mode is needed.
 */
export function rowsToMatrix(rows: KnittingRow[]): BitMatrix {
  return rows.map(row => fromWorkingOrder(row.stitches, row.side))
}

function invert(bit: Bit): Bit {
  return bit === 0 ? 1 : 0
}
