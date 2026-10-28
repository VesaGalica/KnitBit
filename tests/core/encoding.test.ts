import { describe, expect, it } from 'vitest'
import { matrixToText, textToMatrix } from '../../core/encoding'

describe('textToMatrix', () => {
  it('encodes "F" as 01000110', () => {
    expect(textToMatrix('F')).toEqual([[0, 1, 0, 0, 0, 1, 1, 0]])
  })

  it('uses one 8-stitch row per byte', () => {
    const matrix = textToMatrix('FIEK')
    expect(matrix).toHaveLength(4)
    for (const row of matrix) expect(row).toHaveLength(8)
  })

  it('encodes "ë" as two UTF-8 bytes (0xC3 0xAB)', () => {
    expect(textToMatrix('ë')).toEqual([
      [1, 1, 0, 0, 0, 0, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 1],
    ])
  })

  it('encodes the empty string as an empty chart', () => {
    expect(textToMatrix('')).toEqual([])
  })
})

describe('matrixToText', () => {
  it.each(['Noël', 'façade', 'FIEK', 'Ç Ë', 'a'])('round trips "%s"', (text) => {
    expect(matrixToText(textToMatrix(text))).toBe(text)
  })

  it('decodes an empty chart as the empty string', () => {
    expect(matrixToText([])).toBe('')
  })

  it('throws when a row does not have 8 stitches', () => {
    expect(() => matrixToText([[0, 1, 0]])).toThrow(/Row 0 has 3 stitches/)
  })

  it('throws on bytes that are not valid UTF-8', () => {
    // 0xC3 starts a two-byte character but nothing follows it.
    expect(() => matrixToText([[1, 1, 0, 0, 0, 0, 1, 1]])).toThrow()
  })
})
