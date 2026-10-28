<script setup lang="ts">
import type { CellPosition } from '~~/core/parity'
import type { BitMatrix } from '~~/core/types'

/**
 * Draws a knitting chart as SVG: one square per stitch, K (0) light and
 * P (1) dark, row numbers on the left and an optional label per row on the
 * right (used for the character a byte belongs to).
 *
 * Sizes are in viewBox units, so the chart scales to the screen width.
 *
 * With `editable`, every stitch is a button: tapping it (or Enter/Space when
 * it has keyboard focus) emits `toggle` with its row and column. The chart
 * does not change itself; the parent decides what a toggle does.
 *
 * With `parity`, the last row and column are drawn as parity stitches
 * (tinted, dashed border). `highlight` marks one stitch, e.g. the one a
 * parity check found to be wrong.
 */
const props = defineProps<{
  matrix: BitMatrix
  rowLabels?: string[]
  label: string
  editable?: boolean
  parity?: boolean
  highlight?: CellPosition | null
}>()

const emit = defineEmits<{
  toggle: [row: number, col: number]
}>()

function isParityCell(row: number, col: number): boolean {
  return !!props.parity && (row === props.matrix.length - 1 || col === columns.value - 1)
}

function isHighlighted(row: number, col: number): boolean {
  return props.highlight?.row === row && props.highlight?.col === col
}

function cellLabel(row: number, col: number, bit: number): string {
  const stitch = bit === 1 ? 'purl' : 'knit'
  const parity = isParityCell(row, col) ? ' (parity)' : ''
  const wrong = isHighlighted(row, col) ? ', wrong' : ''
  return `Row ${row + 1}, stitch ${col + 1}: ${stitch}${parity}${wrong}`
}

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
    :role="editable ? 'group' : 'img'"
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
        :class="[
          'chart__cell',
          bit === 1 ? 'chart__cell--p' : 'chart__cell--k',
          {
            'chart__cell--editable': editable,
            'chart__cell--parity': isParityCell(r, c),
            'chart__cell--wrong': isHighlighted(r, c),
          },
        ]"
        :x="LEFT + c * CELL"
        y="0"
        :width="CELL"
        :height="CELL"
        :role="editable ? 'button' : undefined"
        :tabindex="editable ? 0 : undefined"
        :aria-label="editable ? cellLabel(r, c, bit) : undefined"
        @click="editable && emit('toggle', r, c)"
        @keydown.enter.space.prevent="editable && emit('toggle', r, c)"
      />
      <text
        v-if="rowLabels"
        class="chart__label"
        :x="LEFT + columns * CELL + 8"
        :y="CELL / 2"
        dominant-baseline="central"
      >{{ rowLabels[r] }}</text>
    </g>

    <!-- Drawn after all stitches so they sit on top; they never catch taps. -->
    <g
      v-if="parity && matrix.length > 0"
      class="chart__overlay"
    >
      <rect
        class="chart__parity-tint"
        :x="LEFT + (columns - 1) * CELL"
        :y="PAD"
        :width="CELL"
        :height="matrix.length * CELL"
      />
      <rect
        class="chart__parity-tint"
        :x="LEFT"
        :y="PAD + (matrix.length - 1) * CELL"
        :width="(columns - 1) * CELL"
        :height="CELL"
      />
    </g>
    <rect
      v-if="highlight"
      class="chart__overlay chart__highlight"
      :x="LEFT + highlight.col * CELL + 2"
      :y="PAD + highlight.row * CELL + 2"
      :width="CELL - 4"
      :height="CELL - 4"
    />
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

.chart__cell--editable {
  cursor: pointer;
  /* No double-tap zoom on the chart, so quick taps on two cells both count. */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.chart__cell--parity {
  stroke: var(--color-accent);
  stroke-dasharray: 3 2;
}

.chart__overlay {
  pointer-events: none;
}

.chart__parity-tint {
  fill: var(--color-accent);
  fill-opacity: 0.18;
}

.chart__highlight {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 4;
}

/* No browser focus ring after a tap; keyboard focus gets an accent border instead. */
.chart__cell--editable:focus {
  outline: none;
}

.chart__cell--editable:focus-visible {
  stroke: var(--color-accent);
  stroke-width: 3;
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
