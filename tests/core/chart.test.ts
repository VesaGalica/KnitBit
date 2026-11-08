import { describe, expect, it } from 'vitest'
import { chartToMatrix, createChart, matrixToChart, purlsRemovedByResize, resizeChart, toggleCell } from '../../core/chart'
import { textToMatrix } from '../../core/encoding'
import type { BitMatrix } from '../../core/types'

describe('createChart', () => {
  it('creates a chart of K stitches', () => {
    const chart = createChart(3, 2)
    expect(chart.width).toBe(3)
    expect(chart.height).toBe(2)
    expect([...chart.cells]).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('rejects negative or fractional sizes', () => {
    expect(() => createChart(-1, 2)).toThrow(/Invalid chart size/)
    expect(() => createChart(2.5, 2)).toThrow(/Invalid chart size/)
  })
})

describe('matrixToChart and chartToMatrix', () => {
  it('stores rows one after another', () => {
    const chart = matrixToChart([[0, 1], [1, 1]])
    expect(chart).toMatchObject({ width: 2, height: 2 })
    expect([...chart.cells]).toEqual([0, 1, 1, 1])
  })

  it('round trips an encoded text', () => {
    const matrix = textToMatrix('Noël')
    expect(chartToMatrix(matrixToChart(matrix))).toEqual(matrix)
  })

  it('handles a single cell', () => {
    expect(chartToMatrix(matrixToChart([[1]]))).toEqual([[1]])
  })

  it('handles an empty chart', () => {
    const chart = matrixToChart([])
    expect(chart).toMatchObject({ width: 0, height: 0 })
    expect(chartToMatrix(chart)).toEqual([])
  })

  it('rejects rows of different lengths', () => {
    expect(() => matrixToChart([[0, 1], [1]])).toThrow(/Row 1 has 1 stitches/)
  })
})

describe('toggleCell', () => {
  it('flips one stitch', () => {
    const chart = toggleCell(createChart(2, 2), 1, 0)
    expect(chartToMatrix(chart)).toEqual([[0, 0], [1, 0]])
  })

  it('flips back on a second toggle', () => {
    const start = matrixToChart([[1, 0]])
    expect(chartToMatrix(toggleCell(toggleCell(start, 0, 0), 0, 0))).toEqual([[1, 0]])
  })

  it('does not change the input chart', () => {
    const start = createChart(2, 1)
    toggleCell(start, 0, 1)
    expect([...start.cells]).toEqual([0, 0])
  })

  it('rejects a cell outside the chart', () => {
    expect(() => toggleCell(createChart(2, 2), 2, 0)).toThrow(/outside/)
    expect(() => toggleCell(createChart(2, 2), 0, -1)).toThrow(/outside/)
  })
})

describe('resizeChart', () => {
  const start: BitMatrix = [
    [1, 0, 1],
    [0, 1, 0],
  ]

  // Row 1 is drawn at the bottom, so row 1, stitch 1 is the cast-on corner (bottom left).
  it('keeps the cast-on corner (row 1, stitch 1) when shrinking', () => {
    expect(chartToMatrix(resizeChart(matrixToChart(start), 2, 1))).toEqual([[1, 0]])
  })

  it('adds new rows after the last row (drawn at the top) and keeps row 1', () => {
    const grown = chartToMatrix(resizeChart(matrixToChart(start), 3, 3))
    expect(grown[0]).toEqual(start[0])
    expect(grown[2]).toEqual([0, 0, 0])
  })

  it('adds K stitches when growing', () => {
    expect(chartToMatrix(resizeChart(matrixToChart(start), 4, 3))).toEqual([
      [1, 0, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ])
  })

  it('gives the original back after growing and shrinking', () => {
    const grown = resizeChart(matrixToChart(start), 5, 4)
    expect(chartToMatrix(resizeChart(grown, 3, 2))).toEqual(start)
  })
})

describe('purlsRemovedByResize', () => {
  const fiek = matrixToChart(textToMatrix('FIEK'))

  it('counts the P stitches outside the kept part (FIEK at width 4)', () => {
    // Stitches 5–8: F 0110, I 1001, E 0101, K 1011 → 2 + 2 + 2 + 3 P stitches.
    expect(purlsRemovedByResize(fiek, 4, 4)).toBe(9)
  })

  it('counts removed rows too (FIEK at height 2 drops E and K)', () => {
    // E 01000101 has 3 P, K 01001011 has 4.
    expect(purlsRemovedByResize(fiek, 8, 2)).toBe(7)
  })

  it('is 0 when growing or when only K stitches are dropped', () => {
    expect(purlsRemovedByResize(fiek, 10, 6)).toBe(0)
    expect(purlsRemovedByResize(createChart(8, 8), 2, 2)).toBe(0)
  })

  it('matches the difference in P stitches before and after resizeChart', () => {
    const purls = (cells: Uint8Array) => cells.filter(cell => cell === 1).length
    const resized = resizeChart(fiek, 5, 3)
    expect(purlsRemovedByResize(fiek, 5, 3)).toBe(purls(fiek.cells) - purls(resized.cells))
  })
})
