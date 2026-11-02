import { describe, expect, it } from 'vitest'
import { visibleChar, visibleSegments } from '../../app/utils/visibleText'

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

describe('visibleSegments', () => {
  it('keeps spaces and line breaks and marks control characters', () => {
    expect(visibleSegments('a b\n\u0000\u0000')).toEqual([
      { text: 'a b\n', control: false },
      { text: '␀␀', control: true },
    ])
  })

  it('marks a tab as control and joins pieces of the same kind', () => {
    expect(visibleSegments('x\ty\u001b\u007f')).toEqual([
      { text: 'x', control: false },
      { text: '⇥', control: true },
      { text: 'y', control: false },
      { text: '␛␡', control: true },
    ])
  })

  it('gives no pieces for empty text', () => {
    expect(visibleSegments('')).toEqual([])
  })
})
