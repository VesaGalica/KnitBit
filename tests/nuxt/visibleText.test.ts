import { describe, expect, it } from 'vitest'
import { visibleChar, visibleText } from '../../app/utils/visibleText'

describe('visibleChar', () => {
  it('gives space, line break and tab a symbol', () => {
    expect(visibleChar(' ')).toBe('␣')
    expect(visibleChar('\n')).toBe('↵')
    expect(visibleChar('\t')).toBe('⇥')
  })

  it('shows control characters as control pictures', () => {
    expect(visibleChar('\u0000')).toBe('␀')
    expect(visibleChar('\u001b')).toBe('␛')
    expect(visibleChar('\u007f')).toBe('␡')
  })

  it('leaves normal characters alone', () => {
    expect(visibleChar('F')).toBe('F')
    expect(visibleChar('ë')).toBe('ë')
  })
})

describe('visibleText', () => {
  it('keeps spaces and line breaks but shows control characters', () => {
    expect(visibleText('a b\n\u0000\u0000')).toBe('a b\n␀␀')
  })
})
