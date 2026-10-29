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
 * Like rowToRLE, but writes a row that is one group of stitches repeated
 * the way knitting patterns do: [0, 0, 1, 1, 0, 0, 1, 1] → "[K2, P2] x2".
 *
 * It looks for the shortest group that, repeated a whole number of times
 * (at least twice), gives exactly the row. A group of only one stitch type
 * is skipped, because plain RLE already says it shorter ("K8", not
 * "[K1] x8"). If no such group exists, for example when the pattern does
 * not fit the row evenly ([0, 1, 0, 1, 0]), the plain rowToRLE result is
 * returned.
 */
export function rowToRepeatedRLE(row: BitRow): string {
  const length = row.length
  // Groups longer than half the row cannot repeat twice.
  for (let size = 1; size <= length / 2; size++) {
    if (length % size !== 0) continue
    const group = row.slice(0, size)
    if (!group.includes(0) || !group.includes(1)) continue
    if (row.every((bit, index) => bit === group[index % size])) {
      return `[${rowToRLE(group)}] x${length / size}`
    }
  }
  return rowToRLE(row)
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

/**
 * "[K2, P2] x2" → [0, 0, 1, 1, 0, 0, 1, 1] (inverse of rowToRepeatedRLE)
 *
 * Only a whole line in the form "[group] xN" is read, because that is the
 * only repeat rowToRepeatedRLE writes. A repeat inside a longer line, such as
 * "K1, [K2, P2] x2, K1", is not supported. Like rleToRow, it accepts lower
 * case and extra spaces, and both "x" and the multiplication sign "×", since
 * printed patterns use either. The group itself is read by rleToRow, so its
 * errors name the bad stitch group.
 */
export function repeatedRleToRow(text: string): BitRow {
  const match = /^\[(.*)\]\s*[x×]\s*(\d+)$/i.exec(text.trim())
  if (!match) {
    throw new Error(`Invalid repeat "${text.trim()}", expected e.g. "[K2, P2] x2".`)
  }
  const group = rleToRow(match[1]!)
  const times = Number(match[2])
  if (group.length === 0 || times === 0) {
    throw new Error(`Invalid repeat "${text.trim()}", the group and the count must not be empty or 0.`)
  }
  return Array.from({ length: times }, () => group).flat()
}
