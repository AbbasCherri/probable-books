import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

afterEach(() => {
  document.title = ''
})

describe('useDocumentTitle', () => {
  it('sets "<title> | Probable Books"', () => {
    renderHook(() => useDocumentTitle('Browse'))
    expect(document.title).toBe('Browse | Probable Books')
  })

  it('uses the plain site name with no title', () => {
    renderHook(() => useDocumentTitle())
    expect(document.title).toBe('Probable Books')
  })

  it('follows a changing title', () => {
    const { rerender } = renderHook(({ t }) => useDocumentTitle(t), {
      initialProps: { t: 'CHEM 201' },
    })
    rerender({ t: 'CHEM 201 Organic Chemistry I' })
    expect(document.title).toBe('CHEM 201 Organic Chemistry I | Probable Books')
  })

  it('restores the site name on unmount, so the next page never shows a stale title', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Your ledger'))
    unmount()
    expect(document.title).toBe('Probable Books')
  })
})
