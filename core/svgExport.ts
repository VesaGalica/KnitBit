import type { BitMatrix } from './types'

/**
 * A chart as a standalone SVG file, for downloading and printing (KF7).
 *
 * Unlike the on-screen ChartSvg component, this file has to look right on
 * its own: opened in any viewer, printed, or put into the thesis. So it uses
 * fixed light colours instead of the app's CSS variables (which do not
 * exist outside the app, and would print a dark-mode chart nearly black).
 *
 * The chart is drawn bottom-up, like the knit page: row 1 is the first row
 * knitted after casting on (see core/rows.ts), so it sits at the bottom,
 * labelled "Row 1 – cast on", and the picture looks like the fabric. A
 * printout is what the knitter works from, so it must match the fabric.
 */

export interface SvgExportOptions {
  /** Shown at the top of the image. */
  title: string
  /** Draws the last row and column as parity stitches (dashed border). */
  parity?: boolean
}

export const SVG_COLORS = {
  k: '#ffffff',
  p: '#1f1d1b',
  border: '#b9b2a8',
  parity: '#b4473a',
  text: '#1f1d1b',
  muted: '#6b655e',
} as const

const CELL = 24
const PAD = 16
const HEADER = 52 // title + one line about the orientation
const LEFT = 32 // row numbers
const RIGHT = 120 // "Row 1 – cast on"
/** Narrow charts still need room for the orientation line. */
const MIN_WIDTH = 360

export const ORIENTATION_NOTE = 'Row 1 (cast on) is at the bottom. Read the chart from the bottom up.'

export function chartToSvg(matrix: BitMatrix, options: SvgExportOptions): string {
  const rows = matrix.length
  const columns = Math.max(0, ...matrix.map(row => row.length))
  const chartLeft = PAD + LEFT
  const width = Math.max(MIN_WIDTH, chartLeft + columns * CELL + RIGHT + PAD)
  const height = HEADER + rows * CELL + PAD * 2

  /** Row index 0 (row 1) is drawn last, at the bottom. */
  const rowY = (row: number) => HEADER + PAD + (rows - 1 - row) * CELL
  const isParity = (row: number, col: number) =>
    !!options.parity && (row === rows - 1 || col === columns - 1)

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">`,
    `<title>${escapeXml(options.title)}</title>`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    `<text x="${PAD}" y="${PAD + 14}" font-size="16" font-weight="700" fill="${SVG_COLORS.text}">${escapeXml(options.title)}</text>`,
    `<text x="${PAD}" y="${PAD + 32}" font-size="11" fill="${SVG_COLORS.muted}">${ORIENTATION_NOTE}</text>`,
  ]

  matrix.forEach((row, r) => {
    const y = rowY(r)
    const middle = y + CELL / 2
    parts.push(`<text x="${chartLeft - 6}" y="${middle}" font-size="11" text-anchor="end" dominant-baseline="central" fill="${SVG_COLORS.muted}">${r + 1}</text>`)
    row.forEach((bit, c) => {
      const stitch = bit === 1 ? 'p' : 'k'
      const parity = isParity(r, c)
      const stroke = parity ? SVG_COLORS.parity : SVG_COLORS.border
      const dash = parity ? ' stroke-dasharray="3 2"' : ''
      parts.push(`<rect class="stitch stitch-${stitch}" x="${chartLeft + c * CELL}" y="${y}" width="${CELL}" height="${CELL}" fill="${SVG_COLORS[stitch]}" stroke="${stroke}"${dash}/>`)
    })
    if (r === 0) {
      parts.push(`<text x="${chartLeft + columns * CELL + 8}" y="${middle}" font-size="11" font-weight="700" dominant-baseline="central" fill="${SVG_COLORS.text}">Row 1 – cast on</text>`)
    }
  })

  parts.push('</svg>')
  return parts.join('\n')
}

/** The title is the only text that may come from outside, so only it is escaped. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
