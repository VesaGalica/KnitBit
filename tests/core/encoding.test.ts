import { describe, expect, it } from 'vitest'
import { matrixToText, textToBytes, textToMatrix } from '../../core/encoding'

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

describe('textToBytes', () => {
  it('gives one entry per byte, in the same order as textToMatrix', () => {
    const text = 'Noël'
    const infos = textToBytes(text)
    expect(infos).toHaveLength(textToMatrix(text).length)
    expect(infos.map(info => info.byte)).toEqual([...new TextEncoder().encode(text)])
  })

  it('labels a one-byte character as part 1 of 1', () => {
    expect(textToBytes('F')).toEqual([{ byte: 0x46, char: 'F', part: 1, parts: 1 }])
  })

  it('labels both bytes of "ë" with their position', () => {
    expect(textToBytes('ë')).toEqual([
      { byte: 0xc3, char: 'ë', part: 1, parts: 2 },
      { byte: 0xab, char: 'ë', part: 2, parts: 2 },
    ])
  })

  it('keeps a 4-byte character (emoji) together', () => {
    const infos = textToBytes('🧶')
    expect(infos).toHaveLength(4)
    expect(infos.every(info => info.char === '🧶' && info.parts === 4)).toBe(true)
  })

  it('returns an empty list for the empty string', () => {
    expect(textToBytes('')).toEqual([])
  })
})
