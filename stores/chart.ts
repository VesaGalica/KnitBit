import { defineStore } from 'pinia'
import { chartToMatrix, createChart, matrixToChart, resizeChart, toggleCell } from '../core/chart'
import type { FlatChart } from '../core/chart'
import { addParity } from '../core/parity'
import type { SavedChart } from '../core/storage'
import type { BitMatrix } from '../core/types'

/** Size limits for the editor's width and height controls. */
export const MIN_SIZE = 1
export const MAX_WIDTH = 32
export const MAX_HEIGHT = 200

/** How many steps can be undone. Older steps are dropped. */
export const HISTORY_LIMIT = 100

/**
 * One entry of the undo/redo history: a chart plus whether its last row and
 * column are parity stitches. The flag is part of every step, so undoing
 * "Add parity" also turns the flag off again.
 */
export interface ChartSnapshot extends FlatChart {
  hasParity: boolean
}

/**
 * The chart currently open in the app (shared by the editor and the knit tab).
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
 *
 * `knitRow` is the knitter's place on the knit page. It is
 * not part of the undo history: moving to the next row is progress, not an
 * edit of the chart. A new chart (load) or a cleared chart starts at row 1;
 * any other change keeps the place, so fixing one stitch mid-way does not
 * send the knitter back to the start. If the chart gets shorter (resize,
 * undo), the row is moved to the new last row.
 */
export const useChartStore = defineStore('chart', {
  state: () => ({
    ...createChart(8, 8),
    /** True when the last row and column were added by addParity. */
    hasParity: false,
    /** Current row on the knit page, 1-based, always between 1 and height. */
    knitRow: 1,
    past: [] as ChartSnapshot[],
    future: [] as ChartSnapshot[],
  }),

  getters: {
    matrix: (state): BitMatrix => chartToMatrix(state),
    /** The chart without its parity row and column (the whole chart if there is no parity). */
    dataMatrix(): BitMatrix {
      if (!this.hasParity) return this.matrix
      return this.matrix.slice(0, -1).map(row => row.slice(0, -1))
    },
    canUndo: state => state.past.length > 0,
    canRedo: state => state.future.length > 0,
    /**
     * Resizing would move the parity row and column into the middle of the
     * chart, where they no longer protect anything, so it is blocked while
     * parity is on. Remove parity first, then resize.
     */
    canResize: state => !state.hasParity,
  },

  actions: {
    toggle(row: number, col: number) {
      this.apply(toggleCell(this.current(), row, col))
    },

    resize(width: number, height: number) {
      if (!this.canResize) return
      const w = clamp(width, MIN_SIZE, MAX_WIDTH)
      const h = clamp(height, MIN_SIZE, MAX_HEIGHT)
      if (w === this.width && h === this.height) return
      this.apply(resizeChart(this.current(), w, h))
    },

    /**
     * Sets every stitch to K. Does nothing (and adds no undo step) if it
     * already is. Keeps the parity flag: a chart of only K stitches has even
     * parity everywhere, so it is still a valid parity-protected chart.
     * Knitting starts again at row 1.
     */
    clear() {
      this.knitRow = 1
      if (this.cells.every(cell => cell === 0)) return
      this.apply(createChart(this.width, this.height))
    },

    /**
     * Replaces the chart, e.g. with one made on the encode page. Can be undone.
     * A new chart is knitted from row 1.
     */
    load(matrix: BitMatrix) {
      this.apply(matrixToChart(matrix), false)
      this.knitRow = 1
    },

    /**
     * Adds a parity column on the right and a parity row at the bottom
     * (see core/parity.ts), as one undoable step. The chart grows by one in
     * each direction, which may go past MAX_WIDTH / MAX_HEIGHT: those limits
     * only apply to the size controls.
     */
    addParity() {
      if (this.hasParity) return
      this.apply(matrixToChart(addParity(this.matrix)), true)
    },

    /** Removes the parity row and column again, as one undoable step. */
    removeParity() {
      if (!this.hasParity) return
      // resizeChart keeps the top-left part, so shrinking by one in each
      // direction drops exactly the last row and the last column.
      this.apply(resizeChart(this.current(), this.width - 1, this.height - 1), false)
    },

    /**
     * Shows a chart restored from storage when the app opens, together with
     * the knitter's place. It replaces the current chart without an undo step
     * and starts with an empty history, because the history is not saved.
     */
    restore(saved: SavedChart) {
      this.show(saved)
      this.knitRow = saved.knitRow
      this.past = []
      this.future = []
    },

    // ---- knit page ----

    /** Moves to the next row; stays on the last row. */
    nextRow() {
      this.knitRow = Math.min(this.knitRow + 1, this.height)
    },

    /** Moves to the previous row; stays on row 1. */
    previousRow() {
      this.knitRow = Math.max(this.knitRow - 1, 1)
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

    current(): ChartSnapshot {
      return { width: this.width, height: this.height, cells: this.cells, hasParity: this.hasParity }
    },

    /**
     * Makes `next` the active chart and records the step for undo.
     * `hasParity` defaults to the current flag, so ordinary edits keep it.
     */
    apply(next: FlatChart, hasParity?: boolean) {
      const nextHasParity = hasParity ?? this.hasParity
      this.past.push(this.current())
      if (this.past.length > HISTORY_LIMIT) this.past.shift()
      // A new edit starts a new branch of history, so the old "redo" steps are gone.
      this.future = []
      this.show({ ...next, hasParity: nextHasParity })
    },

    show(snapshot: ChartSnapshot) {
      this.width = snapshot.width
      this.height = snapshot.height
      this.cells = snapshot.cells
      this.hasParity = snapshot.hasParity
      // A shorter chart (resize, undo) must not leave the knitter past its end.
      this.knitRow = Math.max(1, Math.min(this.knitRow, snapshot.height))
    },
  },
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}
