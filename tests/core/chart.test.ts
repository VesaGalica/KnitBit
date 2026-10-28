import { describe, expect, it } from 'vitest'
import { chartToMatrix, createChart, matrixToChart, resizeChart, toggleCell } from '../../core/chart'
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

  it('keeps the top-left stitches when shrinking', () => {
    expect(chartToMatrix(resizeChart(matrixToChart(start), 2, 1))).toEqual([[1, 0]])
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
