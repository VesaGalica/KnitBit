<script setup lang="ts">
import { BITS_PER_BYTE, matrixToText } from '~~/core/encoding'
import { checkParity } from '~~/core/parity'
import type { CellPosition } from '~~/core/parity'
import { MAX_HEIGHT, MAX_WIDTH, MIN_SIZE, useChartStore } from '~~/stores/chart'

useHead({ title: 'Editor · KnitBit' })

const chart = useChartStore()

// ---- Size ------------------------------------------------------------------

/** Width and height controls: − / number field / +. */
const sizes = computed(() => [
  { key: 'width', label: 'Width', value: chart.width, max: MAX_WIDTH },
  { key: 'height', label: 'Height', value: chart.height, max: MAX_HEIGHT },
] as const)

function setSize(key: 'width' | 'height', value: number) {
  if (Number.isNaN(value)) return
  if (key === 'width') resizeTo(value, chart.height)
  else resizeTo(chart.width, value)
}

// ---- Resize notice -----------------------------------------------------------

/**
 * Shrinking deletes the stitches that no longer fit; growing back brings K
 * stitches, not the old pattern. So a resize that dropped P stitches says so
 * and offers Undo. The notice remembers the `cells` array it was made for:
 * any later change (tap, undo, another resize) replaces that array, and the
 * notice disappears by itself, without a watcher.
 */
const resizeNotice = ref<{ removed: number, cells: Uint8Array } | null>(null)

const visibleResizeNotice = computed(() =>
  resizeNotice.value?.cells === chart.cells ? resizeNotice.value : null,
)

/** Every resize on this page goes through here (± buttons, typed size, "Set width to 8"). */
function resizeTo(width: number, height: number) {
  const removed = chart.resize(width, height)
  // No "else null": a resize that removed nothing either changed `cells`
  // (so an old notice is already hidden) or changed nothing at all (e.g. the
  // same size typed again), and then the notice is still true.
  if (removed > 0) resizeNotice.value = { removed, cells: chart.cells }
}

// ---- Zoom ------------------------------------------------------------------

/**
 * Fit scales the chart to the screen; at 32 stitches that is about 8px per
 * stitch on a phone, too small to tap reliably. Large draws every stitch at
 * 32px and lets the chart card scroll sideways. Not saved: it is a viewing
 * choice, not part of the chart.
 */
type Zoom = 'fit' | 'large'
const zoom = ref<Zoom>('fit')
const zooms: { value: Zoom, label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: 'large', label: 'Large' },
]
const LARGE_STITCH_PX = 32

function onSizeInput(key: 'width' | 'height', event: Event) {
  const input = event.target as HTMLInputElement
  setSize(key, input.valueAsNumber)
  // The store clamps the value (e.g. 500 → 200); show what was really applied.
  input.value = String(key === 'width' ? chart.width : chart.height)
}

// ---- Parity ----------------------------------------------------------------

type ParityResult =
  | { kind: 'valid' }
  | { kind: 'error', position: CellPosition }
  | { kind: 'multiple' }
  | { kind: 'fixed' }

const parityResult = ref<ParityResult | null>(null)

function runParityCheck() {
  try {
    const position = checkParity(chart.matrix)
    parityResult.value = position ? { kind: 'error', position } : { kind: 'valid' }
  }
  catch {
    // checkParity throws when the odd rows and columns do not point to one stitch.
    parityResult.value = { kind: 'multiple' }
  }
}

// True between a tap on the stitch the check named and the watcher below.
// A plain variable, not a ref: nothing is drawn from it.
let fixingWrongStitch = false

/**
 * A tap on the chart. If it is the stitch the check found to be wrong,
 * flipping it back makes every row and column even again (the check found
 * exactly one odd row and one odd column, and this stitch is in both), so
 * the result can say "fixed" without checking again.
 */
function onToggle(row: number, col: number) {
  const target = highlight.value
  fixingWrongStitch = target?.row === row && target?.col === col
  chart.toggle(row, col)
}

// A check result describes the chart it was made on. Every change (a tap,
// undo, redo, clear, adding or removing parity) replaces `cells`, so any
// change clears the result, except the tap that fixes the wrong stitch,
// which replaces it with "fixed" and removes the highlight at the same time.
watch(() => chart.cells, () => {
  parityResult.value = fixingWrongStitch ? { kind: 'fixed' } : null
  fixingWrongStitch = false
})

const highlight = computed(() =>
  parityResult.value?.kind === 'error' ? parityResult.value.position : null,
)

// ---- As text ---------------------------------------------------------------

/**
 * The chart read as text. Only possible when every row is one byte (width 8),
 * and only if the bytes form valid UTF-8: e.g. "ë" needs two rows that belong
 * together, so one of them alone is not valid. With parity on, only the data
 * part is read; the parity row and column are not part of the text.
 */
const asText = computed(() => {
  const data = chart.dataMatrix
  if ((data[0]?.length ?? 0) !== BITS_PER_BYTE) return { kind: 'wrong-width' as const }
  try {
    return { kind: 'text' as const, text: matrixToText(data) }
  }
  catch {
    return { kind: 'invalid' as const }
  }
})
</script>

<template>
  <section class="page">
    <h1>Editor</h1>

    <div class="card">
      <div class="sizes">
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
              :disabled="!chart.canResize || size.value <= MIN_SIZE"
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
              :disabled="!chart.canResize"
              :aria-labelledby="`size-${size.key}`"
              :data-test="`${size.key}-input`"
              @change="onSizeInput(size.key, $event)"
            >
            <button
              type="button"
              class="button size__step"
              :aria-label="`Increase ${size.label.toLowerCase()}`"
              :disabled="!chart.canResize || size.value >= size.max"
              :data-test="`${size.key}-increase`"
              @click="setSize(size.key, size.value + 1)"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <p
        v-if="!chart.canResize"
        class="field__hint sizes__hint"
      >
        Remove parity to change the size.
      </p>
      <div
        v-if="visibleResizeNotice"
        class="resize-notice"
        role="status"
        data-test="resize-notice"
      >
        <span>{{ plural(visibleResizeNotice.removed, 'purl stitch', 'purl stitches') }} removed</span>
        <button
          type="button"
          class="button resize-notice__undo"
          data-test="resize-undo"
          @click="chart.undo()"
        >
          Undo
        </button>
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
        <span class="card__legend">
          Tap a stitch: K ↔ P<template v-if="chart.hasParity"> · tinted, dashed = parity</template>
        </span>
      </div>
      <div
        class="segmented zoom"
        role="tablist"
        aria-label="Chart size"
      >
        <button
          v-for="option in zooms"
          :key="option.value"
          type="button"
          role="tab"
          class="segmented__option"
          :class="{ 'segmented__option--active': zoom === option.value }"
          :aria-selected="zoom === option.value"
          :data-zoom="option.value"
          @click="zoom = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <!-- Scrolls sideways inside the card in Large, so the page itself never does. -->
      <div
        class="chart-scroll"
        data-test="chart-scroll"
      >
        <ChartSvg
          :matrix="chart.matrix"
          :label="`Editable knitting chart, ${plural(chart.height, 'row')} of ${plural(chart.width, 'stitch', 'stitches')}`"
          :parity="chart.hasParity"
          :highlight="highlight"
          :stitch-size="zoom === 'large' ? LARGE_STITCH_PX : undefined"
          :all-row-numbers="zoom === 'large'"
          editable
          @toggle="onToggle"
        />
      </div>
    </div>

    <div class="card">
      <h2>Parity</h2>
      <template v-if="!chart.hasParity">
        <p class="empty parity__intro">
          Adds one stitch to every row (a column on the right) and one row at the top, knitted last,
          so that each row and column has an even number of P stitches. If one stitch is knitted
          wrong later, a check finds it.
        </p>
        <button
          type="button"
          class="button button--filled"
          data-test="add-parity"
          @click="chart.addParity()"
        >
          Add parity
        </button>
      </template>
      <template v-else>
        <div class="parity__actions">
          <button
            type="button"
            class="button button--filled"
            data-test="check-parity"
            @click="runParityCheck"
          >
            Check parity
          </button>
          <button
            type="button"
            class="button"
            data-test="remove-parity"
            @click="chart.removeParity()"
          >
            Remove parity
          </button>
        </div>
        <p
          v-if="parityResult"
          class="parity__result"
          :class="`parity__result--${parityResult.kind}`"
          role="status"
          data-test="parity-result"
        >
          <template v-if="parityResult.kind === 'valid'">
            Parity is correct – no stitch is wrong.
          </template>
          <template v-else-if="parityResult.kind === 'fixed'">
            Fixed – parity is correct again.
          </template>
          <template v-else-if="parityResult.kind === 'error'">
            Row {{ parityResult.position.row + 1 }}, stitch {{ parityResult.position.col + 1 }} is wrong – tap it to fix it.
          </template>
          <template v-else>
            More than one stitch is wrong. Parity can only locate a single error.
          </template>
        </p>
      </template>
    </div>

    <div class="card">
      <h2>As text</h2>
      <!-- On one line: .result keeps whitespace, so no spaces around the text. -->
      <p
        v-if="asText.kind === 'text'"
        class="result"
        data-test="editor-text"
      ><VisibleText :text="asText.text" /></p>
      <p
        v-else-if="asText.kind === 'invalid'"
        class="empty"
        data-test="editor-text-invalid"
      >
        These rows are not valid UTF-8 text yet. Some characters need more than one row, e.g. "ë" needs two.
      </p>
      <template v-else>
        <p class="empty">
          Each row is one byte only when the chart is 8 stitches wide<template v-if="chart.hasParity"> (not counting the parity column)</template>.
        </p>
        <button
          v-if="chart.canResize"
          type="button"
          class="button set-width"
          data-test="set-width-8"
          @click="resizeTo(8, chart.height)"
        >
          Set width to 8
        </button>
      </template>
    </div>

    <div class="card">
      <h2>Row by row</h2>
      <RowInstructions :matrix="chart.matrix" />
    </div>

    <ChartExport
      :matrix="chart.matrix"
      :parity="chart.hasParity"
    />

    <!-- Only visible when printing (see main.css). -->
    <PrintSheet
      :matrix="chart.matrix"
      :parity="chart.hasParity"
    />
  </section>
</template>

<style scoped>
.sizes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.sizes__hint {
  margin: var(--space-3) 0 0;
}

.size {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

/*
 * − field +. The field needs room for "200" (3 digits at 16px ≈ 30px plus
 * padding); on an iPhone SE the old 44px buttons left it only ~25px, which
 * cut off "32". 40px buttons are still easy to hit.
 */
.size__controls {
  display: grid;
  grid-template-columns: 40px minmax(3.5rem, 1fr) 40px;
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
  /* No browser spinner arrows: − and + do that job, and the arrows took
     about 15px of the field in desktop and emulated browsers. */
  appearance: textfield;
  -moz-appearance: textfield;
}

.size__input::-webkit-inner-spin-button,
.size__input::-webkit-outer-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

/* Very narrow phones (320px): width and height one below the other. */
@media (max-width: 359px) {
  .sizes {
    grid-template-columns: 1fr;
  }
}

.resize-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: 10px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 0.9375rem;
  font-weight: 500;
}

.resize-notice__undo {
  width: auto;
  min-height: 44px;
}

.zoom {
  margin-bottom: var(--space-3);
}

/* In Large the chart is wider than the card; only this box scrolls. */
.chart-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.size__input:disabled {
  color: var(--color-muted);
}

.toolbar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.parity__intro {
  margin-bottom: var(--space-3);
  font-size: 0.9375rem;
}

.parity__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.parity__result {
  margin: var(--space-3) 0 0;
  padding: var(--space-3);
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 500;
}

.parity__result--valid,
.parity__result--fixed {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.parity__result--error,
.parity__result--multiple {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.set-width {
  margin-top: var(--space-3);
}
</style>
