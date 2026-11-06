import { repeatedRleToRow, rleToRow } from './rle'
import type { BitRow } from './types'

/**
 * The ways a single chart row can be written down by hand:
 *
 *   binary:   "01000110"            (0 = knit, 1 = purl)
 *   pattern:  "K1, P1, K3, P2, K1"  (run-length notation, see rle.ts)
 *   repeat:   "[K2, P2] x2"         (a group of stitches repeated)
 *   mixed:    "[K1, P1] x3, K2"     (groups and repeats, comma-separated)
 */

/**
 * Thrown by parseRow for a line that starts with a digit (so it is meant as
 * binary) but contains something other than 0 and 1, e.g. the letter O in
 * "0100011O". A separate class so the encode page can say "a row must be
 * 8 digits of 0 and 1" instead of a K/P error that would not make sense.
 */
export class BinaryRowError extends Error {
  /** The first character that is not 0, 1 or a space. */
  readonly invalid: string

  constructor(invalid: string) {
    super(`A binary row may only contain the digits 0 and 1; "${invalid}" is not one of them.`)
    this.name = 'BinaryRowError'
    this.invalid = invalid
  }
}

/** [0, 1, 0, 0, 0, 1, 1, 0] → "01000110" */
export function rowToBitString(row: BitRow): string {
  return row.join('')
}

/**
 * Reads one row written in any of the notations above.
 *
 * - A line that starts with a digit is binary: only 0, 1 and spaces are
 *   allowed (spaces so "0100 0110" works); anything else throws a
 *   BinaryRowError naming the bad character.
 * - Anything else is a K/P line: parts separated by commas, each part a
 *   stitch group ("K3") or a repeat ("[K1, P1] x3"). Commas inside the
 *   brackets belong to the repeat, so the line is split only at commas
 *   outside brackets. Nested repeats are not supported.
 *
 * An empty line gives an empty row. Invalid parts throw the error from
 * rleToRow or repeatedRleToRow, which names the bad part.
 */
export function parseRow(line: string): BitRow {
  const trimmed = line.trim()
  if (trimmed === '') return []
  if (/^\d/.test(trimmed)) {
    const invalid = /[^01\s]/.exec(trimmed)
    if (invalid) throw new BinaryRowError(invalid[0])
    return Array.from(trimmed.replace(/\s/g, ''), digit => (digit === '1' ? 1 : 0))
  }
  return splitOutsideBrackets(trimmed).flatMap((part) => {
    // rleToRow('') is an empty row, so an empty part ("K1,, K2" or a comma
    // at the end) would vanish silently; it is a typo, so say so.
    if (part === '') throw new Error(`Invalid stitch group "", expected e.g. "K3" or "P2" between the commas.`)
    return part.startsWith('[') ? repeatedRleToRow(part) : rleToRow(part)
  })
}

/**
 * "[K1, P1] x3, K2" → ["[K1, P1] x3", "K2"]: splits at commas that are not
 * inside square brackets. Throws for unbalanced or nested brackets, so a
 * typo is reported instead of being read as something else.
 */
function splitOutsideBrackets(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '[') {
      if (depth > 0) throw new Error(`Nested repeats are not supported: "${text}".`)
      depth++
    }
    else if (char === ']') {
      if (depth === 0) throw new Error(`"]" without a matching "[" in "${text}".`)
      depth--
    }
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    }
    else {
      current += char
    }
  }
  if (depth > 0) throw new Error(`"[" without a matching "]" in "${text}".`)
  parts.push(current.trim())
  return parts
}
