import type { Bit, BitRow } from './types'

/**
 * Run-length encoding of a chart row, written the way knitting patterns are:
 * "K2, P2" means "knit 2, purl 2". 0 = K (knit), 1 = P (purl).
 */

const SYMBOL: Record<Bit, string> = { 0: 'K', 1: 'P' }

/**
 * [0, 0, 1, 1, 0, 0, 1, 1] → "K2, P2, K2, P2"
 * An empty row gives an empty string.
 */
export function rowToRLE(row: BitRow): string {
  const runs: string[] = []
  let i = 0
  while (i < row.length) {
    const bit = row[i]!
    let count = 1
    while (i + count < row.length && row[i + count] === bit) count++
    runs.push(`${SYMBOL[bit]}${count}`)
    i += count
  }
  return runs.join(', ')
}

/**
 * "K2, P2, K2, P2" → [0, 0, 1, 1, 0, 0, 1, 1] (inverse of rowToRLE)
 *
 * Accepts lower case and extra spaces ("k2,p2" works too), because people
 * will type this by hand. Anything else throws, with the bad part in the
 * message, so the UI can show the user what to fix.
 */
export function rleToRow(rle: string): BitRow {
  const trimmed = rle.trim()
  if (trimmed === '') return []

  const row: BitRow = []
  for (const part of trimmed.split(',')) {
    const match = /^([KP])(\d+)$/i.exec(part.trim())
    if (!match) {
      throw new Error(`Invalid stitch group "${part.trim()}", expected e.g. "K3" or "P2".`)
    }
    const bit: Bit = match[1]!.toUpperCase() === 'K' ? 0 : 1
    const count = Number(match[2])
    if (count === 0) {
      throw new Error(`Invalid stitch group "${part.trim()}", the count must be at least 1.`)
    }
    for (let k = 0; k < count; k++) row.push(bit)
  }
  return row
}
