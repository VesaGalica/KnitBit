import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EditorPage from '../../app/pages/editor.vue'
import KnitPage from '../../app/pages/knit.vue'
import { useChartStore } from '../../stores/chart'
import { chartFileName, chartTitle, downloadSvg } from '../../app/utils/chartExport'
import { textToMatrix } from '../../core/encoding'

/** Catches the file a download link points to, instead of really downloading. */
function catchDownloads() {
  const files: File[] = []
  const names: string[] = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    files.push(blob as File)
    return 'blob:test'
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download)
  })
  return { files, names }
}

beforeEach(() => {
  useChartStore().$reset()
  useChartStore().load(textToMatrix('FIEK'))
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'standalone')
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
  Reflect.deleteProperty(window, 'print')
})

describe('chart export', () => {
  it.each([
    ['editor', EditorPage],
    ['knit page', KnitPage],
  ])('downloads an SVG file of the chart from the %s', async (_, Page) => {
    const { files, names } = catchDownloads()
    const page = await mountSuspended(Page)
    await page.find('[data-test="download-svg"]').trigger('click')

    expect(names).toEqual(['knitbit-chart-8x4.svg'])
    expect(files[0]!.type).toBe('image/svg+xml')
    const svg = await files[0]!.text()
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg.match(/class="stitch stitch-p"/g)).toHaveLength(textToMatrix('FIEK').flat().filter(bit => bit === 1).length)
    expect(svg).toContain('Row 1 – cast on')
    expect(svg).toContain(chartTitle(8, 4))
  })

  it('opens the print dialog', async () => {
    // happy-dom has no print dialog, so window.print is defined for this test.
    const print = vi.fn()
    Object.defineProperty(window, 'print', { configurable: true, value: print })
    const page = await mountSuspended(KnitPage)
    await page.find('[data-test="print"]').trigger('click')
    expect(print).toHaveBeenCalledOnce()
  })

  it('has a print sheet with the title, the orientation, the chart and the instructions', async () => {
    const page = await mountSuspended(KnitPage)
    const sheet = page.find('[data-test="print-sheet"]')
    expect(sheet.find('h1').text()).toBe(chartTitle(8, 4))
    expect(sheet.text()).toContain('Row 1 (cast on) is at the bottom')
    expect(sheet.text()).toContain('Knitted flat')
    expect(sheet.findAll('.stitch')).toHaveLength(32)
    const instructions = sheet.findAll('tbody tr').map(row => row.findAll('td').map(cell => cell.text()))
    expect(instructions[0]).toEqual(['1', 'RS', 'K1, P2, K3, P1, K1'])
    expect(instructions[1]).toEqual(['2', 'WS', 'P1, K1, P2, K1, P2, K1'])
  })

  it('never mentions knitting in the round on the print sheet', async () => {
    const page = await mountSuspended(KnitPage)
    expect(page.find('[data-test="print-sheet"]').text()).not.toMatch(/round/i)
  })
})

describe('downloadSvg', () => {
  it('uses the share sheet in the iOS home-screen app', () => {
    const share = vi.fn(async () => {})
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    const { files } = catchDownloads()

    expect(downloadSvg('<svg/>', 'chart.svg')).toBe('share')
    expect(share).toHaveBeenCalledOnce()
    expect(files).toHaveLength(0)
  })

  it('uses a download link in the home-screen app when files cannot be shared', () => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false })
    const { names } = catchDownloads()
    expect(downloadSvg('<svg/>', 'chart.svg')).toBe('download')
    expect(names).toEqual(['chart.svg'])
  })
})

describe('chartTitle and chartFileName', () => {
  it('names the size', () => {
    expect(chartTitle(8, 4)).toBe('KnitBit chart · 4 rows × 8 stitches')
    expect(chartTitle(1, 1)).toBe('KnitBit chart · 1 row × 1 stitch')
    expect(chartFileName(8, 4)).toBe('knitbit-chart-8x4.svg')
  })
})
