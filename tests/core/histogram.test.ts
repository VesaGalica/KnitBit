import { describe, expect, it } from 'vitest'
import { statesToHistogram } from '../../core/histogram'
import { bubbleSortSteps, mergeSortSteps } from '../../core/sorting'

describe('statesToHistogram', () => {
  it('draws each value as a bar from the bottom, one block per state', () => {
    expect(statesToHistogram([[2, 1], [1, 2]])).toEqual([
      [1, 0],
      [1, 1],
      [0, 0], // separator
      [0, 1],
      [1, 1],
    ])
  })

  it('makes every block as high as the largest value', () => {
    expect(statesToHistogram([[3, 0, 1]])).toEqual([
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
    ])
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
