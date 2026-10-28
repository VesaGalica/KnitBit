import { defineStore } from 'pinia'

/**
 * The chart currently open in the app.
 *
 * Cells are stored row by row in one flat Uint8Array
 * (index = row * width + col), 0 = K (knit), 1 = P (purl).
 * A flat typed array uses one byte per stitch and is cheap to copy
 * for the undo/redo history, which comes in a later phase.
 */
export const useChartStore = defineStore('chart', {
  state: () => ({
    width: 0,
    height: 0,
    cells: new Uint8Array(0),
  }),
})
