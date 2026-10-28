import { describe, expect, it } from 'vitest'
import { loadChart, parseSavedChart, saveChart, serializeChart } from '../../core/storage'
import type { KeyValueStorage, SavedChart } from '../../core/storage'
import { matrixToChart } from '../../core/chart'
import { addParity } from '../../core/parity'
import { textToMatrix } from '../../core/encoding'

const fiekChart: SavedChart = { ...matrixToChart(textToMatrix('FIEK')), hasParity: false }

/** Builds a saved-chart text with some fields replaced. */
function saved(overrides: Record<string, unknown>): string {
  return JSON.stringify({ ...JSON.parse(serializeChart(fiekChart)), ...overrides })
}

/** In-memory storage; `failing` makes every call throw like a blocked localStorage. */
function fakeStorage(failing = false): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => {
      if (failing) throw new Error('SecurityError')
      return data.get(key) ?? null
    },
    setItem: (key, value) => {
      if (failing) throw new Error('QuotaExceededError')
      data.set(key, value)
    },
  }
}

describe('serializeChart and parseSavedChart', () => {
  it('writes readable JSON with one character per stitch', () => {
    const text = serializeChart({ ...matrixToChart([[0, 1], [1, 1]]), hasParity: false })
    expect(JSON.parse(text)).toEqual({ version: 1, width: 2, height: 2, hasParity: false, cells: '0111' })
  })

  it('round trips a chart', () => {
    const back = parseSavedChart(serializeChart(fiekChart))!
    expect(back).toMatchObject({ width: 8, height: 4, hasParity: false })
    expect([...back.cells]).toEqual([...fiekChart.cells])
  })

  it('round trips a chart with parity', () => {
    const withParity: SavedChart = { ...matrixToChart(addParity(textToMatrix('FIEK'))), hasParity: true }
    const back = parseSavedChart(serializeChart(withParity))!
    expect(back).toMatchObject({ width: 9, height: 5, hasParity: true })
    expect([...back.cells]).toEqual([...withParity.cells])
  })
})

describe('parseSavedChart rejects broken data', () => {
  it.each([
    ['nothing saved', null],
    ['not JSON', '{"version":1,'],
    ['JSON but not an object', '42'],
    ['JSON null', 'null'],
    ['another format version', saved({ version: 2 })],
    ['a missing width', saved({ width: undefined })],
    ['a zero height', saved({ height: 0 })],
    ['a fractional width', saved({ width: 7.5 })],
    ['a width over the limit', saved({ width: 65, cells: '0'.repeat(65 * 4) })],
    ['a text width', saved({ width: '8' })],
    ['a missing parity flag', saved({ hasParity: undefined })],
    ['too few cells', saved({ cells: '0101' })],
    ['too many cells', saved({ cells: '0'.repeat(33) })],
    ['cells other than 0 and 1', saved({ cells: '2'.repeat(32) })],
    ['cells as an array', saved({ cells: Array(32).fill(0) })],
    ['parity on a 1-stitch-wide chart', saved({ width: 1, height: 32, hasParity: true })],
  ])('returns null for %s', (_, text) => {
    expect(parseSavedChart(text as string | null)).toBeNull()
  })
})

describe('loadChart and saveChart', () => {
  it('saves and loads through a storage', () => {
    const storage = fakeStorage()
    expect(saveChart(storage, 'chart', fiekChart)).toBe(true)
    expect([...loadChart(storage, 'chart')!.cells]).toEqual([...fiekChart.cells])
  })

  it('returns null when nothing is saved', () => {
    expect(loadChart(fakeStorage(), 'chart')).toBeNull()
  })

  it('does not throw when storage is blocked or full', () => {
    const storage = fakeStorage(true)
    expect(loadChart(storage, 'chart')).toBeNull()
    expect(saveChart(storage, 'chart', fiekChart)).toBe(false)
  })
})
