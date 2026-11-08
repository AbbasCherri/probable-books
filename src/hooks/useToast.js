import { useContext } from 'react'
import { ToastContext } from '@/context/ToastContext'

/**
 * Returns `toast(message)`. The note shows bottom-right on desktop and above the
 * sticky bar on phones, then leaves after 5 seconds (paused while hovered or focused).
 *
 *   const toast = useToast()
 *   toast('Listed. Good luck with the sale.')
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast() needs <ToastProvider> above it (see RootLayout).')
  return ctx.show
}
