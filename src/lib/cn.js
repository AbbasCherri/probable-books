import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Our theme tokens (src/styles/index.css), so twMerge knows which classes conflict: text-small
// is a font size (and must not knock out a text colour next to it), rounded-paper is a radius,
// max-w-page a container width, and so on. Keep in step with the @theme block.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'caption',
        'small',
        'body',
        'reading',
        'lead',
        'note',
        'h3',
        'price',
        'h2',
        'h1-sm',
        'h1',
        'display-sm',
        'display',
      ],
      radius: ['paper', 'dialog'],
      shadow: ['stack'],
      container: ['page', 'form', 'margin'],
      animate: ['hl-draw', 'stamp-land'],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
