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

/** One byte of the encoded text, with the character it belongs to. */
export interface ByteInfo {
  byte: number
  /** The character this byte is part of, e.g. "ë". */
  char: string
  /** Position of this byte inside the character, starting at 1. */
  part: number
  /** How many bytes the character needs in UTF-8 (1 to 4). */
  parts: number
}

/**
 * Lists the UTF-8 bytes of a text together with the character each byte
 * belongs to. The result has one entry per chart row, in the same order as
 * textToMatrix, so the UI can label every row ("ë 1/2", "ë 2/2").
 *
 * The loop uses for...of, which walks the text by Unicode code point, so a
 * character outside the basic range (e.g. an emoji, 4 bytes) stays one
 * character instead of being split into two UTF-16 halves.
 */
export function textToBytes(text: string): ByteInfo[] {
  const encoder = new TextEncoder()
  const result: ByteInfo[] = []
  for (const char of text) {
    const bytes = encoder.encode(char)
    bytes.forEach((byte, index) => {
      result.push({ byte, char, part: index + 1, parts: bytes.length })
    })
  }
  return result
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
