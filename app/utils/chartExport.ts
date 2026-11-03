/**
 * Getting a chart out of the app (KF7): the title used on the image and the
 * print sheet, the file name, and the download itself.
 */

/** "KnitBit chart · 4 rows × 8 stitches" */
export function chartTitle(width: number, height: number): string {
  return `KnitBit chart · ${height} ${height === 1 ? 'row' : 'rows'} × ${width} ${width === 1 ? 'stitch' : 'stitches'}`
}

/** "knitbit-chart-8x4.svg" (width × height, like the editor's size controls) */
export function chartFileName(width: number, height: number): string {
  return `knitbit-chart-${width}x${height}.svg`
}

/**
 * Saves an SVG file. Returns which way it was offered, for tests.
 *
 * - Normally: a temporary <a download> link to a Blob. Desktop browsers save
 *   the file; iOS Safari (13 and later) asks "Download?" and puts it in
 *   Files → Downloads.
 * - In the iOS home-screen app (navigator.standalone): there, a download
 *   link can open the file inside the app window, with no way back to the
 *   app except restarting it. The share sheet is used instead; it offers
 *   "Save to Files". Only when the browser says it can share files.
 *
 * Must be called directly from a tap: iOS only allows a download or the
 * share sheet during a user gesture, so nothing here waits before starting.
 */
export function downloadSvg(svg: string, fileName: string): 'share' | 'download' {
  const file = new File([svg], fileName, { type: 'image/svg+xml' })

  if (isIosHomeScreenApp() && navigator.canShare?.({ files: [file] })) {
    // Rejects when the user closes the share sheet; that is not an error.
    navigator.share({ files: [file] }).catch(() => {})
    return 'share'
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Not revoked at once: Safari may still be reading the Blob after click().
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'download'
}

/** True only in an app started from the iOS home screen (a non-standard Safari property). */
function isIosHomeScreenApp(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}
