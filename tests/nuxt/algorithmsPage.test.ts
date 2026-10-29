import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { DOMWrapper } from '@vue/test-utils'
import AlgorithmsPage from '../../app/pages/algorithms.vue'
import { useChartStore } from '../../stores/chart'

beforeEach(() => {
  // The Nuxt test app keeps one Pinia instance for the whole file.
  useChartStore().$reset()
})

/** The chart inside `card` as strings of 0 and 1, one per row. */
function chartRows(card: DOMWrapper<Element>): string[] {
  return card.findAll('svg > g').map(row =>
    row.findAll('.chart__cell').map(cell => (cell.classes('chart__cell--p') ? '1' : '0')).join(''),
  )
}

/** A row of `width` K stitches with P at the given positions. */
function rowWith(width: number, ...purls: number[]): string {
  return Array.from({ length: width }, (_, i) => (purls.includes(i) ? '1' : '0')).join('')
}

describe('algorithms page – cellular automaton', () => {
  it('redraws the chart when the rule changes', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    const card = page.find('[data-test="automaton-chart"]')
    // Rule 90 (the default): the second row has P on both sides of the middle.
    expect(chartRows(card)[1]).toBe(rowWith(31, 14, 16))

    await page.find('[data-test="rule-input"]').setValue('30')
    // Rule 30: the second row has three P stitches in the middle.
    expect(chartRows(page.find('[data-test="automaton-chart"]'))[1]).toBe(rowWith(31, 14, 15, 16))
    expect(page.find('[data-test="rule-binary"]').text()).toBe('00011110 in binary')
  })

  it('shows the Sierpinski rows for preset 90', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    await page.find('[data-test="rule-input"]').setValue('0')
    await page.find('[data-test="rule-preset-90"]').trigger('click')

    const rows = chartRows(page.find('[data-test="automaton-chart"]'))
    expect(rows).toHaveLength(16)
    expect(rows.slice(0, 4)).toEqual([
      rowWith(31, 15),
      rowWith(31, 14, 16),
      rowWith(31, 13, 17),
      rowWith(31, 12, 14, 16, 18),
    ])
    expect(page.find('[data-test="rule-preset-90"]').attributes('aria-pressed')).toBe('true')
  })

  it('shows the rule table with the rule in binary', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    const results = page.findAll('[data-test="rule-result"]')
      .map(stitch => (stitch.classes('stitch--p') ? '1' : '0'))
    expect(results.join('')).toBe('01011010')
    expect(page.findAll('.rule-case')[1]!.attributes('aria-label')).toBe('P P K gives P')
  })

  it('names an invalid rule instead of drawing a chart', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    await page.find('[data-test="rule-input"]').setValue('300')

    expect(page.find('[role="alert"]').text()).toContain('from 0 to 255')
    expect(page.find('[data-test="automaton-chart"]').exists()).toBe(false)
  })

  it('sends the chart to the editor store with "Open in editor"', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    await page.find('[data-test="automaton-width"]').setValue('9')
    await page.find('[data-test="automaton-rows"]').setValue('3')
    await page.find('[data-test="automaton-open-in-editor"]').trigger('click')

    const chart = useChartStore()
    expect(chart.width).toBe(9)
    expect(chart.height).toBe(3)
    expect(chart.matrix[1]!.join('')).toBe(rowWith(9, 3, 5))
  })
})

describe('algorithms page – sorting', () => {
  it('shows 3 passes for 5, 1, 4, 2, 8', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    await page.find('[data-test="sort-input"]').setValue('5, 1, 4, 2, 8')

    expect(page.find('[data-test="bubble-passes"]').text()).toBe('3')
    expect(page.find('[data-test="bubble-comparisons"]').text()).toBe('9')
    // 4 blocks of 8 rows and 3 separator rows.
    expect(page.find('[data-test="bubble-rows"]').text()).toBe('35')
    expect(chartRows(page.find('[data-test="sort-chart"]'))).toHaveLength(35)
  })

  it('shows 7 bubble passes and 3 merge levels for the worst case', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    await page.find('[data-test="sort-preset-worst"]').trigger('click')

    expect(page.find('[data-test="sort-input"]').element).toHaveProperty('value', '8, 7, 6, 5, 4, 3, 2, 1')
    expect(page.find('[data-test="bubble-passes"]').text()).toBe('7')
    expect(page.find('[data-test="merge-passes"]').text()).toBe('3')
    expect(page.find('[data-test="bubble-rows"]').text()).toBe('71')
    expect(page.find('[data-test="merge-rows"]').text()).toBe('35')
  })

  it('switches the chart between bubble sort and merge sort', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    await page.find('[data-test="sort-preset-worst"]').trigger('click')
    expect(chartRows(page.find('[data-test="sort-chart"]'))).toHaveLength(71)

    await page.find('[data-algorithm="merge"]').trigger('click')
    const card = page.find('[data-test="sort-chart"]')
    expect(chartRows(card)).toHaveLength(35)
    // The first row of each block is labelled: the input, then levels 1–3.
    expect(card.findAll('.chart__label').map(label => label.text()).filter(Boolean))
      .toEqual(['Start', '1', '2', '3'])
  })

  it('shows the error for an invalid list', async () => {
    const page = await mountSuspended(AlgorithmsPage)
    await page.find('[data-test="sort-input"]').setValue('5, 9')

    expect(page.find('[role="alert"]').text()).toBe('"9" is not a whole number from 1 to 8.')
    expect(page.find('[data-test="sort-chart"]').exists()).toBe(false)
  })
})
