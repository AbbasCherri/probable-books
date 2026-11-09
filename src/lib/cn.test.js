import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it.each([
    [['rounded-paper', 'rounded-none'], 'rounded-none'],
    [['rounded-none', 'rounded-dialog'], 'rounded-dialog'],
    [['shadow-stack', 'shadow-none'], 'shadow-none'],
    [['text-small', 'text-body'], 'text-body'],
    [['text-caption', 'sm:text-h3', 'text-price'], 'sm:text-h3 text-price'],
    [['max-w-page', 'max-w-form'], 'max-w-form'],
    [['w-margin', 'w-full'], 'w-full'],
    [['animate-hl-draw', 'animate-stamp-land'], 'animate-stamp-land'],
    [['z-sticky', 'z-modal'], 'z-modal'],
    [['z-popover', 'z-10'], 'z-10'],
  ])('lets the later of conflicting tokens win: %j', (input, expected) => {
    expect(cn(...input)).toBe(expected)
  })

  it.each([
    ['text-small', 'text-ink-700'],
    ['text-lead', 'text-on-mark'],
    ['text-display-sm', 'text-redpen-600'],
    ['text-note', 'text-graphite'],
  ])('keeps a size token and a colour together: %s %s', (size, colour) => {
    expect(cn(size, colour)).toBe(`${size} ${colour}`)
  })
})
