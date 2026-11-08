import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import KnitPage from '../../app/pages/knit.vue'
import { useChartStore } from '../../stores/chart'
import { CHART_STORAGE_KEY, restoreChart, startSavingChart } from '../../app/utils/chartStorage'
import { textToMatrix } from '../../core/encoding'

beforeEach(() => {
  localStorage.clear()
  // The Nuxt test app keeps one Pinia instance for the whole file.
  useChartStore().$reset()
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('knit page', () => {
  it('moves with Next and Previous and stops at the first and last row', async () => {
    useChartStore().load(textToMatrix('FIEK')) // 4 rows
    const page = await mountSuspended(KnitPage)
    const progress = () => page.find('[data-test="progress"]').text()
    const previous = page.find('[data-test="previous"]')
    const next = page.find('[data-test="next"]')

    expect(progress()).toBe('Row 1 of 4')
    expect(previous.attributes('disabled')).toBeDefined()

    await next.trigger('click')
    expect(progress()).toBe('Row 2 of 4')
    expect(page.find('[data-test="row-number"]').text()).toBe('Row 2')

    await next.trigger('click')
    await next.trigger('click')
    expect(progress()).toBe('Row 4 of 4')
    expect(next.attributes('disabled')).toBeDefined()

    // A click on the disabled button must not move past the end.
    await next.trigger('click')
    expect(progress()).toBe('Row 4 of 4')

    await previous.trigger('click')
    expect(progress()).toBe('Row 3 of 4')
  })

  it('shows the first row of FIEK in working order', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(KnitPage)
    expect(page.find('[data-test="row-side"]').text()).toBe('RS')
    expect(page.find('[data-test="instruction"]').text()).toBe('K1, P2, K3, P1, K1')
    // F = 01000110, worked right to left: 01100010.
    const squares = page.findAll('.stitches__cell').map(cell => (cell.classes('stitches__cell--p') ? '1' : '0'))
    expect(squares.join('')).toBe('01100010')
  })

  it('shows a wrong-side row left to right with K and P swapped', async () => {
    const chart = useChartStore()
    chart.load(textToMatrix('FIEK'))
    chart.nextRow() // row 2: "I" = 01001001, inverted → 10110110
    const page = await mountSuspended(KnitPage)

    expect(page.find('[data-test="row-side"]').text()).toBe('WS')
    expect(page.find('[data-test="instruction"]').text()).toBe('P1, K1, P2, K1, P2, K1')
  })

  it('has no flat/round switch (the app knits flat only)', async () => {
    const page = await mountSuspended(KnitPage)
    expect(page.find('[data-mode]').exists()).toBe(false)
    expect(page.text()).not.toMatch(/round/i)
  })

  it('keeps the current row after a reload', async () => {
    const chart = useChartStore()
    const stop = startSavingChart(chart)
    chart.load(textToMatrix('FIEK'))
    const page = await mountSuspended(KnitPage)
    await page.find('[data-test="next"]').trigger('click')
    await page.find('[data-test="next"]').trigger('click')
    stop()
    page.unmount()
    const saved = localStorage.getItem(CHART_STORAGE_KEY)!

    // "Reload": the store goes back to its starting chart, then the plugin restores the save.
    // The app's own save plugin also runs in the test app and saves the reset chart,
    // so the saved text is put back, as it would still be on disk after a real reload.
    chart.$reset()
    expect(chart.knitRow).toBe(1)
    localStorage.setItem(CHART_STORAGE_KEY, saved)
    expect(restoreChart(chart)).toBe(true)

    const reloaded = await mountSuspended(KnitPage)
    expect(reloaded.find('[data-test="progress"]').text()).toBe('Row 3 of 4')
  })

  it('marks the current row on the chart, drawn with row 1 at the bottom', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(KnitPage)
    const marker = page.find('[data-test="current-row"]')
    // 4 rows of 24 units after 2 units of padding: row 1 is the last, at y = 2 + 3 × 24.
    expect(Number(marker.attributes('y'))).toBe(2 + 3 * 24 - 1)
  })

  it('explains an all-K chart but still lets the user knit it', async () => {
    const page = await mountSuspended(KnitPage) // the starting 8×8 chart is all K
    const hint = page.find('[data-test="all-knit-hint"]')
    expect(hint.text()).toContain('plain stockinette')
    expect(hint.findAll('a').map(link => link.attributes('href'))).toEqual(['/encode', '/editor', '/algorithms'])
    expect(page.find('[data-test="instruction"]').text()).toBe('K8')
    expect(page.find('[data-test="next"]').attributes('disabled')).toBeUndefined()
  })

  it('shows no hint for a chart with purl stitches', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(KnitPage)
    expect(page.find('[data-test="all-knit-hint"]').exists()).toBe(false)
  })

  it('says so quietly when the screen cannot be kept on', async () => {
    // happy-dom has no navigator.wakeLock, like older iOS.
    const page = await mountSuspended(KnitPage)
    expect(page.find('[data-test="wake-lock-unsupported"]').exists()).toBe(true)
    expect(page.find('[data-test="wake-lock"]').exists()).toBe(false)
  })

  it('advises Auto-Lock "Never" when the browser refuses the wake lock', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => { throw new Error('NotAllowedError') } },
    })
    const page = await mountSuspended(KnitPage)
    await new Promise(resolve => setTimeout(resolve, 0)) // let the request fail
    expect(page.find('[data-test="wake-lock"]').text()).toContain('Screen may turn off')
    expect(page.find('[data-test="wake-lock-failed"]').text()).toContain('Set Auto-Lock to Never')
    page.unmount()
  })

  it('shows no Auto-Lock advice while the screen is kept on', async () => {
    const sentinel = { addEventListener: () => {}, release: async () => {} }
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => sentinel },
    })
    const page = await mountSuspended(KnitPage)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(page.find('[data-test="wake-lock-failed"]').exists()).toBe(false)
    page.unmount()
  })

  it('has Previous, the progress and Next in one row of the stepper', async () => {
    useChartStore().load(textToMatrix('FIEK'))
    const page = await mountSuspended(KnitPage)
    const row = page.find('.stepper__row')
    expect(row.find('[data-test="previous"]').exists()).toBe(true)
    expect(row.find('[data-test="progress"]').text()).toBe('Row 1 of 4')
    expect(row.find('[data-test="next"]').exists()).toBe(true)
  })

  it('keeps the screen on and shows it when the wake lock is supported', async () => {
    const sentinel = { addEventListener: () => {}, release: async () => {} }
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => sentinel },
    })
    const page = await mountSuspended(KnitPage)
    await new Promise(resolve => setTimeout(resolve, 0)) // let the request resolve
    expect(page.find('[data-test="wake-lock"]').text()).toBe('Screen stays on')

    await page.find('[data-test="wake-lock"]').trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(page.find('[data-test="wake-lock"]').text()).toContain('Screen may turn off')
    page.unmount()
  })
})
