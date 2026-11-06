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

  it('draws the first character at the bottom (row 1, cast on)', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-test="text-input"]').setValue('FI')

    const rowY = (label: string) => {
      const group = page.findAll('svg > g').find(row => row.find('.chart__label').text() === label)!
      return Number(/translate\(0 ([\d.]+)\)/.exec(group.attributes('transform')!)![1])
    }
    expect(rowY('F')).toBeGreaterThan(rowY('I'))
    expect(page.find('.chart__cast-on').text()).toBe('Row 1 – cast on')
  })

  it('decodes rows written in either notation', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-mode="decode"]').trigger('click')
    // "F" as binary, "I" (01001001) as a K/P pattern.
    await page.find('[data-test="rows-input"]').setValue('01000110\nK1, P1, K2, P1, K2, P1')

    expect(page.find('[data-test="decoded-text"]').text()).toBe('FI')
  })

  it('decodes a row written as a repeat', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-mode="decode"]').trigger('click')
    // "3" = 00110011 = [K2, P2] x2, next to "F" in binary.
    await page.find('[data-test="rows-input"]').setValue('[K2, P2] x2\n01000110')

    expect(page.find('[data-test="decoded-text"]').text()).toBe('3F')
  })

  it('decodes a line that mixes a repeat and plain groups', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-mode="decode"]').trigger('click')
    // "T" = 01010100 = [K1, P1] x3, K2.
    await page.find('[data-test="rows-input"]').setValue('[K1, P1] x3, K2')

    expect(page.find('[data-test="decoded-text"]').text()).toBe('T')
  })

  it('says a binary row must be 8 digits of 0 and 1 when a letter O is typed', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-mode="decode"]').trigger('click')
    await page.find('[data-test="rows-input"]').setValue('0100011O')

    const message = page.find('[role="alert"]').text()
    expect(message).toBe('Line 1: a row must be 8 digits of 0 and 1; "O" is not 0 or 1.')
    expect(message).not.toContain('stitch group')
  })

  it('mentions mixed lines in the hint', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-mode="decode"]').trigger('click')
    expect(page.find('.field__hint').text()).toContain('[K1, P1] x3, K2')
  })

  it('writes "1 character → 1 row" in the singular', async () => {
    const page = await mountSuspended(EncodePage)
    await page.find('[data-test="text-input"]').setValue('F')
    expect(page.find('.field__hint').text()).toBe('1 character → 1 row of 8 stitches')

    await page.find('[data-test="text-input"]').setValue('ë')
    expect(page.find('.field__hint').text()).toBe('1 character → 2 rows of 8 stitches')

    await page.find('[data-test="text-input"]').setValue('FIEK')
    expect(page.find('.field__hint').text()).toBe('4 characters → 4 rows of 8 stitches')
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
