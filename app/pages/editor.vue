<script setup lang="ts">
import { BITS_PER_BYTE, matrixToText } from '~~/core/encoding'
import { MAX_HEIGHT, MAX_WIDTH, MIN_SIZE, useChartStore } from '~~/stores/chart'

useHead({ title: 'Editor · KnitBit' })

const chart = useChartStore()

/** Width and height controls: − / number field / +. */
const sizes = computed(() => [
  { key: 'width', label: 'Width', value: chart.width, max: MAX_WIDTH },
  { key: 'height', label: 'Height', value: chart.height, max: MAX_HEIGHT },
] as const)

function setSize(key: 'width' | 'height', value: number) {
  if (Number.isNaN(value)) return
  if (key === 'width') chart.resize(value, chart.height)
  else chart.resize(chart.width, value)
}

function onSizeInput(key: 'width' | 'height', event: Event) {
  const input = event.target as HTMLInputElement
  setSize(key, input.valueAsNumber)
  // The store clamps the value (e.g. 500 → 200); show what was really applied.
  input.value = String(key === 'width' ? chart.width : chart.height)
}

/**
 * The chart read as text. Only possible when every row is one byte (width 8),
 * and only if the bytes form valid UTF-8: e.g. "ë" needs two rows that belong
 * together, so one of them alone is not valid.
 */
const asText = computed(() => {
  if (chart.width !== BITS_PER_BYTE) return { kind: 'wrong-width' as const }
  try {
    return { kind: 'text' as const, text: visibleText(matrixToText(chart.matrix)) }
  }
  catch {
    return { kind: 'invalid' as const }
  }
})
</script>

<template>
  <section class="page">
    <h1>Editor</h1>

    <div class="card sizes">
      <div
        v-for="size in sizes"
        :key="size.key"
        class="size"
      >
        <span
          :id="`size-${size.key}`"
          class="field__label"
        >{{ size.label }}</span>
        <div class="size__controls">
          <button
            type="button"
            class="button size__step"
            :aria-label="`Decrease ${size.label.toLowerCase()}`"
            :disabled="size.value <= MIN_SIZE"
            @click="setSize(size.key, size.value - 1)"
          >
            −
          </button>
          <input
            class="field__input size__input"
            type="number"
            inputmode="numeric"
            :min="MIN_SIZE"
            :max="size.max"
            :value="size.value"
            :aria-labelledby="`size-${size.key}`"
            :data-test="`${size.key}-input`"
            @change="onSizeInput(size.key, $event)"
          >
          <button
            type="button"
            class="button size__step"
            :aria-label="`Increase ${size.label.toLowerCase()}`"
            :disabled="size.value >= size.max"
            :data-test="`${size.key}-increase`"
            @click="setSize(size.key, size.value + 1)"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <div class="toolbar">
      <button
        type="button"
        class="button"
        data-test="undo"
        :disabled="!chart.canUndo"
        @click="chart.undo()"
      >
        Undo
      </button>
      <button
        type="button"
        class="button"
        data-test="redo"
        :disabled="!chart.canRedo"
        @click="chart.redo()"
      >
        Redo
      </button>
      <button
        type="button"
        class="button"
        data-test="clear"
        @click="chart.clear()"
      >
        Clear
      </button>
    </div>

    <div class="card">
      <div class="card__header">
        <h2>Chart</h2>
        <span class="card__legend">Tap a stitch: K ↔ P</span>
      </div>
      <ChartSvg
        :matrix="chart.matrix"
        :label="`Editable knitting chart, ${chart.height} rows of ${chart.width} stitches`"
        editable
        @toggle="chart.toggle"
      />
    </div>

    <div class="card">
      <h2>As text</h2>
      <!-- On one line: .result keeps whitespace, so no spaces around the text. -->
      <p
        v-if="asText.kind === 'text'"
        class="result"
        data-test="editor-text"
      >{{ asText.text }}</p>
      <p
        v-else-if="asText.kind === 'invalid'"
        class="empty"
        data-test="editor-text-invalid"
      >
        These rows are not valid UTF-8 text yet. Some characters need more than one row, e.g. "ë" needs two.
      </p>
      <template v-else>
        <p class="empty">
          Each row is one byte only when the chart is 8 stitches wide.
        </p>
        <button
          type="button"
          class="button set-width"
          data-test="set-width-8"
          @click="chart.resize(8, chart.height)"
        >
          Set width to 8
        </button>
      </template>
    </div>

    <div class="card">
      <h2>Row by row</h2>
      <RowInstructions :matrix="chart.matrix" />
    </div>
  </section>
</template>

<style scoped>
.sizes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.size {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.size__controls {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: var(--space-1);
}

.size__step {
  padding: 0;
  font-size: 1.25rem;
}

.size__input {
  min-width: 0;
  padding: 0 var(--space-1);
  text-align: center;
}

.toolbar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.set-width {
  margin-top: var(--space-3);
}
</style>
