<script setup lang="ts">
import { BITS_PER_BYTE, matrixToText, textToBytes, textToMatrix } from '~~/core/encoding'
import type { ByteInfo } from '~~/core/encoding'
import { parseRow } from '~~/core/notation'
import { rowToRLE } from '~~/core/rle'
import type { BitMatrix } from '~~/core/types'

const { t } = useI18n()
useHead({ title: () => `${t('pages.encode.title')} · KnitBit` })

type Mode = 'encode' | 'decode'
const mode = ref<Mode>('encode')

// ---- Text → Chart ----------------------------------------------------------

const text = ref('')
const bytes = computed(() => textToBytes(text.value))
const matrix = computed(() => textToMatrix(text.value))
// Spread by code point, so "ë" counts as one character (not as a string length of 1 or 2).
const charCount = computed(() => [...text.value].length)
const rowLabels = computed(() => bytes.value.map(labelFor))

const instructions = computed(() =>
  matrix.value.map((row, index) => ({
    number: index + 1,
    label: rowLabels.value[index]!,
    pattern: rowToRLE(row),
  })),
)

/** "F" for a one-byte character, "ë 1/2" and "ë 2/2" for the two rows of "ë". */
function labelFor(info: ByteInfo): string {
  const char = visibleChar(info.char)
  return info.parts > 1 ? `${char} ${info.part}/${info.parts}` : char
}

/** Invisible characters get a symbol so their rows are not unlabelled. */
function visibleChar(char: string): string {
  if (char === ' ') return '␣'
  if (char === '\n') return '↵'
  if (char === '\t') return '⇥'
  return char
}

// ---- Chart → Text ----------------------------------------------------------

const rowsInput = ref('')

const decoded = computed(() => {
  const rows: BitMatrix = []
  const errors: string[] = []

  rowsInput.value.split('\n').forEach((line, index) => {
    if (line.trim() === '') return
    try {
      const row = parseRow(line)
      // Checked here (not only in matrixToText) so the message names the line.
      if (row.length !== BITS_PER_BYTE) {
        errors.push(t('encode.decode.lineError', {
          line: index + 1,
          message: t('encode.decode.wrongLength', { count: row.length }),
        }))
        return
      }
      rows.push(row)
    }
    catch (error) {
      errors.push(t('encode.decode.lineError', { line: index + 1, message: (error as Error).message }))
    }
  })

  if (errors.length > 0) return { rows, text: null, errors }
  try {
    return { rows, text: matrixToText(rows), errors }
  }
  catch {
    // Every row has 8 stitches, so the only remaining failure is invalid UTF-8.
    return { rows, text: null, errors: [t('encode.decode.invalidUtf8')] }
  }
})

/** Fills the decoder with the chart from the other direction, as K/P patterns. */
function useEncodedChart() {
  rowsInput.value = matrix.value.map(rowToRLE).join('\n')
  mode.value = 'decode'
}
</script>

<template>
  <section class="encode">
    <h1>{{ $t('pages.encode.title') }}</h1>

    <div
      class="segmented"
      role="tablist"
      :aria-label="$t('encode.modes.label')"
    >
      <button
        v-for="option in (['encode', 'decode'] as const)"
        :key="option"
        type="button"
        role="tab"
        class="segmented__option"
        :class="{ 'segmented__option--active': mode === option }"
        :aria-selected="mode === option"
        :data-mode="option"
        @click="mode = option"
      >
        {{ $t(`encode.modes.${option}`) }}
      </button>
    </div>

    <!-- Text → Chart -->
    <template v-if="mode === 'encode'">
      <label class="field">
        <span class="field__label">{{ $t('encode.text.label') }}</span>
        <textarea
          v-model="text"
          class="field__input"
          data-test="text-input"
          rows="2"
          maxlength="200"
          autocapitalize="off"
          autocomplete="off"
          spellcheck="false"
          :placeholder="$t('encode.text.placeholder')"
        />
        <span
          v-if="text"
          class="field__hint"
        >
          {{ $t('encode.text.stats', { chars: charCount, rows: matrix.length }) }}
        </span>
      </label>

      <p
        v-if="matrix.length === 0"
        class="empty"
      >
        {{ $t('encode.chart.empty') }}
      </p>

      <template v-else>
        <div class="card">
          <div class="card__header">
            <h2>{{ $t('encode.chart.title') }}</h2>
            <span class="card__legend">{{ $t('encode.chart.legend') }}</span>
          </div>
          <ChartSvg
            :matrix="matrix"
            :row-labels="rowLabels"
            :label="$t('encode.chart.aria', { rows: matrix.length })"
          />
        </div>

        <div class="card">
          <h2>{{ $t('encode.instructions.title') }}</h2>
          <ol class="instructions">
            <li
              v-for="item in instructions"
              :key="item.number"
              class="instructions__row"
            >
              <span class="instructions__number">{{ $t('encode.instructions.row', { n: item.number }) }}</span>
              <span class="instructions__char">{{ item.label }}</span>
              <span
                class="instructions__pattern"
                data-test="pattern"
              >{{ item.pattern }}</span>
            </li>
          </ol>
          <button
            type="button"
            class="button"
            data-test="use-encoded"
            @click="useEncodedChart"
          >
            {{ $t('encode.decode.useEncoded') }}
          </button>
        </div>
      </template>
    </template>

    <!-- Chart → Text -->
    <template v-else>
      <label class="field">
        <span class="field__label">{{ $t('encode.decode.label') }}</span>
        <textarea
          v-model="rowsInput"
          class="field__input field__input--mono"
          data-test="rows-input"
          rows="6"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          :placeholder="$t('encode.decode.placeholder')"
        />
        <span class="field__hint">{{ $t('encode.decode.hint') }}</span>
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
        {{ $t('encode.decode.empty') }}
      </p>

      <div
        v-else
        class="card"
      >
        <h2>{{ $t('encode.decode.result') }}</h2>
        <p
          class="result"
          data-test="decoded-text"
        >
          {{ decoded.text }}
        </p>
      </div>

      <div
        v-if="decoded.rows.length > 0"
        class="card"
      >
        <h2>{{ $t('encode.chart.title') }}</h2>
        <ChartSvg
          :matrix="decoded.rows"
          :label="$t('encode.chart.aria', { rows: decoded.rows.length })"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.encode {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

h1 {
  margin: 0;
  font-size: 1.75rem;
}

h2 {
  margin: 0 0 var(--space-3);
  font-size: 1rem;
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border-radius: 10px;
  background: var(--color-border);
}

.segmented__option {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.segmented__option--active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field__label {
  font-size: 0.875rem;
  font-weight: 600;
}

.field__input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  /* 16px or more: iOS Safari zooms the page into any smaller input on focus. */
  font-size: 16px;
  resize: vertical;
}

.field__input:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.field__input--mono {
  font-family: var(--font-mono);
}

.field__hint {
  color: var(--color-muted);
  font-size: 0.8125rem;
}

.empty {
  margin: 0;
  color: var(--color-muted);
}

.card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.card__legend {
  margin-bottom: var(--space-3);
  color: var(--color-muted);
  font-size: 0.8125rem;
}

.instructions {
  margin: 0 0 var(--space-4);
  padding: 0;
  list-style: none;
}

.instructions__row {
  display: grid;
  grid-template-columns: 4.5rem 3.5rem 1fr;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9375rem;
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

.button {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--color-accent);
  border-radius: 10px;
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.errors {
  margin: 0;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-6);
  border-radius: 10px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 0.875rem;
}

.result {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  /* Keep spaces and line breaks of the decoded text visible. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
