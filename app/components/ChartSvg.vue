<script setup lang="ts">
import type { BitMatrix } from '~~/core/types'

/**
 * Draws a knitting chart as SVG: one square per stitch, K (0) light and
 * P (1) dark, row numbers on the left and an optional label per row on the
 * right (used for the character a byte belongs to).
 *
 * Sizes are in viewBox units, so the chart scales to the screen width.
 */
const props = defineProps<{
  matrix: BitMatrix
  rowLabels?: string[]
  label: string
}>()

const CELL = 24
const LEFT = 28 // row numbers
const RIGHT = 48 // row labels
const PAD = 2

const columns = computed(() => Math.max(0, ...props.matrix.map(row => row.length)))
const width = computed(() => LEFT + columns.value * CELL + (props.rowLabels ? RIGHT : 0) + PAD)
const height = computed(() => props.matrix.length * CELL + PAD * 2)
</script>

<template>
  <svg
    class="chart"
    :viewBox="`0 0 ${width} ${height}`"
    :style="{ maxWidth: `${width * 1.5}px` }"
    role="img"
    :aria-label="label"
  >
    <g
      v-for="(row, r) in matrix"
      :key="r"
      :transform="`translate(0 ${PAD + r * CELL})`"
    >
      <text
        class="chart__number"
        :x="LEFT - 6"
        :y="CELL / 2"
        text-anchor="end"
        dominant-baseline="central"
      >{{ r + 1 }}</text>
      <rect
        v-for="(bit, c) in row"
        :key="c"
        :class="bit === 1 ? 'chart__cell chart__cell--p' : 'chart__cell chart__cell--k'"
        :x="LEFT + c * CELL"
        y="0"
        :width="CELL"
        :height="CELL"
      />
      <text
        v-if="rowLabels"
        class="chart__label"
        :x="LEFT + columns * CELL + 8"
        :y="CELL / 2"
        dominant-baseline="central"
      >{{ rowLabels[r] }}</text>
    </g>
  </svg>
</template>

<style scoped>
.chart {
  display: block;
  width: 100%;
  height: auto;
}

.chart__cell {
  stroke: var(--color-border);
  stroke-width: 1;
}

.chart__cell--k {
  fill: var(--color-stitch-k);
}

.chart__cell--p {
  fill: var(--color-stitch-p);
}

.chart__number,
.chart__label {
  fill: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 11px;
}

.chart__label {
  fill: var(--color-text);
}
</style>
