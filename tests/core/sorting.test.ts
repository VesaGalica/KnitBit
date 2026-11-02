import { describe, expect, it } from 'vitest'
import { bubbleSortSteps, mergeSortSteps, parseSortInput } from '../../core/sorting'

const EXAMPLE = [5, 1, 4, 2, 8]
const WORST_CASE = [8, 7, 6, 5, 4, 3, 2, 1]

describe('bubbleSortSteps', () => {
  it('needs 3 passes for [5, 1, 4, 2, 8], the last one without swaps', () => {
    expect(bubbleSortSteps(EXAMPLE)).toEqual({
      states: [
        [5, 1, 4, 2, 8],
        [1, 4, 2, 5, 8],
        [1, 2, 4, 5, 8],
        [1, 2, 4, 5, 8],
      ],
      passes: 3,
      comparisons: 4 + 3 + 2,
    })
  })

  it('needs n - 1 passes for a reversed list', () => {
    const steps = bubbleSortSteps(WORST_CASE)
    expect(steps.passes).toBe(7)
    expect(steps.comparisons).toBe(7 + 6 + 5 + 4 + 3 + 2 + 1)
    expect(steps.states.at(-1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('stops after one pass for a sorted list', () => {
    expect(bubbleSortSteps([1, 2, 3]).passes).toBe(1)
  })

  it('handles empty and single-element input', () => {
    expect(bubbleSortSteps([])).toEqual({ states: [[]], passes: 0, comparisons: 0 })
    expect(bubbleSortSteps([4])).toEqual({ states: [[4]], passes: 0, comparisons: 0 })
  })

  it('does not change the input', () => {
    const input = [3, 1, 2]
    bubbleSortSteps(input)
    expect(input).toEqual([3, 1, 2])
  })
})

describe('mergeSortSteps', () => {
  it('needs 3 merge levels for [5, 1, 4, 2, 8]', () => {
    expect(mergeSortSteps(EXAMPLE)).toEqual({
      states: [
        [5, 1, 4, 2, 8],
        [1, 5, 2, 4, 8], // runs of 2 (the 8 has no partner yet)
        [1, 2, 4, 5, 8], // runs of 4
        [1, 2, 4, 5, 8], // one run: [1, 2, 4, 5] merged with [8]
      ],
      passes: 3,
      comparisons: 2 + 3 + 4,
    })
  })

  it('needs log2(8) = 3 levels for a reversed list of 8', () => {
    const steps = mergeSortSteps(WORST_CASE)
    expect(steps.passes).toBe(3)
    expect(steps.comparisons).toBe(4 + 4 + 4)
    expect(steps.states.at(-1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('handles empty and single-element input', () => {
    expect(mergeSortSteps([])).toEqual({ states: [[]], passes: 0, comparisons: 0 })
    expect(mergeSortSteps([4])).toEqual({ states: [[4]], passes: 0, comparisons: 0 })
  })

  it('does not change the input', () => {
    const input = [3, 1, 2]
    mergeSortSteps(input)
    expect(input).toEqual([3, 1, 2])
  })
})

describe('both sorts', () => {
  it('return the sorted array, also with repeated values', () => {
    for (const input of [EXAMPLE, WORST_CASE, [2, 2, 1, 2, 1], [7], []]) {
      const sorted = [...input].sort((a, b) => a - b)
      expect(bubbleSortSteps(input).states.at(-1)).toEqual(sorted)
      expect(mergeSortSteps(input).states.at(-1)).toEqual(sorted)
    }
  })
})

describe('parseSortInput', () => {
  it('reads numbers separated by commas and/or spaces', () => {
    expect(parseSortInput('5, 1, 4, 2, 8')).toEqual({ values: EXAMPLE, error: null })
    expect(parseSortInput(' 5 1,4 ,2  8 ')).toEqual({ values: EXAMPLE, error: null })
  })

  it('gives an empty list for empty text', () => {
    expect(parseSortInput('  ')).toEqual({ values: [], error: null })
  })

  it('rejects more than 8 numbers', () => {
    expect(parseSortInput('1 2 3 4 5 6 7 8 1').error).toMatch(/at most 8 numbers/)
  })

  it('rejects values outside 1–8 and anything that is not a whole number', () => {
    for (const bad of ['0', '9', '2.5', '-1', 'x']) {
      expect(parseSortInput(`1, ${bad}`).error).toBe(`"${bad}" is not a whole number from 1 to 8.`)
    }
  })
})
