<script setup lang="ts">
import { ruleTable, runAutomaton } from '~~/core/automaton'
import { statesToHistogram } from '~~/core/histogram'
import { bubbleSortSteps, mergeSortSteps, parseSortInput } from '~~/core/sorting'
import { MAX_HEIGHT, MAX_WIDTH, MIN_SIZE, useChartStore } from '~~/stores/chart'

useHead({ title: 'Algorithms · KnitBit' })

const chart = useChartStore()

// ---- Cellular automaton ----------------------------------------------------

const RULE_PRESETS = [30, 90, 110]

// v-model.number gives '' while a number field is empty, hence the union type.
const rule = ref<number | ''>(90)
// Odd, so the start stitch is exactly in the middle (see core/automaton.ts).
const automatonWidth = ref<number | ''>(31)
const automatonRows = ref<number | ''>(16)

function isWholeNumberIn(value: number | '', min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
}

/**
 * The automaton chart, or the reasons it cannot be drawn. The width and row
 * limits are the editor's, so "Open in editor" always gets a chart it can show.
 */
const automaton = computed(() => {
  const errors: string[] = []
  if (!isWholeNumberIn(rule.value, 0, 255)) errors.push('The rule must be a whole number from 0 to 255.')
  if (!isWholeNumberIn(automatonWidth.value, MIN_SIZE, MAX_WIDTH)) errors.push(`The width must be from ${MIN_SIZE} to ${MAX_WIDTH}.`)
  if (!isWholeNumberIn(automatonRows.value, MIN_SIZE, MAX_HEIGHT)) errors.push(`The number of rows must be from ${MIN_SIZE} to ${MAX_HEIGHT}.`)
  if (errors.length > 0) return { matrix: null, table: null, errors }

  const r = rule.value as number
  return {
    matrix: runAutomaton(r, automatonWidth.value as number, automatonRows.value as number),
    table: ruleTable(r),
    errors,
  }
})

const ruleBinary = computed(() =>
  typeof rule.value === 'number' ? rule.value.toString(2).padStart(8, '0') : '',
)

/** Same as on the encode page: the chart becomes one undoable step in the editor. */
async function openAutomatonInEditor() {
  if (!automaton.value.matrix) return
  chart.load(automaton.value.matrix)
  await navigateTo('/editor')
}

// ---- Sorting ---------------------------------------------------------------

const SORT_PRESETS = [
  { key: 'example', label: 'Example', text: '5, 1, 4, 2, 8' },
  { key: 'worst', label: 'Worst case', text: '8, 7, 6, 5, 4, 3, 2, 1' },
]

type Algorithm = 'bubble' | 'merge'
const algorithm = ref<Algorithm>('bubble')
const algorithms: { value: Algorithm, label: string }[] = [
  { value: 'bubble', label: 'Bubble sort' },
  { value: 'merge', label: 'Merge sort' },
]

const sortText = ref(SORT_PRESETS[0]!.text)
const sortInput = computed(() => parseSortInput(sortText.value))

/**
 * Both algorithms are always run, so their counts can be shown side by side;
 * the chart only shows the one that is selected.
 */
const sorted = computed(() => {
  const values = sortInput.value.values
  if (!values || values.length === 0) return null
  const bubble = bubbleSortSteps(values)
  const merge = mergeSortSteps(values)
  return {
    bubble: { ...bubble, matrix: statesToHistogram(bubble.states) },
    merge: { ...merge, matrix: statesToHistogram(merge.states) },
  }
})

const selected = computed(() => sorted.value?.[algorithm.value] ?? null)

/**
 * Labels the first row of every block: "Start" for the input, then the pass
 * (or merge level) number.
 *
 * The chart has blocks × height + (blocks − 1) rows (core/histogram.ts), so
 * (rows + 1) / blocks = height + 1: the rows of one block plus the K row
 * after it. Every block therefore starts at a multiple of that number.
 */
const sortRowLabels = computed(() => {
  const steps = selected.value
  if (!steps) return []
  const rowsPerBlock = (steps.matrix.length + 1) / steps.states.length
  return steps.matrix.map((_, row) => {
    if (row % rowsPerBlock !== 0) return ''
    const block = row / rowsPerBlock
    return block === 0 ? 'Start' : String(block)
  })
})

/** One row of the comparison table: the same count for both algorithms. */
const counts = computed(() => {
  if (!sorted.value) return []
  const { bubble, merge } = sorted.value
  return [
    { key: 'passes', label: 'Passes / levels', bubble: bubble.passes, merge: merge.passes },
    { key: 'comparisons', label: 'Comparisons', bubble: bubble.comparisons, merge: merge.comparisons },
    { key: 'rows', label: 'Rows of fabric', bubble: bubble.matrix.length, merge: merge.matrix.length },
  ]
})
</script>

<template>
  <section class="page">
    <h1>Algorithms</h1>

    <!-- Cellular automaton (thesis chapter 4.4) -->
    <div class="card">
      <h2>Cellular automaton</h2>
      <p class="empty intro">
        Each new row is made from the row above it: a stitch looks at itself and its two neighbours and
        the rule says what it becomes. Row 1 starts with one P stitch in the middle. Outside the edges every
        stitch counts as K.
      </p>

      <div class="presets">
        <button
          v-for="preset in RULE_PRESETS"
          :key="preset"
          type="button"
          class="button"
          :class="{ 'button--filled': rule === preset }"
          :aria-pressed="rule === preset"
          :data-test="`rule-preset-${preset}`"
          @click="rule = preset"
        >
          Rule {{ preset }}
        </button>
      </div>

      <div class="numbers">
        <label class="field">
          <span class="field__label">Rule</span>
          <input
            v-model.number="rule"
            class="field__input"
            type="number"
            inputmode="numeric"
            min="0"
            max="255"
            data-test="rule-input"
          >
        </label>
        <label class="field">
          <span class="field__label">Width</span>
          <input
            v-model.number="automatonWidth"
            class="field__input"
            type="number"
            inputmode="numeric"
            :min="MIN_SIZE"
            :max="MAX_WIDTH"
            data-test="automaton-width"
          >
        </label>
        <label class="field">
          <span class="field__label">Rows</span>
          <input
            v-model.number="automatonRows"
            class="field__input"
            type="number"
            inputmode="numeric"
            :min="MIN_SIZE"
            :max="MAX_HEIGHT"
            data-test="automaton-rows"
          >
        </label>
      </div>
    </div>

    <ul
      v-if="automaton.errors.length > 0"
      class="errors"
      role="alert"
    >
      <li
        v-for="error in automaton.errors"
        :key="error"
      >
        {{ error }}
      </li>
    </ul>

    <template v-else>
      <div class="card">
        <div class="card__header">
          <h2>Rule {{ rule }}</h2>
          <span
            class="card__legend"
            data-test="rule-binary"
          >{{ ruleBinary }} in binary</span>
        </div>
        <!-- The 8 neighbourhoods, 111 to 000; the stitches below spell the rule in binary. -->
        <ol
          class="rule-table"
          data-test="rule-table"
        >
          <li
            v-for="(item, i) in automaton.table"
            :key="i"
            class="rule-case"
            :aria-label="`${item.neighbourhood.map(bit => (bit ? 'P' : 'K')).join(' ')} gives ${item.result ? 'P' : 'K'}`"
          >
            <span class="rule-case__above">
              <span
                v-for="(bit, j) in item.neighbourhood"
                :key="j"
                class="stitch"
                :class="bit ? 'stitch--p' : 'stitch--k'"
              />
            </span>
            <span
              class="stitch"
              :class="item.result ? 'stitch--p' : 'stitch--k'"
              data-test="rule-result"
            />
            <span class="rule-case__bit">{{ item.result }}</span>
          </li>
        </ol>
      </div>

      <div
        class="card"
        data-test="automaton-chart"
      >
        <div class="card__header">
          <h2>Chart</h2>
          <span class="card__legend">K = knit (0) · P = purl (1)</span>
        </div>
        <ChartSvg
          :matrix="automaton.matrix!"
          :label="`Rule ${rule}, ${automatonRows} rows of ${automatonWidth} stitches`"
        />
      </div>

      <button
        type="button"
        class="button button--filled"
        data-test="automaton-open-in-editor"
        @click="openAutomatonInEditor"
      >
        Open in editor
      </button>
    </template>

    <!-- Sorting (thesis chapter 4.5) -->
    <div class="card">
      <h2>Sorting</h2>
      <p class="empty intro">
        Every value is a bar of P stitches. The list is knitted once at the start and again after every
        pass, with one K row between them, so a slower algorithm makes a longer piece of fabric.
      </p>

      <div class="presets">
        <button
          v-for="preset in SORT_PRESETS"
          :key="preset.key"
          type="button"
          class="button"
          :class="{ 'button--filled': sortText === preset.text }"
          :aria-pressed="sortText === preset.text"
          :data-test="`sort-preset-${preset.key}`"
          @click="sortText = preset.text"
        >
          {{ preset.label }}
        </button>
      </div>

      <label class="field">
        <span class="field__label">Numbers</span>
        <input
          v-model="sortText"
          class="field__input field__input--mono"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          spellcheck="false"
          data-test="sort-input"
        >
        <span class="field__hint">Up to 8 whole numbers from 1 to 8, separated by commas or spaces.</span>
      </label>
    </div>

    <p
      v-if="sortInput.error"
      class="errors"
      role="alert"
    >
      {{ sortInput.error }}
    </p>

    <p
      v-else-if="!sorted"
      class="empty"
    >
      Enter some numbers to sort them.
    </p>

    <template v-else>
      <div class="card">
        <h2>Bubble sort vs. merge sort</h2>
        <table
          class="counts"
          data-test="sort-counts"
        >
          <thead>
            <tr>
              <th scope="col" />
              <th
                v-for="option in algorithms"
                :key="option.value"
                scope="col"
                :class="{ 'counts__selected': algorithm === option.value }"
              >
                {{ option.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="count in counts"
              :key="count.key"
            >
              <th scope="row">
                {{ count.label }}
              </th>
              <td
                :class="{ 'counts__selected': algorithm === 'bubble' }"
                :data-test="`bubble-${count.key}`"
              >
                {{ count.bubble }}
              </td>
              <td
                :class="{ 'counts__selected': algorithm === 'merge' }"
                :data-test="`merge-${count.key}`"
              >
                {{ count.merge }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="segmented"
        role="tablist"
        aria-label="Algorithm"
      >
        <button
          v-for="option in algorithms"
          :key="option.value"
          type="button"
          role="tab"
          class="segmented__option"
          :class="{ 'segmented__option--active': algorithm === option.value }"
          :aria-selected="algorithm === option.value"
          :data-algorithm="option.value"
          @click="algorithm = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div
        class="card"
        data-test="sort-chart"
      >
        <div class="card__header">
          <h2>Chart</h2>
          <span class="card__legend">
            Right: {{ algorithm === 'bubble' ? 'pass' : 'merge level' }} number
          </span>
        </div>
        <ChartSvg
          :matrix="selected!.matrix"
          :row-labels="sortRowLabels"
          :label="`${algorithm === 'bubble' ? 'Bubble' : 'Merge'} sort chart, ${selected!.matrix.length} rows`"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.intro {
  margin-bottom: var(--space-3);
  font-size: 0.9375rem;
}

.presets {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.numbers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.numbers .field__input {
  min-width: 0;
  text-align: center;
}

/* Rule table: 8 columns, each three stitches with the new stitch below. */
.rule-table {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rule-case {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.rule-case__above {
  display: flex;
  gap: 1px;
}

.rule-case__bit {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

/* 10px squares: 3 of them fit one of 8 columns on a 380px screen. */
.stitch {
  width: 10px;
  height: 10px;
  border: 1px solid var(--color-border);
}

.stitch--k {
  background: var(--color-stitch-k);
}

.stitch--p {
  background: var(--color-stitch-p);
}

.counts {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}

.counts th,
.counts td {
  padding: var(--space-2) var(--space-1);
  border-bottom: 1px solid var(--color-border);
  text-align: right;
}

.counts th[scope="row"] {
  font-weight: 500;
  text-align: left;
}

.counts td {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.counts__selected {
  color: var(--color-accent);
  font-weight: 700;
}
</style>
