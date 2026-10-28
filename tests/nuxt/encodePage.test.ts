import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EncodePage from '../../app/pages/encode.vue'
import { useChartStore } from '../../stores/chart'
import { textToMatrix } from '../../core/encoding'

describe('encode page', () => {
  it('sends the encoded chart to the editor store with "Open in editor"', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-test="text-input"]').setValue('FIEK')
    await page.find('[data-test="open-in-editor"]').trigger('click')

    const chart = useChartStore()
    expect(chart.matrix).toEqual(textToMatrix('FIEK'))
    expect(chart.canUndo).toBe(true)
  })

  it('shows the chart and row patterns for typed text', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-test="text-input"]').setValue('F')

    // "F" = 01000110: one row, 8 cells, 3 of them purl.
    expect(page.findAll('.chart__cell')).toHaveLength(8)
    expect(page.findAll('.chart__cell--p')).toHaveLength(3)
    expect(page.find('[data-test="pattern"]').text()).toBe('K1, P1, K3, P2, K1')
  })

  it('labels the two rows of a two-byte character', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-test="text-input"]').setValue('ë')

    expect(page.findAll('.chart__cell')).toHaveLength(16)
    expect(page.findAll('.chart__label').map(label => label.text())).toEqual(['ë 1/2', 'ë 2/2'])
  })

  it('decodes rows written in either notation', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-mode="decode"]').trigger('click')
    // "F" as binary, "I" (01001001) as a K/P pattern.
    await page.find('[data-test="rows-input"]').setValue('01000110\nK1, P1, K2, P1, K2, P1')

    expect(page.find('[data-test="decoded-text"]').text()).toBe('FI')
  })

  it('names the line of a row with the wrong number of stitches', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-mode="decode"]').trigger('click')
    await page.find('[data-test="rows-input"]').setValue('01000110\nK2, P2')

    expect(page.find('[role="alert"]').text()).toContain('Line 2')
    expect(page.find('[data-test="decoded-text"]').exists()).toBe(false)
  })

  it('round trips through "Use the chart from Text → Chart"', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-test="text-input"]').setValue('Noël')
    await page.find('[data-test="use-encoded"]').trigger('click')

    expect(page.find('[data-test="decoded-text"]').text()).toBe('Noël')
  })
})
