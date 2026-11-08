import { createContext } from 'react'

// Holds { show, dismiss } from <ToastProvider>. Read it with useToast().
export const ToastContext = createContext(null)
