import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { HISTORY_LIMIT, MAX_WIDTH, useChartStore } from '../../stores/chart'
import { textToMatrix } from '../../core/encoding'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('chart store', () => {
  it('starts with an empty 8×8 chart and no history', () => {
    const store = useChartStore()
    expect(store.width).toBe(8)
    expect(store.height).toBe(8)
    expect(store.matrix.flat().every(bit => bit === 0)).toBe(true)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
  })

  it('toggles a stitch and shows it in the matrix', () => {
    const store = useChartStore()
    store.toggle(1, 2)
    expect(store.matrix[1]![2]).toBe(1)
    expect(store.canUndo).toBe(true)
  })

  it('undoes and redoes a toggle', () => {
    const store = useChartStore()
    store.toggle(0, 0)
    store.undo()
    expect(store.matrix[0]![0]).toBe(0)
    expect(store.canRedo).toBe(true)
    store.redo()
    expect(store.matrix[0]![0]).toBe(1)
  })

  it('undoes several steps in reverse order', () => {
    const store = useChartStore()
    store.toggle(0, 0)
    store.toggle(0, 1)
    store.resize(4, 2)
    store.undo()
    expect(store.width).toBe(8)
    store.undo()
    expect(store.matrix[0]!.slice(0, 2)).toEqual([1, 0])
    store.undo()
    expect(store.matrix[0]![0]).toBe(0)
    expect(store.canUndo).toBe(false)
  })

  it('drops the redo steps after a new edit', () => {
    const store = useChartStore()
    store.toggle(0, 0)
    store.undo()
    store.toggle(1, 1)
    expect(store.canRedo).toBe(false)
  })

  it('does nothing when there is nothing to undo or redo', () => {
    const store = useChartStore()
    store.undo()
    store.redo()
    expect(store.width).toBe(8)
    expect(store.canUndo).toBe(false)
  })

  it('keeps stitches when resizing and clamps the size to the limits', () => {
    const store = useChartStore()
    store.toggle(0, 0)
    store.resize(100, 0)
    expect(store.width).toBe(MAX_WIDTH)
    expect(store.height).toBe(1)
    expect(store.matrix[0]![0]).toBe(1)
  })

  it('adds no undo step when the size does not change', () => {
    const store = useChartStore()
    store.resize(8, 8)
    expect(store.canUndo).toBe(false)
  })

  it('clears the chart, and the clear can be undone', () => {
    const store = useChartStore()
    store.toggle(3, 3)
    store.clear()
    expect(store.matrix.flat().every(bit => bit === 0)).toBe(true)
    store.undo()
    expect(store.matrix[3]![3]).toBe(1)
  })

  it('adds no undo step when clearing an empty chart', () => {
    const store = useChartStore()
    store.clear()
    expect(store.canUndo).toBe(false)
  })

  it('loads a chart from the encode page', () => {
    const store = useChartStore()
    const matrix = textToMatrix('FIEK')
    store.load(matrix)
    expect(store.width).toBe(8)
    expect(store.height).toBe(4)
    expect(store.matrix).toEqual(matrix)
    store.undo()
    expect(store.height).toBe(8)
  })

  it('keeps at most HISTORY_LIMIT undo steps', () => {
    const store = useChartStore()
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) store.toggle(0, 0)
    expect(store.past).toHaveLength(HISTORY_LIMIT)
  })

  it('does not change old charts in the history', () => {
    const store = useChartStore()
    store.toggle(0, 0)
    const before = store.past[0]!
    store.toggle(0, 1)
    expect([...before.cells].every(cell => cell === 0)).toBe(true)
  })
})

describe('chart store – parity', () => {
  it('adds a parity row and column as one undoable step', () => {
    const store = useChartStore()
    store.load(textToMatrix('F'))
    store.addParity()
    expect(store.width).toBe(9)
    expect(store.height).toBe(2)
    expect(store.hasParity).toBe(true)
    // F = 01000110 has three P stitches, so its row parity is 1.
    expect(store.matrix[0]).toEqual([0, 1, 0, 0, 0, 1, 1, 0, 1])
  })

  it('keeps the data part unchanged in dataMatrix', () => {
    const store = useChartStore()
    store.load(textToMatrix('FIEK'))
    store.addParity()
    expect(store.dataMatrix).toEqual(textToMatrix('FIEK'))
  })

  it('does not add parity twice', () => {
    const store = useChartStore()
    store.addParity()
    store.addParity()
    expect(store.width).toBe(9)
    expect(store.past).toHaveLength(1)
  })

  it('removes parity as one undoable step', () => {
    const store = useChartStore()
    store.load(textToMatrix('FIEK'))
    store.addParity()
    store.removeParity()
    expect(store.hasParity).toBe(false)
    expect(store.matrix).toEqual(textToMatrix('FIEK'))
  })

  it('does nothing when removing parity from a chart without it', () => {
    const store = useChartStore()
    store.removeParity()
    expect(store.width).toBe(8)
    expect(store.canUndo).toBe(false)
  })

  it('restores the parity flag with undo and redo', () => {
    const store = useChartStore()
    store.addParity()
    store.undo()
    expect(store.hasParity).toBe(false)
    expect(store.width).toBe(8)
    store.redo()
    expect(store.hasParity).toBe(true)
    expect(store.width).toBe(9)

    store.removeParity()
    store.undo()
    expect(store.hasParity).toBe(true)
    store.redo()
    expect(store.hasParity).toBe(false)
  })

  it('keeps the flag when stitches are toggled or the chart is cleared', () => {
    const store = useChartStore()
    store.addParity()
    store.toggle(0, 0)
    expect(store.hasParity).toBe(true)
    store.clear()
    expect(store.hasParity).toBe(true)
  })

  it('turns the flag off when another chart is loaded', () => {
    const store = useChartStore()
    store.addParity()
    store.load(textToMatrix('F'))
    expect(store.hasParity).toBe(false)
  })

  it('blocks resizing while parity is on', () => {
    const store = useChartStore()
    store.addParity()
    expect(store.canResize).toBe(false)
    store.resize(4, 4)
    expect(store.width).toBe(9)
    expect(store.height).toBe(9)
  })

  it('may grow past the size-control limit when adding parity', () => {
    const store = useChartStore()
    store.resize(MAX_WIDTH, 1)
    store.addParity()
    expect(store.width).toBe(MAX_WIDTH + 1)
  })
})
