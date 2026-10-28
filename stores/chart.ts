import { defineStore } from 'pinia'
import { chartToMatrix, createChart, matrixToChart, resizeChart, toggleCell } from '../core/chart'
import type { FlatChart } from '../core/chart'
import type { BitMatrix } from '../core/types'

/** Size limits for the editor's width and height controls. */
export const MIN_SIZE = 1
export const MAX_WIDTH = 32
export const MAX_HEIGHT = 200

/** How many steps can be undone. Older steps are dropped. */
export const HISTORY_LIMIT = 100

/**
 * The chart currently open in the app (shared by the editor, and later the
 * knit tab).
 *
 * Cells are stored row by row in one flat Uint8Array
 * (index = row * width + col), 0 = K (knit), 1 = P (purl).
 *
 * Every edit replaces `cells` with a new array instead of changing it in
 * place, for two reasons:
 * - Vue cannot track writes inside a typed array, but it does see the
 *   property being replaced, so the chart re-renders.
 * - The old array is never changed again, so undo/redo can keep references
 *   to old charts without copying them.
 */
export const useChartStore = defineStore('chart', {
  state: () => ({
    ...createChart(8, 8),
    past: [] as FlatChart[],
    future: [] as FlatChart[],
  }),

  getters: {
    matrix: (state): BitMatrix => chartToMatrix(state),
    canUndo: state => state.past.length > 0,
    canRedo: state => state.future.length > 0,
  },

  actions: {
    toggle(row: number, col: number) {
      this.apply(toggleCell(this.current(), row, col))
    },

    resize(width: number, height: number) {
      const w = clamp(width, MIN_SIZE, MAX_WIDTH)
      const h = clamp(height, MIN_SIZE, MAX_HEIGHT)
      if (w === this.width && h === this.height) return
      this.apply(resizeChart(this.current(), w, h))
    },

    /** Sets every stitch to K. Does nothing (and adds no undo step) if it already is. */
    clear() {
      if (this.cells.every(cell => cell === 0)) return
      this.apply(createChart(this.width, this.height))
    },

    /** Replaces the chart, e.g. with one made on the encode page. Can be undone. */
    load(matrix: BitMatrix) {
      this.apply(matrixToChart(matrix))
    },

    undo() {
      const previous = this.past.pop()
      if (!previous) return
      this.future.push(this.current())
      this.show(previous)
    },

    redo() {
      const next = this.future.pop()
      if (!next) return
      this.past.push(this.current())
      this.show(next)
    },

    // ---- internal helpers ----

    current(): FlatChart {
      return { width: this.width, height: this.height, cells: this.cells }
    },

    /** Makes `next` the active chart and records the step for undo. */
    apply(next: FlatChart) {
      this.past.push(this.current())
      if (this.past.length > HISTORY_LIMIT) this.past.shift()
      // A new edit starts a new branch of history, so the old "redo" steps are gone.
      this.future = []
      this.show(next)
    },

    show(chart: FlatChart) {
      this.width = chart.width
      this.height = chart.height
      this.cells = chart.cells
    },
  },
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}
