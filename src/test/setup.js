import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// No globals in this project, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
