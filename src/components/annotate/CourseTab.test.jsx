import { screen } from '@testing-library/react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '@/test/render'
import { TAB_CLASSES, tabClassFor, tabColorFor } from '@/lib/courses'
import { CourseTab } from './CourseTab'

describe('CourseTab', () => {
  it('is a 28px chip in its department colour', () => {
    render(<CourseTab code="CHEM 201" />)
    const chip = screen.getByText('CHEM 201')
    expect(chip.tagName).toBe('SPAN')
    expect(chip).toHaveClass('h-7', 'text-on-mark', tabClassFor('CHEM 201'))
  })

  it('asLink: the link is a 44px hit area around the same 28px chip', () => {
    renderWithRouter(<CourseTab code="CHEM 201" asLink className="mt-1" />)
    const link = screen.getByRole('link', { name: 'CHEM 201' })
    expect(link).toHaveAttribute('href', '/courses/CHEM-201')
    expect(link).toHaveClass('min-h-11', 'min-w-11', 'mt-1')
    expect(link.className).not.toMatch(/\bbg-tab-/)
    const chip = link.firstElementChild
    expect(chip).toHaveClass('h-7', tabClassFor('CHEM 201'))
  })

  it('size lg is a 44px chip in body type', () => {
    renderWithRouter(<CourseTab code="MATH 218" asLink size="lg" />)
    const chip = screen.getByRole('link', { name: 'MATH 218' }).firstElementChild
    expect(chip).toHaveClass('h-11', 'px-3', 'text-body')
    expect(chip).not.toHaveClass('h-7')
  })
})

describe('tab colours', () => {
  it('exports one bg class per tab colour, same department same class', () => {
    expect(Object.keys(TAB_CLASSES)).toEqual([
      'sage',
      'sky',
      'butter',
      'rose',
      'lilac',
      'sand',
    ])
    expect(tabClassFor('CHEM 201')).toBe(TAB_CLASSES[tabColorFor('CHEM 201')])
    expect(tabClassFor('CHEM 201')).toBe(tabClassFor('CHEM 335'))
    expect(tabClassFor('CHEM 201')).toMatch(/^bg-tab-/)
  })
})
