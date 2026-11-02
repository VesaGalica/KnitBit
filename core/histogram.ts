import type { Bit, BitMatrix } from './types'

/**
 * Turns a list of array states (e.g. from sorting.ts) into one knitting chart.
 *
 * Every value is one column, drawn as a bar: a value v has P (1) in the
 * bottom v rows of its column, K (0) above. Every state becomes a block of
 * rows as high as the largest value, so all bars of all states share one
 * scale. Between two blocks there is one K row, so the rounds can be told
 * apart in the fabric.
 *
 *     states [[2, 1], [1, 2]]  →   1 0    block 1: [2, 1]
 *                                  1 1
 *                                  0 0    separator
 *                                  0 1    block 2: [1, 2]
 *                                  1 1
 *
 * Rows: blocks × height + (blocks − 1). Width: number of values.
 * Rows are listed top to bottom, like every chart in this app.
 */
export function statesToHistogram(states: readonly (readonly number[])[]): BitMatrix {
  if (states.length === 0) return []
  const width = states[0]!.length
  if (width === 0) return []

  states.forEach((state, s) => {
    if (state.length !== width) {
      throw new Error(`State ${s} has ${state.length} values, expected ${width}.`)
    }
    if (state.some(value => !Number.isInteger(value) || value < 0)) {
      throw new Error(`State ${s} has a value that is not a whole number of at least 0.`)
    }
  })

  // At least one row per block, so a state of only zeros is still visible
  // as a block (of K stitches) and the row formula above always holds.
  const height = Math.max(1, ...states.flat())
  const separator = (): Bit[] => Array.from({ length: width }, (): Bit => 0)

  const chart: BitMatrix = []
  states.forEach((state, s) => {
    if (s > 0) chart.push(separator())
    for (let r = 0; r < height; r++) {
      // Row r of the block is (height - r) rows from the bottom, so a value v
      // reaches it when v >= height - r.
      chart.push(state.map((value): Bit => (value >= height - r ? 1 : 0)))
    }
  })
  return chart
}
