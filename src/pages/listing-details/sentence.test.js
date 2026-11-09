import { describe, expect, it } from 'vitest'
import { endSentence } from './sentence'

describe('endSentence', () => {
  it('adds a period', () => {
    expect(endSentence('Nour Aziz')).toBe('Nour Aziz.')
  })
  it('does not double one that is already there', () => {
    expect(endSentence('Lina K.')).toBe('Lina K.')
    expect(endSentence('Lina K. ')).toBe('Lina K.')
  })
  it('keeps other closing punctuation', () => {
    expect(endSentence('Who?')).toBe('Who?')
    expect(endSentence('Yes!')).toBe('Yes!')
  })
})
