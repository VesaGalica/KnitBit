import { describe, expect, it } from 'vitest'
import { textToMatrix } from '../../core/encoding'
import { fromWorkingOrder, knittingRows, rowSide, rowsToMatrix, toWorkingOrder } from '../../core/rows'
import type { BitMatrix } from '../../core/types'

/** A chart where every row is different and no row reads the same backwards. */
const SAMPLE: BitMatrix = [
  [0, 0, 0, 1],
  [0, 1, 1, 1],
  [1, 0, 0, 0],
]

describe('rowSide', () => {
  it('alternates RS and WS in flat knitting, starting with RS', () => {
    expect([1, 2, 3, 4].map(n => rowSide(n, 'flat'))).toEqual(['RS', 'WS', 'RS', 'WS'])
  })

  it('makes every row RS in the round', () => {
    expect([1, 2, 3, 4].map(n => rowSide(n, 'round'))).toEqual(['RS', 'RS', 'RS', 'RS'])
  })
})

describe('toWorkingOrder', () => {
  it('reads an RS row right to left without changing the stitches', () => {
    expect(toWorkingOrder([0, 0, 0, 1], 'RS')).toEqual([1, 0, 0, 0])
  })

  it('reads a WS row left to right and swaps every stitch (K ↔ P)', () => {
    expect(toWorkingOrder([0, 0, 0, 1], 'WS')).toEqual([1, 1, 1, 0])
  })

  it('does not change the chart row it is given', () => {
    const row = [0, 1, 1] as const
    const copy = [...row]
    toWorkingOrder([...row], 'RS')
    expect(row).toEqual(copy)
  })

  it('is undone by fromWorkingOrder on both sides', () => {
    const row = [0, 1, 1, 0, 1] as const
    expect(fromWorkingOrder(toWorkingOrder([...row], 'RS'), 'RS')).toEqual(row)
    expect(fromWorkingOrder(toWorkingOrder([...row], 'WS'), 'WS')).toEqual(row)
  })
})

describe('knittingRows', () => {
  it('reverses an RS row and inverts a WS row in flat knitting', () => {
    const rows = knittingRows(SAMPLE, 'flat')
    expect(rows.map(row => row.side)).toEqual(['RS', 'WS', 'RS'])
    expect(rows[0]!.stitches).toEqual([1, 0, 0, 0]) // reversed
    expect(rows[1]!.stitches).toEqual([1, 0, 0, 0]) // same direction, inverted
    expect(rows[2]!.stitches).toEqual([0, 0, 0, 1]) // reversed
  })

  it('works every row in the same direction in the round, never inverting', () => {
    const rows = knittingRows(SAMPLE, 'round')
    expect(rows.every(row => row.side === 'RS')).toBe(true)
    rows.forEach((row, index) => {
      expect(row.stitches).toEqual([...SAMPLE[index]!].reverse())
    })
  })

  it('numbers rows from 1 in chart order (chart row 1 is knitted first)', () => {
    expect(knittingRows(SAMPLE, 'flat').map(row => row.number)).toEqual([1, 2, 3])
  })

  it('writes the shortest instruction of the working order', () => {
    const rows = knittingRows([[0, 0, 1, 1, 0, 0, 1, 1], [0, 1, 1, 0, 0, 0, 0, 0]], 'flat')
    // RS, reversed: 11001100 → plain "P2, K2, P2, K2" is longer than the repeat.
    expect(rows[0]!.instruction).toBe('[P2, K2] x2')
    // WS, inverted: 10011111 → no repeat fits, so plain RLE.
    expect(rows[1]!.instruction).toBe('P1, K2, P5')
  })

  it('gives the original chart back when the rows are knitted (both modes)', () => {
    for (const mode of ['flat', 'round'] as const) {
      expect(rowsToMatrix(knittingRows(SAMPLE, mode))).toEqual(SAMPLE)
    }
  })

  it('gives the original chart back for every 2-row chart of width 3', () => {
    // 2^6 = 64 charts: every combination of stitches, both sides of a flat pair.
    for (let n = 0; n < 64; n++) {
      const bits = Array.from({ length: 6 }, (_, i) => ((n >> i) & 1) as 0 | 1)
      const chart: BitMatrix = [bits.slice(0, 3), bits.slice(3)]
      expect(rowsToMatrix(knittingRows(chart, 'flat'))).toEqual(chart)
      expect(rowsToMatrix(knittingRows(chart, 'round'))).toEqual(chart)
    }
  })

  it('handles an empty chart and a single row', () => {
    expect(knittingRows([], 'flat')).toEqual([])
    expect(knittingRows([[1]], 'flat')).toEqual([
      { number: 1, side: 'RS', stitches: [1], instruction: 'P1' },
    ])
  })
})

describe('knittingRows – worked example "FIEK" (flat)', () => {
  const rows = knittingRows(textToMatrix('FIEK'), 'flat')

  it('gives the knitting instructions of the thesis example', () => {
    expect(rows.map(row => [row.number, row.side, row.stitches.join(''), row.instruction])).toEqual([
      [1, 'RS', '01100010', 'K1, P2, K3, P1, K1'], // F 01000110, reversed
      [2, 'WS', '10110110', 'P1, K1, P2, K1, P2, K1'], // I 01001001, inverted
      [3, 'RS', '10100010', 'P1, K1, P1, K3, P1, K1'], // E 01000101, reversed
      [4, 'WS', '10110100', 'P1, K1, P2, K1, P1, K2'], // K 01001011, inverted
    ])
  })

  it('knits back to the chart of "FIEK"', () => {
    expect(rowsToMatrix(rows)).toEqual(textToMatrix('FIEK'))
  })
})
