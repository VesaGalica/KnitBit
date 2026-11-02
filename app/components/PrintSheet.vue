<script setup lang="ts">
import { knittingRows } from '~~/core/rows'
import type { KnitMode } from '~~/core/rows'
import { chartToSvg, ORIENTATION_NOTE } from '~~/core/svgExport'
import type { BitMatrix } from '~~/core/types'

/**
 * What the printer gets: a title, how to read the chart, the chart (the same
 * SVG as the download, so print and file always match) and the knitting
 * instructions in working order. Hidden on screen; the print stylesheet in
 * main.css shows it and hides everything else.
 *
 * Must be a direct child of the page's `.page` element, because that is how
 * the print stylesheet finds it.
 */
const props = defineProps<{
  matrix: BitMatrix
  mode: KnitMode
  parity?: boolean
}>()

const title = computed(() => chartTitle(props.matrix[0]?.length ?? 0, props.matrix.length))

// The string comes from chartToSvg, which builds it from numbers and escapes
// the only text it is given (the title), so v-html cannot inject anything.
const svg = computed(() => chartToSvg(props.matrix, { title: title.value, parity: props.parity }))

const rows = computed(() => knittingRows(props.matrix, props.mode))

const MODE_NOTE: Record<KnitMode, string> = {
  flat: 'Knitted flat: odd rows are right side (RS), worked right to left; even rows are wrong side (WS), worked left to right with K and P swapped. The instructions below already include this.',
  round: 'Knitted in the round: every row is right side (RS), worked right to left. The instructions below already include this.',
}
</script>

<template>
  <div
    class="print-sheet"
    data-test="print-sheet"
  >
    <h1 class="print-sheet__title">
      {{ title }}
    </h1>
    <p class="print-sheet__note">
      {{ ORIENTATION_NOTE }}
    </p>
    <p class="print-sheet__note">
      {{ MODE_NOTE[mode] }}
    </p>
    <!-- eslint-disable vue/no-v-html -- trusted string, see the script comment -->
    <div
      class="print-sheet__chart"
      v-html="svg"
    />
    <!-- eslint-enable vue/no-v-html -->
    <table class="print-sheet__rows">
      <thead>
        <tr>
          <th>Row</th>
          <th>Side</th>
          <th>Instruction</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.number"
        >
          <td>{{ row.number }}</td>
          <td>{{ row.side }}</td>
          <td class="print-sheet__instruction">
            {{ row.instruction }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Shown and hidden by main.css (print rules), not here: a scoped rule
   would be more specific than the global print rule and win. */
.print-sheet {
  color: #000;
}

.print-sheet__title {
  margin: 0 0 4px;
  font-size: 18pt;
}

.print-sheet__note {
  margin: 0 0 4px;
  font-size: 10pt;
}

.print-sheet__chart {
  margin: 12px 0;
}

/* The SVG file has a fixed pixel size; on paper it fits the page width. */
.print-sheet__chart :deep(svg) {
  display: block;
  width: 100%;
  max-width: 180mm;
  height: auto;
}

.print-sheet__rows {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

.print-sheet__rows th,
.print-sheet__rows td {
  padding: 3px 6px;
  border-bottom: 1px solid #ccc;
  text-align: left;
}

.print-sheet__rows tr {
  break-inside: avoid;
}

.print-sheet__instruction {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
</style>
