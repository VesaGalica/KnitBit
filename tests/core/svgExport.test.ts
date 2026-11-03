import { describe, expect, it } from 'vitest'
import { chartToSvg, ORIENTATION_NOTE, SVG_COLORS } from '../../core/svgExport'
import { textToMatrix } from '../../core/encoding'
import { addParity } from '../../core/parity'

/** All stitch squares of an SVG, in drawing order, with their position and fill. */
function stitches(svg: string) {
  return [...svg.matchAll(/<rect class="stitch stitch-([kp])" x="(\d+)" y="(\d+)"[^>]*fill="([^"]+)"/g)]
    .map(([, stitch, x, y, fill]) => ({ stitch, x: Number(x), y: Number(y), fill }))
}

describe('chartToSvg', () => {
  const fiek = textToMatrix('FIEK')
  const svg = chartToSvg(fiek, { title: 'FIEK' })

  it('is a standalone SVG file', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    // No CSS variables: they only exist inside the app.
    expect(svg).not.toContain('var(')
  })

  it('draws one square per stitch with the right colour', () => {
    const cells = stitches(svg)
    expect(cells).toHaveLength(32)
    expect(cells.map(cell => (cell.stitch === 'p' ? 1 : 0))).toEqual(fiek.flat())
    expect(cells.filter(cell => cell.stitch === 'p').every(cell => cell.fill === SVG_COLORS.p)).toBe(true)
    expect(cells.filter(cell => cell.stitch === 'k').every(cell => cell.fill === SVG_COLORS.k)).toBe(true)
  })

  it('draws row 1 at the bottom and labels it as the cast-on row', () => {
    const cells = stitches(svg)
    const row1Y = cells[0]!.y // first 8 squares are row 1 ("F")
    const row4Y = cells[24]!.y // last 8 are row 4 ("K")
    expect(row1Y).toBeGreaterThan(row4Y)
    expect(svg).toContain('Row 1 – cast on')
    expect(svg).toContain(ORIENTATION_NOTE)
  })

  it('shows the title, escaped', () => {
    const withTags = chartToSvg([[0]], { title: 'A <b> & "c"' })
    expect(withTags).toContain('A &lt;b&gt; &amp; &quot;c&quot;')
    expect(withTags).not.toContain('<b>')
  })

  it('marks parity stitches with a dashed border only when asked', () => {
    const withParity = addParity(fiek) // 9 × 5, the last row and column are parity
    const dashed = (text: string) => text.match(/stroke-dasharray/g)?.length ?? 0
    expect(dashed(chartToSvg(withParity, { title: 'x', parity: true }))).toBe(9 + 5 - 1)
    expect(dashed(chartToSvg(withParity, { title: 'x' }))).toBe(0)
  })

  it('handles an empty chart', () => {
    expect(stitches(chartToSvg([], { title: 'empty' }))).toHaveLength(0)
  })
})
