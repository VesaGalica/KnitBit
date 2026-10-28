import type { Bit, BitMatrix, BitRow } from './types'

/** Every row of an encoded chart holds exactly one byte. */
export const BITS_PER_BYTE = 8

/**
 * Encodes text as a knitting chart.
 *
 * The text is first converted to UTF-8 bytes, then every byte becomes one
 * row of 8 stitches, most significant bit first. UTF-8 (and not, for example,
 * Latin-1) is used because it is the web standard and it covers every
 * character; letters such as "ë" and "ç" simply take two bytes,
 * i.e. two rows.
 *
 * Example: "F" = 0x46 = 01000110 → [[0, 1, 0, 0, 0, 1, 1, 0]]
 */
export function textToMatrix(text: string): BitMatrix {
  const bytes = new TextEncoder().encode(text)
  return Array.from(bytes, byteToRow)
}

/**
 * Decodes a knitting chart back to text (inverse of textToMatrix).
 *
 * Throws if a row does not have exactly 8 stitches, if a cell is not 0 or 1,
 * or if the bytes are not valid UTF-8. Failing loudly is deliberate: a chart
 * with a wrong stitch should be reported, not silently turned into "�".
 */
export function matrixToText(matrix: BitMatrix): string {
  const bytes = Uint8Array.from(matrix, rowToByte)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

/** 70 → [0, 1, 0, 0, 0, 1, 1, 0] */
function byteToRow(byte: number): BitRow {
  const row: BitRow = []
  for (let i = BITS_PER_BYTE - 1; i >= 0; i--) {
    row.push(((byte >> i) & 1) as Bit)
  }
  return row
}

/** [0, 1, 0, 0, 0, 1, 1, 0] → 70 */
function rowToByte(row: BitRow, index: number): number {
  if (row.length !== BITS_PER_BYTE) {
    throw new Error(`Row ${index} has ${row.length} stitches, expected ${BITS_PER_BYTE}.`)
  }
  let byte = 0
  for (const bit of row) {
    if (bit !== 0 && bit !== 1) {
      throw new Error(`Row ${index} contains ${String(bit)}, expected only 0 or 1.`)
    }
    byte = (byte << 1) | bit
  }
  return byte
}
