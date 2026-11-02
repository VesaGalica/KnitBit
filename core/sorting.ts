/**
 * Sorting algorithms as a sequence of states (thesis chapter 4.5).
 *
 * Each function records the array after every round of work, so the rounds
 * can be knitted one after another (see histogram.ts). `states[0]` is always
 * the input, then one state per round, so `passes = states.length - 1`.
 * The input array is never changed.
 */

export interface SortSteps {
  /** The input, followed by the array after each pass (or merge level). */
  states: number[][]
  /** Number of passes (bubble sort) or merge levels (merge sort). */
  passes: number
  /** How many times two values were compared. */
  comparisons: number
}

/**
 * Bubble sort, one state per pass.
 *
 * A pass walks through the array and swaps every neighbouring pair that is in
 * the wrong order. After pass k the k largest values are at the end, so each
 * pass compares one pair fewer than the one before.
 *
 * Early exit: a pass without any swap proves the array is sorted, so the sort
 * stops there. That last pass still counts (and gets a state), because its
 * comparisons were really made; in the fabric it is a block that looks the
 * same as the one before it.
 *
 * [5, 1, 4, 2, 8] → 3 passes: [1, 4, 2, 5, 8], [1, 2, 4, 5, 8], then one pass
 * without swaps. 4 + 3 + 2 = 9 comparisons.
 */
export function bubbleSortSteps(values: readonly number[]): SortSteps {
  const array = [...values]
  const states = [[...array]]
  let comparisons = 0

  for (let end = array.length - 1; end > 0; end--) {
    let swapped = false
    for (let i = 0; i < end; i++) {
      comparisons++
      if (array[i]! > array[i + 1]!) {
        [array[i], array[i + 1]] = [array[i + 1]!, array[i]!]
        swapped = true
      }
    }
    states.push([...array])
    if (!swapped) break
  }

  return { states, passes: states.length - 1, comparisons }
}

/**
 * Merge sort, bottom-up, one state per merge level.
 *
 * Level 1 merges neighbouring runs of 1 value into sorted runs of 2, level 2
 * merges runs of 2 into runs of 4, and so on, until one run covers the whole
 * array. This needs ceil(log2(n)) levels. The usual top-down (recursive)
 * version does the same merges, but in an order where a "level" is not one
 * moment in time; bottom-up gives exactly one array state per level.
 *
 * A run without a partner at the end of the array (e.g. the 8 in
 * [5, 1, 4, 2, 8] at level 1) is left as it is until a later level.
 */
export function mergeSortSteps(values: readonly number[]): SortSteps {
  let array = [...values]
  const states = [[...array]]
  let comparisons = 0

  for (let size = 1; size < array.length; size *= 2) {
    const next: number[] = []
    for (let start = 0; start < array.length; start += 2 * size) {
      const left = array.slice(start, start + size)
      const right = array.slice(start + size, start + 2 * size)
      const merged = merge(left, right)
      comparisons += merged.comparisons
      next.push(...merged.values)
    }
    array = next
    states.push([...array])
  }

  return { states, passes: states.length - 1, comparisons }
}

/**
 * Merges two sorted runs into one. Compares the first values of both runs
 * and takes the smaller one until one run is empty; the rest of the other run
 * is copied without comparing. `<=` takes from the left run on a tie, so equal
 * values keep their order (the sort is stable).
 */
function merge(left: number[], right: number[]): { values: number[], comparisons: number } {
  const values: number[] = []
  let comparisons = 0
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    comparisons++
    if (left[i]! <= right[j]!) values.push(left[i++]!)
    else values.push(right[j++]!)
  }
  values.push(...left.slice(i), ...right.slice(j))
  return { values, comparisons }
}

/** Limits for the sorting input on the algorithms page. */
export const MAX_SORT_VALUES = 8
export const MIN_SORT_VALUE = 1
export const MAX_SORT_VALUE = 8

export type SortInput = { values: number[], error: null } | { values: null, error: string }

/**
 * Reads a list typed by hand, e.g. "5, 1, 4, 2, 8" or "5 1 4 2 8".
 * Values must be whole numbers from 1 to 8 and there may be at most 8 of
 * them, so one state fits a block of at most 8 × 8 stitches. Empty text gives
 * an empty list.
 */
export function parseSortInput(text: string): SortInput {
  const parts = text.split(/[\s,]+/).filter(part => part !== '')
  if (parts.length > MAX_SORT_VALUES) {
    return { values: null, error: `Enter at most ${MAX_SORT_VALUES} numbers, this list has ${parts.length}.` }
  }
  const values: number[] = []
  for (const part of parts) {
    const value = Number(part)
    if (!/^\d+$/.test(part) || value < MIN_SORT_VALUE || value > MAX_SORT_VALUE) {
      return { values: null, error: `"${part}" is not a whole number from ${MIN_SORT_VALUE} to ${MAX_SORT_VALUE}.` }
    }
    values.push(value)
  }
  return { values, error: null }
}
