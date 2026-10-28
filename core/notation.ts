import { rleToRow } from './rle'
import type { BitRow } from './types'

/**
 * The two ways a single chart row can be written down by hand:
 *
 *   binary:   "01000110"            (0 = knit, 1 = purl)
 *   pattern:  "K1, P1, K3, P2, K1"  (run-length notation, see rle.ts)
 */

/** [0, 1, 0, 0, 0, 1, 1, 0] → "01000110" */
export function rowToBitString(row: BitRow): string {
  return row.join('')
}

/**
 * Reads one row written in either notation.
 *
 * A line that contains only 0, 1 and spaces is read as binary (spaces are
 * allowed so "0100 0110" works); anything else is read as a K/P pattern.
 * An empty line gives an empty row. Invalid patterns throw the error from
 * rleToRow, which names the bad stitch group.
 */
export function parseRow(line: string): BitRow {
  const trimmed = line.trim()
  if (trimmed === '') return []
  if (/^[01\s]+$/.test(trimmed)) {
    return Array.from(trimmed.replace(/\s/g, ''), digit => (digit === '1' ? 1 : 0))
  }
  return rleToRow(trimmed)
}
