<script setup lang="ts">
import { BITS_PER_BYTE, matrixToText, textToBytes, textToMatrix } from '~~/core/encoding'
import type { ByteInfo } from '~~/core/encoding'
import { parseRow } from '~~/core/notation'
import { rowToRLE } from '~~/core/rle'
import type { BitMatrix } from '~~/core/types'
import { useChartStore } from '~~/stores/chart'

useHead({ title: 'Encode · KnitBit' })

const chart = useChartStore()

type Mode = 'encode' | 'decode'
const mode = ref<Mode>('encode')
const modes: { value: Mode, label: string }[] = [
  { value: 'encode', label: 'Text → Chart' },
  { value: 'decode', label: 'Chart → Text' },
]

// ---- Text → Chart ----------------------------------------------------------

const text = ref('')
const bytes = computed(() => textToBytes(text.value))
const matrix = computed(() => textToMatrix(text.value))
// Spread by code point, so "ë" counts as one character (not as a string length of 1 or 2).
const charCount = computed(() => [...text.value].length)
const rowLabels = computed(() => bytes.value.map(labelFor))

/**
 * "F" for a one-byte character, "ë 1/2" and "ë 2/2" for the two rows of "ë".
 * visibleChar (app/utils) gives invisible characters a symbol, e.g. space → ␣.
 */
function labelFor(info: ByteInfo): string {
  const char = visibleChar(info.char)
  return info.parts > 1 ? `${char} ${info.part}/${info.parts}` : char
}

/** Puts the encoded chart into the editor (as an undoable step) and opens it. */
async function openInEditor() {
  chart.load(matrix.value)
  await navigateTo('/editor')
}

// ---- Chart → Text ----------------------------------------------------------

const rowsInput = ref('')
const rowsPlaceholder = '01000110\nK1, P1, K3, P2, K1'

const decoded = computed(() => {
  const rows: BitMatrix = []
  const errors: string[] = []

  rowsInput.value.split('\n').forEach((line, index) => {
    if (line.trim() === '') return
    try {
      const row = parseRow(line)
      // Checked here (not only in matrixToText) so the message names the line.
      if (row.length !== BITS_PER_BYTE) {
        errors.push(`Line ${index + 1}: a row needs exactly ${BITS_PER_BYTE} stitches, this one has ${row.length}.`)
        return
      }
      rows.push(row)
    }
    catch (error) {
      errors.push(`Line ${index + 1}: ${(error as Error).message}`)
    }
  })

  if (errors.length > 0) return { rows, text: null, errors }
  try {
    return { rows, text: matrixToText(rows), errors }
  }
  catch {
    // Every row has 8 stitches, so the only remaining failure is invalid UTF-8.
    return { rows, text: null, errors: ['These rows are not valid UTF-8 text. Check for a wrong stitch.'] }
  }
})

/** Fills the decoder with the chart from the other direction, as K/P patterns. */
function useEncodedChart() {
  rowsInput.value = matrix.value.map(rowToRLE).join('\n')
  mode.value = 'decode'
}
</script>

<template>
  <section class="page">
    <h1>Encode</h1>

    <div
      class="segmented"
      role="tablist"
      aria-label="Direction"
    >
      <button
        v-for="option in modes"
        :key="option.value"
        type="button"
        role="tab"
        class="segmented__option"
        :class="{ 'segmented__option--active': mode === option.value }"
        :aria-selected="mode === option.value"
        :data-mode="option.value"
        @click="mode = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Text → Chart -->
    <template v-if="mode === 'encode'">
      <label class="field">
        <span class="field__label">Text</span>
        <textarea
          v-model="text"
          class="field__input"
          data-test="text-input"
          rows="2"
          maxlength="200"
          autocapitalize="off"
          autocomplete="off"
          spellcheck="false"
          placeholder="Type a word, e.g. FIEK"
        />
        <span
          v-if="text"
          class="field__hint"
        >
          {{ charCount }} characters → {{ matrix.length }} rows of 8 stitches
        </span>
      </label>

      <p
        v-if="matrix.length === 0"
        class="empty"
      >
        Type some text to see its chart.
      </p>

      <template v-else>
        <div class="card">
          <div class="card__header">
            <h2>Chart</h2>
            <span class="card__legend">K = knit (0) · P = purl (1)</span>
          </div>
          <ChartSvg
            :matrix="matrix"
            :row-labels="rowLabels"
            :label="`Knitting chart with ${matrix.length} rows of 8 stitches`"
          />
        </div>

        <div class="card">
          <h2>Row by row</h2>
          <RowInstructions
            :matrix="matrix"
            :row-labels="rowLabels"
          />
        </div>

        <div class="actions">
          <button
            type="button"
            class="button button--filled"
            data-test="open-in-editor"
            @click="openInEditor"
          >
            Open in editor
          </button>
          <button
            type="button"
            class="button"
            data-test="use-encoded"
            @click="useEncodedChart"
          >
            Use the chart from Text → Chart
          </button>
        </div>
      </template>
    </template>

    <!-- Chart → Text -->
    <template v-else>
      <label class="field">
        <span class="field__label">Rows</span>
        <textarea
          v-model="rowsInput"
          class="field__input field__input--mono"
          data-test="rows-input"
          rows="6"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          :placeholder="rowsPlaceholder"
        />
        <span class="field__hint">One row per line: 8 digits (0 = knit, 1 = purl), a pattern such as K1, P1, K3, P2, K1, or a repeat such as [K2, P2] x2.</span>
      </label>

      <ul
        v-if="decoded.errors.length > 0"
        class="errors"
        role="alert"
      >
        <li
          v-for="error in decoded.errors"
          :key="error"
        >
          {{ error }}
        </li>
      </ul>

      <p
        v-else-if="decoded.rows.length === 0"
        class="empty"
      >
        Enter rows to decode them.
      </p>

      <div
        v-else
        class="card"
      >
        <h2>Decoded text</h2>
        <!-- On one line: .result keeps whitespace, so no spaces around the text. -->
        <p
          class="result"
          data-test="decoded-text"
        ><VisibleText :text="decoded.text ?? ''" /></p>
      </div>

      <div
        v-if="decoded.rows.length > 0"
        class="card"
      >
        <h2>Chart</h2>
        <ChartSvg
          :matrix="decoded.rows"
          :label="`Knitting chart with ${decoded.rows.length} rows of 8 stitches`"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
/* Page-specific styles only; cards, fields and buttons come from main.css. */

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
