import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { CHART_STORAGE_KEY, restoreChart, startSavingChart } from '../../app/utils/chartStorage'
import { useChartStore } from '../../stores/chart'
import { textToMatrix } from '../../core/encoding'

beforeEach(() => {
  localStorage.clear()
  // A fresh Pinia per test stands for a fresh app start ("reload").
  setActivePinia(createPinia())
})

describe('saving the chart', () => {
  it('a chart survives a reload', async () => {
    const before = useChartStore()
    const stop = startSavingChart(before)
    before.load(textToMatrix('FIEK'))
    before.addParity()
    before.toggle(1, 2)
    await nextTick() // the store's subscription runs after the change
    stop()

    // "Reload": new Pinia, new store, restore from localStorage.
    setActivePinia(createPinia())
    const after = useChartStore()
    expect(restoreChart(after)).toBe(true)

    expect(after.width).toBe(before.width)
    expect(after.height).toBe(before.height)
    expect(after.hasParity).toBe(true)
    expect(after.matrix).toEqual(before.matrix)
  })

  it('does not save or restore the undo history', async () => {
    const before = useChartStore()
    const stop = startSavingChart(before)
    before.toggle(0, 0)
    before.toggle(0, 1)
    await nextTick()
    stop()

    expect(localStorage.getItem(CHART_STORAGE_KEY)).not.toContain('past')

    setActivePinia(createPinia())
    const after = useChartStore()
    restoreChart(after)
    expect(after.canUndo).toBe(false)
    expect(after.canRedo).toBe(false)
  })

  it('starts with the empty 8×8 chart when nothing is saved', () => {
    const chart = useChartStore()
    expect(restoreChart(chart)).toBe(false)
    expect(chart.width).toBe(8)
    expect(chart.height).toBe(8)
  })

  it.each([
    ['not JSON', 'oops'],
    ['a wrong number of cells', '{"version":1,"width":8,"height":8,"hasParity":false,"cells":"0101"}'],
    ['an unknown version', '{"version":99,"width":1,"height":1,"hasParity":false,"cells":"1"}'],
  ])('falls back to the empty 8×8 chart for %s', (_, text) => {
    localStorage.setItem(CHART_STORAGE_KEY, text)
    const chart = useChartStore()
    expect(() => restoreChart(chart)).not.toThrow()
    expect(chart.width).toBe(8)
    expect(chart.height).toBe(8)
    expect(chart.matrix.flat().every(bit => bit === 0)).toBe(true)
  })

  it('keeps working when storage throws', () => {
    const blocked = {
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('QuotaExceededError') },
    } as unknown as Storage
    const chart = useChartStore()
    expect(restoreChart(chart, blocked)).toBe(false)
    startSavingChart(chart, blocked)
    expect(() => chart.toggle(0, 0)).not.toThrow()
  })
})
