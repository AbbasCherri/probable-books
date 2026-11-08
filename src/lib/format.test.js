import { describe, it, expect } from 'vitest'
import { centsToInput, formatPrice, parsePriceToCents, plural } from '@/lib/format'

describe('parsePriceToCents', () => {
  it('reads plain and decorated amounts', () => {
    expect(parsePriceToCents('45')).toBe(4500)
    expect(parsePriceToCents('45.5')).toBe(4550)
    expect(parsePriceToCents('$19.99')).toBe(1999)
    expect(parsePriceToCents('1,200')).toBe(120000)
    expect(parsePriceToCents('.5')).toBe(50)
    expect(parsePriceToCents(12)).toBe(1200)
  })

  it('returns null for empty or non-numeric input', () => {
    expect(parsePriceToCents('')).toBeNull()
    expect(parsePriceToCents('   ')).toBeNull()
    expect(parsePriceToCents('abc')).toBeNull()
    expect(parsePriceToCents(null)).toBeNull()
    expect(parsePriceToCents(undefined)).toBeNull()
  })
})

describe('centsToInput', () => {
  it('drops cents for whole dollars and keeps two places otherwise', () => {
    expect(centsToInput(4500)).toBe('45')
    expect(centsToInput(4550)).toBe('45.50')
    expect(centsToInput(1)).toBe('0.01')
    expect(centsToInput(0)).toBe('0')
  })

  it('is empty for missing values', () => {
    expect(centsToInput(null)).toBe('')
    expect(centsToInput(undefined)).toBe('')
  })

  it('round-trips with parsePriceToCents', () => {
    for (const c of [100, 4550, 95000, 1999]) {
      expect(parsePriceToCents(centsToInput(c))).toBe(c)
    }
  })
})

describe('plural', () => {
  it('picks the singular only for exactly one', () => {
    expect(plural(1, 'offer')).toBe('1 offer')
    expect(plural(0, 'offer')).toBe('0 offers')
    expect(plural(2, 'offer')).toBe('2 offers')
  })

  it('takes an irregular plural', () => {
    expect(plural(3, 'copy', 'copies')).toBe('3 copies')
    expect(plural(1, 'copy', 'copies')).toBe('1 copy')
  })
})

describe('formatPrice', () => {
  it('still formats whole and fractional dollars', () => {
    expect(formatPrice(4500)).toBe('$45')
    expect(formatPrice(4550)).toBe('$45.50')
  })
})
