import type { Bit, BitMatrix, BitRow } from './types'

/**
 * Elementary cellular automata (thesis chapter 4.4).
 *
 * A row of stitches is the state; the next row is computed stitch by stitch
 * from the stitch above it and its left and right neighbours. These three
 * stitches form a number from 0 (KKK = 000) to 7 (PPP = 111), and bit number
 * n of the rule (0–255) is the new stitch for neighbourhood n. This is
 * Wolfram's numbering: rule 90 = 01011010 in binary, so neighbourhood
 * 110 (= 6) gives bit 6 of 90, which is 1 (P).
 *
 * Edges: every stitch outside the chart counts as K (0), the rows do NOT wrap
 * around. A flat knitted piece has two real edges that are not joined, so the
 * first stitch of a row has no left neighbour, and treating "nothing" as the
 * plain knit stitch is the natural choice. Wrapping around (the last stitch is
 * the left neighbour of the first) would only describe knitting in the round,
 * where the row really is a circle. The edge rule only matters once the
 * pattern reaches the side of the chart.
 */

/** One neighbourhood of the rule table: left, centre, right → new stitch. */
export interface RuleCase {
  neighbourhood: [Bit, Bit, Bit]
  result: Bit
}

/**
 * Runs the automaton and returns `rows` rows. Row 0 is the start row, every
 * following row is the next generation.
 *
 * Without `start`, the start row is all K with one P in the middle
 * (index floor(width / 2), the exact middle when the width is odd).
 */
export function runAutomaton(rule: number, width: number, rows: number, start?: BitRow): BitMatrix {
  assertRule(rule)
  if (!Number.isInteger(width) || width < 1) {
    throw new Error(`Invalid width ${width}, expected a whole number of at least 1.`)
  }
  if (!Number.isInteger(rows) || rows < 1) {
    throw new Error(`Invalid number of rows ${rows}, expected a whole number of at least 1.`)
  }

  let current: BitRow
  if (start) {
    if (start.length !== width) {
      throw new Error(`The start row has ${start.length} stitches, expected ${width}.`)
    }
    if (start.some(bit => bit !== 0 && bit !== 1)) {
      throw new Error('The start row may only contain 0 (K) and 1 (P).')
    }
    current = [...start]
  }
  else {
    current = Array.from({ length: width }, (): Bit => 0)
    current[Math.floor(width / 2)] = 1
  }

  const result: BitMatrix = [current]
  for (let r = 1; r < rows; r++) {
    current = nextRow(rule, current)
    result.push(current)
  }
  return result
}

/** The generation after `row`, with K outside both edges (see the top of the file). */
export function nextRow(rule: number, row: BitRow): BitRow {
  return row.map((center, i) => {
    const left = row[i - 1] ?? 0
    const right = row[i + 1] ?? 0
    return newStitch(rule, left, center, right)
  })
}

/**
 * The 8 cases of a rule in the usual order, from 111 down to 000. Read
 * top to bottom, the results spell the rule in binary:
 * rule 90 → 0, 1, 0, 1, 1, 0, 1, 0.
 */
export function ruleTable(rule: number): RuleCase[] {
  assertRule(rule)
  return Array.from({ length: 8 }, (_, i) => {
    const n = 7 - i
    const neighbourhood: [Bit, Bit, Bit] = [bitOf(n, 2), bitOf(n, 1), bitOf(n, 0)]
    return { neighbourhood, result: bitOf(rule, n) }
  })
}

function newStitch(rule: number, left: Bit, center: Bit, right: Bit): Bit {
  // The neighbourhood read as a 3-bit binary number: left is worth 4, right 1.
  const n = left * 4 + center * 2 + right
  return bitOf(rule, n)
}

/** Bit number `n` of `value` (bit 0 is the rightmost). */
function bitOf(value: number, n: number): Bit {
  return ((value >> n) & 1) as Bit
}

function assertRule(rule: number): void {
  if (!Number.isInteger(rule) || rule < 0 || rule > 255) {
    throw new Error(`Invalid rule ${rule}, expected a whole number from 0 to 255.`)
  }
}
