import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from './useTheme'

const html = document.documentElement

// jsdom has no matchMedia; a controllable stand-in for prefers-color-scheme.
let dark = false
const mqListeners = new Set()
function mockMatchMedia() {
  window.matchMedia = vi.fn((query) => ({
    get matches() {
      return query.includes('dark') ? dark : false
    },
    media: query,
    addEventListener: (_type, fn) => mqListeners.add(fn),
    removeEventListener: (_type, fn) => mqListeners.delete(fn),
  }))
}
function setSystemDark(value) {
  dark = value
  mqListeners.forEach((fn) => fn())
}

beforeEach(() => {
  dark = false
  mqListeners.clear()
  mockMatchMedia()
})

afterEach(() => {
  vi.restoreAllMocks()
  html.removeAttribute('data-theme')
  delete window.matchMedia
})

describe('useTheme', () => {
  it('starts on system with nothing saved', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('system')
  })

  it('reads a saved choice', () => {
    localStorage.setItem('pb.theme', 'night')
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('night')
  })

  it('ignores junk in storage', () => {
    localStorage.setItem('pb.theme', '"night"')
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('system')
  })

  it('saves day or night raw and sets data-theme on <html>', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current[1]('night'))
    expect(localStorage.getItem('pb.theme')).toBe('night')
    expect(html).toHaveAttribute('data-theme', 'night')
    expect(result.current[0]).toBe('night')
    act(() => result.current[1]('day'))
    expect(localStorage.getItem('pb.theme')).toBe('day')
    expect(html).toHaveAttribute('data-theme', 'day')
  })

  it('system removes the saved choice and the attribute', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current[1]('night'))
    act(() => result.current[1]('system'))
    expect(localStorage.getItem('pb.theme')).toBeNull()
    expect(html).not.toHaveAttribute('data-theme')
    expect(result.current[0]).toBe('system')
  })

  it('keeps every control in sync', () => {
    const footer = renderHook(() => useTheme())
    const menu = renderHook(() => useTheme())
    act(() => footer.result.current[1]('night'))
    expect(menu.result.current[0]).toBe('night')
  })

  it('follows a change saved in another tab', () => {
    const { result } = renderHook(() => useTheme())
    act(() => {
      localStorage.setItem('pb.theme', 'night')
      window.dispatchEvent(new StorageEvent('storage', { key: 'pb.theme' }))
    })
    expect(result.current[0]).toBe('night')
    expect(html).toHaveAttribute('data-theme', 'night')
    act(() => {
      localStorage.removeItem('pb.theme')
      window.dispatchEvent(new StorageEvent('storage', { key: 'pb.theme' }))
    })
    expect(result.current[0]).toBe('system')
    expect(html).not.toHaveAttribute('data-theme')
  })

  it('still applies and reports a choice when storage refuses to save it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    const footer = renderHook(() => useTheme())
    act(() => footer.result.current[1]('night'))
    expect(footer.result.current[0]).toBe('night')
    expect(html).toHaveAttribute('data-theme', 'night')
    // A control mounted later reads the same choice.
    const menu = renderHook(() => useTheme())
    expect(menu.result.current[0]).toBe('night')
  })

  it('falls back to the attribute set before first paint when storage cannot be read', () => {
    html.setAttribute('data-theme', 'day')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('day')
  })

  it('resolves system to the OS setting and follows it', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current[2]).toBe('day')
    act(() => setSystemDark(true))
    expect(result.current[2]).toBe('night')
    act(() => result.current[1]('day'))
    expect(result.current[2]).toBe('day')
  })
})
