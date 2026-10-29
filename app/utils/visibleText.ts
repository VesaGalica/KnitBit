/**
 * Turns characters you cannot see into symbols, so a chart row or a decoded
 * text never looks empty when it is not: space ␣, line break ↵, tab ⇥,
 * other control characters as their Unicode "control picture" (byte 0 → ␀).
 */
export function visibleChar(char: string): string {
  if (char === ' ') return '␣'
  if (char === '\n') return '↵'
  if (char === '\t') return '⇥'
  const code = char.codePointAt(0) ?? 0
  // U+0000–U+001F map to U+2400–U+241F, DEL (U+007F) to U+2421.
  if (code < 0x20) return String.fromCodePoint(0x2400 + code)
  if (code === 0x7f) return '␡'
  return char
}

/** One piece of a text: normal characters, or control characters shown as symbols. */
export interface TextSegment {
  text: string
  control: boolean
}

/**
 * visibleChar for every character, keeping normal spaces and line breaks,
 * split into pieces so the UI can dim the control characters. A decoded
 * chart full of K stitches is a row of zero bytes; as "␀␀␀" in full colour it
 * looks like real text, dimmed it reads as "nothing here".
 *
 * Neighbouring characters of the same kind are joined:
 * "a\u0000\u0000b" → [a], [␀␀ control], [b].
 */
export function visibleSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  for (const char of text) {
    const shown = char === ' ' || char === '\n' ? char : visibleChar(char)
    // Only characters that were replaced by a symbol count as control.
    const control = shown !== char
    const last = segments.at(-1)
    if (last && last.control === control) last.text += shown
    else segments.push({ text: shown, control })
  }
  return segments
}
