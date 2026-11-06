<script setup lang="ts">
import { knittingRows } from '~~/core/rows'
import { useChartStore } from '~~/stores/chart'

useHead({ title: 'Knit · KnitBit' })

const chart = useChartStore()

// ---- Rows ------------------------------------------------------------------

/**
 * Every row of the active chart as the knitter works it (core/rows.ts):
 * chart row 1 first, RS rows right to left, WS rows left to right and
 * inverted. Recomputed when the chart changes.
 */
const rows = computed(() => knittingRows(chart.matrix))

/** The store keeps knitRow between 1 and height, so this row always exists. */
const current = computed(() => rows.value[chart.knitRow - 1]!)

const isFirst = computed(() => chart.knitRow <= 1)
const isLast = computed(() => chart.knitRow >= chart.height)

/**
 * An all-K chart is plain stockinette: knittable, so the controls stay, but
 * most likely the user has not made a chart yet, so a hint says where to.
 */
const isAllKnit = computed(() => chart.cells.every(cell => cell === 0))

const SIDE_TEXT = {
  RS: 'Right side · work the chart row right to left',
  WS: 'Wrong side · work left to right, K and P swapped',
} as const

// ---- Small chart -----------------------------------------------------------

const chartBox = ref<HTMLElement | null>(null)

/**
 * Keeps the current row visible inside the small chart's scroll box. The box
 * is scrolled directly instead of using scrollIntoView, which on iOS can also
 * scroll the whole page and move the Previous / Next buttons away.
 */
function scrollToCurrentRow() {
  const box = chartBox.value
  const marker = box?.querySelector('[data-test="current-row"]')
  if (!box || !marker) return
  const boxRect = box.getBoundingClientRect()
  const rowRect = marker.getBoundingClientRect()
  if (rowRect.top < boxRect.top || rowRect.bottom > boxRect.bottom) {
    box.scrollTop += rowRect.top - boxRect.top - (boxRect.height - rowRect.height) / 2
  }
}

watch(() => chart.knitRow, () => nextTick(scrollToCurrentRow))

// ---- Screen wake lock ------------------------------------------------------

const wakeLock = useWakeLock()

// Asked for as soon as the page opens: a knitter has no free hand to tap the
// screen every 30 seconds. The browser may refuse (e.g. low power mode);
// then the indicator shows "off" and a tap can try again.
onMounted(() => {
  void wakeLock.request()
  scrollToCurrentRow()
})

function toggleWakeLock() {
  if (wakeLock.isActive.value) void wakeLock.release()
  else void wakeLock.request()
}
</script>

<template>
  <section class="page">
    <h1>Knit</h1>

    <div
      v-if="isAllKnit"
      class="card hint"
      data-test="all-knit-hint"
    >
      <p class="empty">
        This chart is all knit stitches – plain stockinette. To knit a pattern, start from
        <NuxtLink to="/encode">
          Encode
        </NuxtLink>,
        <NuxtLink to="/editor">
          Editor
        </NuxtLink>
        or
        <NuxtLink to="/algorithms">
          Algorithms
        </NuxtLink>.
      </p>
    </div>

    <!-- The current row, readable from a lap at arm's length. -->
    <div
      class="card current"
      aria-live="polite"
    >
      <div class="current__header">
        <span
          class="current__number"
          data-test="row-number"
        >Row {{ current.number }}</span>
        <span
          class="current__side"
          :class="`current__side--${current.side.toLowerCase()}`"
          data-test="row-side"
        >{{ current.side }}</span>
      </div>
      <p class="current__direction">
        {{ SIDE_TEXT[current.side] }}
      </p>
      <p
        class="current__instruction"
        data-test="instruction"
      >
        {{ current.instruction }}
      </p>
      <!-- The stitches to make, first stitch on the left, same order as the instruction. -->
      <ol
        class="stitches"
        :style="{ '--stitches': current.stitches.length }"
        aria-label="Stitches in working order"
      >
        <li
          v-for="(bit, index) in current.stitches"
          :key="index"
          class="stitches__cell"
          :class="bit === 1 ? 'stitches__cell--p' : 'stitches__cell--k'"
          :aria-label="`Stitch ${index + 1}: ${bit === 1 ? 'purl' : 'knit'}`"
        />
      </ol>
    </div>

    <div class="card">
      <div class="card__header">
        <h2>Chart</h2>
        <span class="card__legend">Row 1 at the bottom, like the fabric</span>
      </div>
      <div
        ref="chartBox"
        class="chart-box"
      >
        <ChartSvg
          :matrix="chart.matrix"
          :parity="chart.hasParity"
          :current-row="chart.knitRow - 1"
          label="Chart, row 1 at the bottom, current row framed"
        />
      </div>
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

    <div class="wake">
      <button
        v-if="wakeLock.isSupported.value"
        type="button"
        class="wake__toggle"
        :aria-pressed="wakeLock.isActive.value"
        data-test="wake-lock"
        @click="toggleWakeLock"
      >
        <span
          class="wake__dot"
          :class="{ 'wake__dot--on': wakeLock.isActive.value }"
        />
        {{ wakeLock.isActive.value ? 'Screen stays on' : 'Screen may turn off – tap to keep it on' }}
      </button>
      <p
        v-else
        class="field__hint"
        data-test="wake-lock-unsupported"
      >
        This browser can't keep the screen on. Set Auto-Lock to Never while you knit.
      </p>
    </div>

    <!-- Sticky above the bottom navigation, so the buttons never scroll away. -->
    <div class="stepper">
      <p
        class="stepper__progress"
        data-test="progress"
      >
        Row {{ chart.knitRow }} of {{ chart.height }}
      </p>
      <progress
        class="stepper__bar"
        :value="chart.knitRow"
        :max="chart.height"
        aria-hidden="true"
      />
      <div class="stepper__buttons">
        <button
          type="button"
          class="button stepper__button"
          :disabled="isFirst"
          data-test="previous"
          @click="chart.previousRow()"
        >
          ← Previous
        </button>
        <button
          type="button"
          class="button button--filled stepper__button"
          :disabled="isLast"
          data-test="next"
          @click="chart.nextRow()"
        >
          Next →
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hint a {
  color: var(--color-accent);
  font-weight: 600;
}

.current__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.current__number {
  font-size: 2rem;
  font-weight: 700;
}

.current__side {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  font-weight: 700;
}

.current__side--rs {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.current__side--ws {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.current__direction {
  margin: var(--space-1) 0 var(--space-3);
  color: var(--color-muted);
  font-size: 0.875rem;
}

.current__instruction {
  margin: 0 0 var(--space-3);
  font-family: var(--font-mono);
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

/* One square per stitch; they shrink to fit up to 32 stitches at 380px. */
.stitches {
  display: grid;
  grid-template-columns: repeat(var(--stitches), minmax(0, 28px));
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stitches__cell {
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: 2px;
}

.stitches__cell--k {
  background: var(--color-stitch-k);
}

.stitches__cell--p {
  background: var(--color-stitch-p);
}

/* Long charts (up to 1000 rows) scroll inside the card, not the whole page. */
.chart-box {
  max-height: 40vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.wake__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wake__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-border);
}

.wake__dot--on {
  background: var(--color-success);
}

.stepper {
  position: sticky;
  bottom: calc(var(--nav-height) + var(--safe-bottom) + var(--space-2));
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  box-shadow: 0 -2px 8px rgb(0 0 0 / 0.08);
}

.stepper__progress {
  margin: 0;
  font-weight: 600;
  text-align: center;
}

.stepper__bar {
  width: 100%;
  height: 6px;
  accent-color: var(--color-accent);
}

.stepper__buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

/* Big targets: easy to hit with a needle in each hand. */
.stepper__button {
  min-height: 64px;
  font-size: 1.125rem;
}
</style>
