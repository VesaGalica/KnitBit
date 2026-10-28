<script setup lang="ts">
import { rowToRepeatedRLE, rowToRLE } from '~~/core/rle'
import type { BitMatrix, BitRow } from '~~/core/types'

/**
 * "Row by row" list: the K/P pattern of every row, e.g. "Row 1  F  K1, P1, K3, P2, K1".
 * Used by the encode page (with a character per row) and the editor (without).
 */
const props = defineProps<{
  matrix: BitMatrix
  rowLabels?: string[]
}>()

const rows = computed(() =>
  props.matrix.map((row, index) => ({
    number: index + 1,
    label: props.rowLabels?.[index] ?? '',
    pattern: shortestPattern(row),
  })),
)

/**
 * The repeated form ("[K2, P2] x2") when it is shorter to read than the
 * plain one ("K2, P2, K2, P2"), otherwise the plain one.
 */
function shortestPattern(row: BitRow): string {
  const plain = rowToRLE(row)
  const repeated = rowToRepeatedRLE(row)
  return repeated.length < plain.length ? repeated : plain
}
</script>

<template>
  <ol
    class="instructions"
    :class="{ 'instructions--labelled': rowLabels }"
  >
    <li
      v-for="row in rows"
      :key="row.number"
      class="instructions__row"
    >
      <span class="instructions__number">Row {{ row.number }}</span>
      <span
        v-if="rowLabels"
        class="instructions__char"
      >{{ row.label }}</span>
      <span
        class="instructions__pattern"
        data-test="pattern"
      >{{ row.pattern }}</span>
    </li>
  </ol>
</template>

<style scoped>
.instructions {
  margin: 0;
  padding: 0;
  list-style: none;
}

.instructions__row {
  display: grid;
  grid-template-columns: 4.5rem 1fr;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9375rem;
}

.instructions--labelled .instructions__row {
  grid-template-columns: 4.5rem 3.5rem 1fr;
}

.instructions__row:last-child {
  border-bottom: 0;
}

.instructions__number {
  color: var(--color-muted);
}

.instructions__char,
.instructions__pattern {
  font-family: var(--font-mono);
}
</style>
