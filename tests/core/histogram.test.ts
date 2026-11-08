import { describe, expect, it } from 'vitest'
import { statesToHistogram } from '../../core/histogram'
import { bubbleSortSteps, mergeSortSteps } from '../../core/sorting'

describe('statesToHistogram', () => {
  // Rows are in knitting order (row 1 first); the app draws row 1 at the
  // bottom, so a bar that starts in the first rows of a block rises upwards.
  it('draws each value as a bar from the first row of its block, one block per state', () => {
    expect(statesToHistogram([[2, 1], [1, 2]])).toEqual([
      [1, 1], // row 1, bottom of block 1: both bars
      [1, 0], // row 2: only the 2
      [0, 0], // separator
      [1, 1], // bottom of block 2
      [0, 1],
    ])
  })

  it('makes every block as high as the largest value', () => {
    expect(statesToHistogram([[3, 0, 1]])).toEqual([
      [1, 0, 1],
      [1, 0, 0],
      [1, 0, 0],
    ])
  })

  it('puts the start state first (at the cast-on edge) and the sorted list last (at the top)', () => {
    const chart = statesToHistogram(bubbleSortSteps([2, 1]).states) // [2, 1] → [1, 2]
    expect(chart.slice(0, 2)).toEqual([[1, 1], [1, 0]])
    expect(chart.slice(-2)).toEqual([[1, 1], [0, 1]])
  })

  it('gives every column as many P stitches per block as its value', () => {
    const values = [5, 1, 4, 2, 8]
    const block = statesToHistogram([values])
    values.forEach((value, col) => {
      expect(block.filter(row => row[col] === 1)).toHaveLength(value)
    })
  })

  it('has blocks × height + (blocks − 1) rows', () => {
    // 4 states of [5, 1, 4, 2, 8], each block 8 rows high, 3 separators.
    const chart = statesToHistogram(bubbleSortSteps([5, 1, 4, 2, 8]).states)
    expect(chart).toHaveLength(4 * 8 + 3)
    expect(chart.every(row => row.length === 5)).toBe(true)
  })

  it('makes the worst case longer with bubble sort than with merge sort', () => {
    const reversed = [8, 7, 6, 5, 4, 3, 2, 1]
    expect(statesToHistogram(bubbleSortSteps(reversed).states)).toHaveLength(8 * 8 + 7)
    expect(statesToHistogram(mergeSortSteps(reversed).states)).toHaveLength(4 * 8 + 3)
  })

  it('keeps a state of only zeros as a one-row block', () => {
    expect(statesToHistogram([[0, 0]])).toEqual([[0, 0]])
  })

  it('gives an empty chart for no states or no values', () => {
    expect(statesToHistogram([])).toEqual([])
    expect(statesToHistogram([[]])).toEqual([])
  })

  it('rejects states of different lengths and invalid values', () => {
    expect(() => statesToHistogram([[1, 2], [1]])).toThrow(/State 1 has 1 values/)
    expect(() => statesToHistogram([[1, -1]])).toThrow(/whole number/)
    expect(() => statesToHistogram([[1.5]])).toThrow(/whole number/)
  })
})
