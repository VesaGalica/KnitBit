import { loadChart, saveChart } from '~~/core/storage'
import type { KeyValueStorage } from '~~/core/storage'
import type { useChartStore } from '~~/stores/chart'

/** localStorage key of the saved chart. Change SAVE_FORMAT_VERSION, not the key, for a new format. */
export const CHART_STORAGE_KEY = 'knitbit.chart'

type ChartStore = ReturnType<typeof useChartStore>

/**
 * window.localStorage, or null if the browser does not allow it. Even
 * reading the property can throw (e.g. Safari with all cookies blocked),
 * so it is wrapped here once.
 */
function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage
  }
  catch {
    return null
  }
}

/**
 * Puts the saved chart into the store, if there is a valid one.
 * Returns true if a chart was restored; otherwise the store keeps its
 * starting chart (empty 8×8).
 */
export function restoreChart(chart: ChartStore, storage = browserStorage()): boolean {
  if (!storage) return false
  const saved = loadChart(storage, CHART_STORAGE_KEY)
  if (!saved) return false
  chart.restore(saved)
  return true
}

/**
 * Saves the chart after every change. Only the chart and its parity flag are
 * saved, never the undo history. Returns the function that stops saving.
 */
export function startSavingChart(chart: ChartStore, storage = browserStorage()): () => void {
  if (!storage) return () => {}
  // `detached` keeps the subscription alive independent of any component.
  return chart.$subscribe((_mutation, state) => {
    saveChart(storage, CHART_STORAGE_KEY, {
      width: state.width,
      height: state.height,
      cells: state.cells,
      hasParity: state.hasParity,
    })
  }, { detached: true })
}
