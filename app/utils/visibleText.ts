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

/** visibleChar for every character, keeping normal spaces and line breaks. */
export function visibleText(text: string): string {
  return Array.from(text, char => (char === ' ' || char === '\n' ? char : visibleChar(char))).join('')
}
