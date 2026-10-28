import { useChartStore } from '~~/stores/chart'

/**
 * Keeps the editor's chart across reloads: restores the saved chart when the
 * app starts, then saves it after every change (see app/utils/chartStorage.ts).
 * ".client" because localStorage only exists in the browser.
 */
export default defineNuxtPlugin(() => {
  const chart = useChartStore()
  restoreChart(chart)
  startSavingChart(chart)
})
