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

describe('editor page – parity', () => {
  /** Index of a stitch in the list of all cells (row by row). */
  function cellAt(page: Awaited<ReturnType<typeof mountSuspended>>, row: number, col: number) {
    return page.findAll('.chart__cell')[row * useChartStore().width + col]!
  }

  it('adds parity and draws the last row and column as parity stitches', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(EditorPage)
    await page.find('[data-test="add-parity"]').trigger('click')

    // 4×8 data + parity → 5 rows × 9 columns; parity cells: 5 + 9 - 1 = 13.
    expect(page.findAll('.chart__cell')).toHaveLength(45)
    expect(page.findAll('.chart__cell--parity')).toHaveLength(13)
    // The text is still read from the data part.
    expect(page.find('[data-test="editor-text"]').text()).toBe('FIEK')
  })

  it('reports a valid chart', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(EditorPage)
    await page.find('[data-test="add-parity"]').trigger('click')
    await page.find('[data-test="check-parity"]').trigger('click')

    expect(page.find('[data-test="parity-result"]').text()).toContain('Parity is correct')
    expect(page.findAll('.chart__cell--wrong')).toHaveLength(0)
  })

  it('highlights exactly the one flipped stitch, and tapping it fixes it', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(EditorPage)
    await page.find('[data-test="add-parity"]').trigger('click')

    // Knit row 3, stitch 5 wrong (0-based: row 2, col 4).
    await cellAt(page, 2, 4).trigger('click')
    await page.find('[data-test="check-parity"]').trigger('click')

    const wrong = page.findAll('.chart__cell--wrong')
    expect(wrong).toHaveLength(1)
    expect(wrong[0]!.element).toBe(cellAt(page, 2, 4).element)
    expect(page.find('[data-test="parity-result"]').text())
      .toBe('Row 3, stitch 5 is wrong – tap it to fix it.')

    await cellAt(page, 2, 4).trigger('click')
    expect(page.findAll('.chart__cell--wrong')).toHaveLength(0)
    expect(page.find('[data-test="parity-result"]').exists()).toBe(false)

    await page.find('[data-test="check-parity"]').trigger('click')
    expect(page.find('[data-test="parity-result"]').text()).toContain('Parity is correct')
  })

  it('says parity cannot locate two flipped stitches', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(EditorPage)
    await page.find('[data-test="add-parity"]').trigger('click')
    await cellAt(page, 0, 1).trigger('click')
    await cellAt(page, 2, 6).trigger('click')
    await page.find('[data-test="check-parity"]').trigger('click')

    expect(page.find('[data-test="parity-result"]').text())
      .toBe('More than one stitch is wrong. Parity can only locate a single error.')
    expect(page.findAll('.chart__cell--wrong')).toHaveLength(0)
  })

  it('removes parity and allows resizing again', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(EditorPage)
    await page.find('[data-test="add-parity"]').trigger('click')
    expect(page.find('[data-test="width-increase"]').attributes('disabled')).toBeDefined()

    await page.find('[data-test="remove-parity"]').trigger('click')
    expect(page.findAll('.chart__cell')).toHaveLength(32)
    expect(page.findAll('.chart__cell--parity')).toHaveLength(0)
    expect(page.find('[data-test="width-increase"]').attributes('disabled')).toBeUndefined()
  })

  it('undoes adding parity', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(EditorPage)
    await page.find('[data-test="add-parity"]').trigger('click')
    await page.find('[data-test="undo"]').trigger('click')

    expect(page.findAll('.chart__cell')).toHaveLength(32)
    expect(page.find('[data-test="add-parity"]').exists()).toBe(true)
  })
})
