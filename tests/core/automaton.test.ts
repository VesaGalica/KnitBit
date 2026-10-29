import { describe, expect, it } from 'vitest'
import { nextRow, ruleTable, runAutomaton } from '../../core/automaton'
import type { BitMatrix, BitRow } from '../../core/types'

/** "00100" → [0, 0, 1, 0, 0], so expected charts can be written as pictures. */
function rows(...lines: string[]): BitMatrix {
  return lines.map(line => Array.from(line, digit => (digit === '1' ? 1 : 0)))
}

describe('runAutomaton', () => {
  it('draws the Sierpinski triangle with rule 90 from one stitch', () => {
    expect(runAutomaton(90, 11, 5)).toEqual(rows(
      '00000100000',
      '00001010000',
      '00010001000',
      '00101010100',
      '01000000010',
    ))
  })

  it('gives the known first rows of rule 30', () => {
    expect(runAutomaton(30, 11, 5)).toEqual(rows(
      '00000100000',
      '00001110000',
      '00011001000',
      '00110111100',
      '01100100010',
    ))
  })

  it('gives only K after the first row with rule 0', () => {
    const chart = runAutomaton(0, 9, 6)
    expect(chart[0]).toEqual(rows('000010000')[0])
    expect(chart.slice(1).flat().every(bit => bit === 0)).toBe(true)
  })

  it('returns exactly the requested size', () => {
    const chart = runAutomaton(110, 31, 16)
    expect(chart).toHaveLength(16)
    expect(chart.every(row => row.length === 31)).toBe(true)
  })

  it('puts the start stitch at floor(width / 2) for an even width', () => {
    expect(runAutomaton(0, 4, 1)).toEqual(rows('0010'))
  })

  it('returns only the start row when rows is 1', () => {
    expect(runAutomaton(90, 5, 1)).toEqual(rows('00100'))
  })

  it('uses a given start row and does not change it', () => {
    const start: BitRow = [1, 0, 0, 0, 1]
    expect(runAutomaton(90, 5, 2, start)).toEqual(rows('10001', '01010'))
    expect(start).toEqual([1, 0, 0, 0, 1])
  })

  it('rejects invalid rule numbers', () => {
    for (const rule of [-1, 256, 3.5, Number.NaN]) {
      expect(() => runAutomaton(rule, 5, 3)).toThrow(/Invalid rule/)
    }
  })

  it('rejects an invalid width, number of rows or start row', () => {
    expect(() => runAutomaton(90, 0, 3)).toThrow(/width/)
    expect(() => runAutomaton(90, 5, 0)).toThrow(/rows/)
    expect(() => runAutomaton(90, 5, 3, [0, 1])).toThrow(/2 stitches, expected 5/)
    expect(() => runAutomaton(90, 2, 3, [0, 2 as 0])).toThrow(/only contain/)
  })
})

describe('nextRow', () => {
  it('treats the stitches outside the edges as K (no wrap around)', () => {
    // Rule 90: new stitch = left XOR right. With wrap around, the first
    // stitch would see the last one (P) and become P; with K edges it stays K.
    expect(nextRow(90, [0, 0, 0, 1])).toEqual([0, 0, 1, 0])
    // Rule 1 turns KKK into P, so the K outside the edges counts as well.
    expect(nextRow(1, [0, 0, 0])).toEqual([1, 1, 1])
    expect(nextRow(1, [1, 0, 0])).toEqual([0, 0, 1])
  })
})

describe('ruleTable', () => {
  it('lists the 8 cases from 111 to 000 and spells the rule in binary', () => {
    const table = ruleTable(90)
    expect(table.map(c => c.neighbourhood.join(''))).toEqual(
      ['111', '110', '101', '100', '011', '010', '001', '000'],
    )
    expect(table.map(c => c.result).join('')).toBe('01011010')
    expect(ruleTable(30).map(c => c.result).join('')).toBe('00011110')
  })

  it('rejects invalid rule numbers', () => {
    expect(() => ruleTable(300)).toThrow(/Invalid rule/)
  })
})
