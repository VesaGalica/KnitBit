import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ChartSvg from '../../app/components/ChartSvg.vue'
import { addParity } from '../../core/parity'
import type { BitMatrix } from '../../core/types'

/** Sizes in viewBox units, as in ChartSvg.vue. */
const CELL = 24
const PAD = 2

/** Three different rows, so each can be recognised: row 1 = 100, row 2 = 010, row 3 = 001. */
const THREE_ROWS: BitMatrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

/** The y offset of every row group, in data order (row 1 first). */
function rowOffsets(wrapper: VueWrapper): number[] {
  return wrapper.findAll('g[transform]').map((group) => {
    const match = /translate\(0 ([\d.]+)\)/.exec(group.attributes('transform')!)
    return Number(match![1])
  })
}

describe('ChartSvg orientation', () => {
  it('draws row 1 at the bottom and the last row at the top', async () => {
    const chart = await mountSuspended(ChartSvg, { props: { matrix: THREE_ROWS, label: 'test' } })
    expect(rowOffsets(chart)).toEqual([PAD + 2 * CELL, PAD + CELL, PAD])
    // Row numbers stay the data's: the bottom group is still labelled 1.
    const bottom = chart.findAll('g[transform]')[0]!
    expect(bottom.find('.chart__number').text()).toBe('1')
    expect(bottom.findAll('.chart__cell').map(cell => (cell.classes('chart__cell--p') ? 1 : 0))).toEqual([1, 0, 0])
  })

  it('labels the bottom row as the cast-on edge, below the stitches', async () => {
    const chart = await mountSuspended(ChartSvg, { props: { matrix: THREE_ROWS, label: 'test' } })
    const castOn = chart.find('.chart__cast-on')
    expect(castOn.text()).toBe('Row 1 – cast on')
    expect(Number(castOn.attributes('y'))).toBeGreaterThan(PAD + 3 * CELL)
  })

  it('has no cast-on label for an empty chart', async () => {
    const chart = await mountSuspended(ChartSvg, { props: { matrix: [], label: 'test' } })
    expect(chart.find('.chart__cast-on').exists()).toBe(false)
  })

  it('keeps each row label with its row (first character at the bottom)', async () => {
    const chart = await mountSuspended(ChartSvg, {
      props: { matrix: THREE_ROWS, rowLabels: ['a', 'b', 'c'], label: 'test' },
    })
    const groups = chart.findAll('g[transform]')
    expect(groups.map(group => group.find('.chart__label').text())).toEqual(['a', 'b', 'c'])
    expect(rowOffsets(chart)[0]).toBe(PAD + 2 * CELL)
  })

  it('emits the data row of a tapped stitch, not its drawing position', async () => {
    const chart = await mountSuspended(ChartSvg, { props: { matrix: THREE_ROWS, label: 'test', editable: true } })
    // The first group in the DOM is row 1, drawn at the bottom.
    await chart.findAll('g[transform]')[0]!.findAll('.chart__cell')[2]!.trigger('click')
    expect(chart.emitted('toggle')).toEqual([[0, 2]])
  })

  it('draws the parity row at the top (it is the last row, knitted last)', async () => {
    const withParity = addParity([[1, 0], [0, 0]]) // 3 × 3, parity row is index 2
    const chart = await mountSuspended(ChartSvg, { props: { matrix: withParity, label: 'test', parity: true } })
    const tints = chart.findAll('.chart__parity-tint')
    // Second tint is the parity row; the top row starts at PAD.
    expect(Number(tints[1]!.attributes('y'))).toBe(PAD)
    // The parity row's group is the top one and is numbered 3.
    expect(rowOffsets(chart)[2]).toBe(PAD)
  })
})
