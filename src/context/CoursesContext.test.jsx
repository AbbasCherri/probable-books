import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/services/api'
import { CoursesProvider, useCourses } from './CoursesContext'

vi.mock('@/services/api', () => ({
  getCourses: vi.fn(async () => [{ code: 'CHEM 201', title: 'Organic Chemistry I' }]),
}))

afterEach(() => {
  vi.clearAllMocks()
})

const wrapper = ({ children }) => <CoursesProvider>{children}</CoursesProvider>

describe('CoursesProvider', () => {
  it('does not fetch until a consumer asks', () => {
    const { result } = renderHook(() => useCourses(false), { wrapper })
    expect(result.current.courses).toBeNull()
    expect(api.getCourses).not.toHaveBeenCalled()
  })

  it('fetches once when asked and shares the list', async () => {
    const { result } = renderHook(() => ({ a: useCourses(true), b: useCourses(true) }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.a.courses).toHaveLength(1))
    expect(result.current.b.courses).toBe(result.current.a.courses)
    expect(api.getCourses).toHaveBeenCalledTimes(1)
  })

  it('reports a failure and can retry', async () => {
    api.getCourses.mockRejectedValueOnce(new Error('down'))
    const { result } = renderHook(() => useCourses(true), { wrapper })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    result.current.retry()
    await waitFor(() => expect(result.current.courses).toHaveLength(1))
    expect(result.current.error).toBeNull()
  })

  it('needs the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useCourses())).toThrow(/CoursesProvider/)
  })
})
