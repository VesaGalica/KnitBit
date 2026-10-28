import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EditorPage from '../../app/pages/editor.vue'
import { useChartStore } from '../../stores/chart'
import { textToMatrix } from '../../core/encoding'

beforeEach(() => {
  // The Nuxt test app keeps one Pinia instance for the whole file.
  useChartStore().$reset()
})

describe('editor page', () => {
  it('shows the 8×8 starting chart', async () => {
    const page = await mountSuspended(EditorPage)
    expect(page.findAll('.chart__cell')).toHaveLength(64)
    expect(page.findAll('.chart__cell--p')).toHaveLength(0)
  })

  it('toggles a stitch on tap and updates the row pattern', async () => {
    const page = await mountSuspended(EditorPage)
    // Row 1, stitch 2.
    await page.findAll('.chart__cell')[1]!.trigger('click')

    expect(page.findAll('.chart__cell--p')).toHaveLength(1)
    expect(page.findAll('[data-test="pattern"]')[0]!.text()).toBe('K1, P1, K6')
  })

  it('undoes and redoes a tap', async () => {
    const page = await mountSuspended(EditorPage)
    await page.findAll('.chart__cell')[0]!.trigger('click')
    await page.find('[data-test="undo"]').trigger('click')
    expect(page.findAll('.chart__cell--p')).toHaveLength(0)

    await page.find('[data-test="redo"]').trigger('click')
    expect(page.findAll('.chart__cell--p')).toHaveLength(1)
  })

  it('disables undo and redo when there is nothing to do', async () => {
    const page = await mountSuspended(EditorPage)
    expect(page.find('[data-test="undo"]').attributes('disabled')).toBeDefined()
    expect(page.find('[data-test="redo"]').attributes('disabled')).toBeDefined()
  })

  it('reads the chart as text when it is 8 stitches wide', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(EditorPage)
    expect(page.find('[data-test="editor-text"]').text()).toBe('FIEK')
  })

  it('updates the text after a stitch is changed', async () => {
    useChartStore().load(textToMatrix('F'))
    const page = await mountSuspended(EditorPage)
    // F = 01000110 → flip the last stitch → 01000111 = G.
    await page.findAll('.chart__cell')[7]!.trigger('click')
    expect(page.find('[data-test="editor-text"]').text()).toBe('G')
  })

  it('says so when the rows are not valid UTF-8', async () => {
    // The first byte of "ë" alone is not a complete character.
    useChartStore().load(textToMatrix('ë').slice(0, 1))
    const page = await mountSuspended(EditorPage)
    expect(page.find('[data-test="editor-text-invalid"]').exists()).toBe(true)
  })

  it('grows the width with + and offers to set it back to 8', async () => {
    const page = await mountSuspended(EditorPage)
    await page.find('[data-test="width-increase"]').trigger('click')
    expect(page.findAll('.chart__cell')).toHaveLength(72)
    expect(page.find('[data-test="editor-text"]').exists()).toBe(false)

    await page.find('[data-test="set-width-8"]').trigger('click')
    expect(page.findAll('.chart__cell')).toHaveLength(64)
  })

  it('applies a typed height and clamps it to the limit', async () => {
    const page = await mountSuspended(EditorPage)
    const input = page.find('[data-test="height-input"]')
    await input.setValue('500')
    await input.trigger('change')
    expect(useChartStore().height).toBe(200)
    expect((input.element as HTMLInputElement).value).toBe('200')
  })
})
