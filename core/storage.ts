import type { FlatChart } from './chart'

/**
 * Saving a chart as text (for localStorage) and reading it back safely.
 *
 * The saved form is small, readable JSON:
 *   { "version": 1, "width": 8, "height": 2, "hasParity": false, "cells": "0100011001001001" }
 * `cells` holds one character per stitch, row by row, like the flat chart.
 *
 * Anything read back is treated as untrusted: it may be from an older version
 * of the app, edited by hand, or cut off. parseSavedChart therefore checks
 * every field and returns null instead of throwing, so the app can simply
 * start with an empty chart.
 */

export const SAVE_FORMAT_VERSION = 1

/**
 * Upper limits for a saved chart. Larger than the editor's size controls,
 * because a chart from the encode page (up to 800 rows) plus parity can be
 * bigger than what the controls allow.
 */
export const MAX_SAVED_WIDTH = 64
export const MAX_SAVED_HEIGHT = 1000

export interface SavedChart extends FlatChart {
  hasParity: boolean
}

/** Minimal part of the Web Storage API used here, so tests can pass a fake. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function serializeChart(chart: SavedChart): string {
  return JSON.stringify({
    version: SAVE_FORMAT_VERSION,
    width: chart.width,
    height: chart.height,
    hasParity: chart.hasParity,
    cells: Array.from(chart.cells).join(''),
  })
}

/** Returns the saved chart, or null if `text` is missing or not a valid saved chart. */
export function parseSavedChart(text: string | null): SavedChart | null {
  if (text === null) return null

  let data: unknown
  try {
    data = JSON.parse(text)
  }
  catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null

  const { version, width, height, hasParity, cells } = data as Record<string, unknown>
  if (version !== SAVE_FORMAT_VERSION) return null
  if (!isSize(width, MAX_SAVED_WIDTH) || !isSize(height, MAX_SAVED_HEIGHT)) return null
  if (typeof hasParity !== 'boolean') return null
  // A parity chart has at least one data stitch plus its parity row and column.
  if (hasParity && (width < 2 || height < 2)) return null
  if (typeof cells !== 'string' || cells.length !== width * height || !/^[01]*$/.test(cells)) return null

  return {
    width,
    height,
    hasParity,
    cells: Uint8Array.from(cells, char => (char === '1' ? 1 : 0)),
  }
}

/**
 * Reads the chart saved under `key`. Returns null if nothing usable is saved,
 * or if storage cannot be read at all (some private browsing modes throw).
 */
export function loadChart(storage: KeyValueStorage, key: string): SavedChart | null {
  try {
    return parseSavedChart(storage.getItem(key))
  }
  catch {
    return null
  }
}

/**
 * Saves the chart under `key`. Returns false instead of throwing if storage
 * is full or blocked: losing the save must never break editing.
 */
export function saveChart(storage: KeyValueStorage, key: string, chart: SavedChart): boolean {
  try {
    storage.setItem(key, serializeChart(chart))
    return true
  }
  catch {
    return false
  }
}

function isSize(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max
}
