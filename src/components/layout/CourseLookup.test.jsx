import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '@/test/render'
import * as api from '@/services/api'
import { CourseLookup } from './CourseLookup'

const COURSES = [
  { code: 'CHEM 201', title: 'Organic Chemistry I' },
  { code: 'CHEM 202', title: 'Organic Chemistry II' },
  { code: 'BIOL 201', title: 'Cell Biology' },
  { code: 'MATH 218', title: 'Linear Algebra' },
]

function setup(props = {}) {
  return renderWithRouter(<CourseLookup courses={COURSES} {...props} />, {
    routes: [
      { path: '/courses/:code', element: <p>Course page</p> },
      { path: '/browse', element: <p>Browse page</p> },
    ],
  })
}

const input = () => screen.getByRole('combobox', { name: 'Course code or title' })
const lookupStatus = () => within(input().closest('form')).getByRole('status')

describe('CourseLookup', () => {
  it('never fetches: it lists the courses it is given', async () => {
    const spy = vi.spyOn(api, 'getCourses')
    const { user } = setup()
    await user.type(input(), 'chem')
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(spy).not.toHaveBeenCalled()
  })

  it('orders matches best first (matchCourses): exact code before title matches', async () => {
    const { user } = setup()
    await user.type(input(), 'organic')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'CHEM 201Organic Chemistry I',
      'CHEM 202Organic Chemistry II',
    ])
  })

  it('says how many courses match, in a visually hidden status', async () => {
    const { user } = setup()
    await user.type(input(), 'chem')
    expect(lookupStatus()).toHaveTextContent('2 courses found')
    await user.clear(input())
    await user.type(input(), 'math')
    expect(lookupStatus()).toHaveTextContent('1 course found')
    await user.type(input(), 'zzz')
    expect(lookupStatus()).toHaveTextContent('No matching courses')
    expect(lookupStatus()).toHaveClass('sr-only')
  })

  it('marks the active option with a 2px ink rule and semibold, not colour alone', async () => {
    const { user } = setup()
    await user.type(input(), 'chem')
    await user.keyboard('{ArrowDown}')
    const [first, second] = screen.getAllByRole('option')
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(first).toHaveClass('border-l-2', 'border-ink-900', 'font-semibold')
    expect(second).toHaveClass('border-transparent')
    expect(second).not.toHaveClass('font-semibold')
  })

  it('first Esc closes the list (and stops there), second clears the text', async () => {
    const outer = vi.fn()
    const { user } = renderWithRouter(
      <div onKeyDown={(e) => e.key === 'Escape' && outer()}>
        <CourseLookup courses={COURSES} />
      </div>,
    )
    await user.type(input(), 'chem')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(input()).toHaveValue('chem')
    expect(outer).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(input()).toHaveValue('')
    expect(outer).not.toHaveBeenCalled()
    // Nothing left to close or clear: Esc goes on to the panel around it.
    await user.keyboard('{Escape}')
    expect(outer).toHaveBeenCalledOnce()
  })

  it('Enter on the active option goes to its course page', async () => {
    const onNavigate = vi.fn()
    const { user, router } = setup({ onNavigate })
    await user.type(input(), 'math')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(router.state.location.pathname).toBe('/courses/MATH-218')
    expect(onNavigate).toHaveBeenCalled()
  })

  it('works before the courses arrive (null): a typed code still goes to its page', async () => {
    const { user, router } = setup({ courses: null })
    await user.type(input(), 'chem 201{Enter}')
    expect(router.state.location.pathname).toBe('/courses/CHEM-201')
  })
})
