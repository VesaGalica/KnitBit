import { repeatedRleToRow, rleToRow } from './rle'
import type { BitRow } from './types'

/**
 * The two ways a single chart row can be written down by hand:
 *
 *   binary:   "01000110"            (0 = knit, 1 = purl)
 *   pattern:  "K1, P1, K3, P2, K1"  (run-length notation, see rle.ts)
 *   repeat:   "[K2, P2] x2"         (a pattern repeated over the whole row)
 */

/** [0, 1, 0, 0, 0, 1, 1, 0] → "01000110" */
export function rowToBitString(row: BitRow): string {
  return row.join('')
}

/**
 * Reads one row written in any of the notations above.
 *
 * A line that contains only 0, 1 and spaces is read as binary (spaces are
 * allowed so "0100 0110" works). A line that starts with "[" is read as a
 * repeat; anything else is read as a K/P pattern.
 * An empty line gives an empty row. Invalid patterns throw the error from
 * rleToRow or repeatedRleToRow, which names the bad part.
 */
export function parseRow(line: string): BitRow {
  const trimmed = line.trim()
  if (trimmed === '') return []
  if (/^[01\s]+$/.test(trimmed)) {
    return Array.from(trimmed.replace(/\s/g, ''), digit => (digit === '1' ? 1 : 0))
  }
  if (trimmed.startsWith('[')) return repeatedRleToRow(trimmed)
  return rleToRow(trimmed)
}
