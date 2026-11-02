<script setup lang="ts">
import { chartToSvg } from '~~/core/svgExport'
import type { BitMatrix } from '~~/core/types'

/**
 * "Download SVG" and "Print" for a chart (editor and knit page).
 * Print opens the browser's print dialog; the print stylesheet in main.css
 * then shows only the page's PrintSheet. The dialog can also save a PDF,
 * so no PDF library is needed.
 */
const props = defineProps<{
  matrix: BitMatrix
  parity?: boolean
}>()

const width = computed(() => props.matrix[0]?.length ?? 0)
const height = computed(() => props.matrix.length)

function download() {
  const svg = chartToSvg(props.matrix, {
    title: chartTitle(width.value, height.value),
    parity: props.parity,
  })
  downloadSvg(svg, chartFileName(width.value, height.value))
}

function print() {
  window.print()
}
</script>

<template>
  <div class="card">
    <h2>Export</h2>
    <p class="empty export__intro">
      The chart is drawn with row 1 (cast on) at the bottom. Print can also save a PDF.
    </p>
    <div class="export__buttons">
      <button
        type="button"
        class="button"
        data-test="download-svg"
        @click="download"
      >
        Download SVG
      </button>
      <button
        type="button"
        class="button"
        data-test="print"
        @click="print"
      >
        Print
      </button>
    </div>
  </div>
</template>

<style scoped>
.export__intro {
  margin-bottom: var(--space-3);
  font-size: 0.9375rem;
}

.export__buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
</style>
