import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Our font-size tokens (text-body, text-small, ...) must not be mistaken for text colours,
// or twMerge drops the real colour class next to them.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'display-sm',
            'h1',
            'h1-sm',
            'h2',
            'h3',
            'body',
            'reading',
            'small',
            'note',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
