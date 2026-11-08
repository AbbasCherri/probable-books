import { useEffect, useRef, useState } from 'react'
import { TextField } from '@/components/ui/TextField'

const DELAY = 300

/** Search box. Calls onChange(text) 300ms after typing stops; follows outside changes to `value`. */
export function KeywordFilter({ value, onChange, className }) {
  const [text, setText] = useState(value ?? '')
  const sent = useRef(value ?? '')
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const next = value ?? ''
    if (next !== sent.current) {
      sent.current = next
      setText(next)
    }
  }, [value])

  useEffect(() => {
    if (text === sent.current) return undefined
    const timer = setTimeout(() => {
      sent.current = text
      onChangeRef.current?.(text)
    }, DELAY)
    return () => clearTimeout(timer)
  }, [text])

  return (
    <TextField
      type="search"
      label="Title, author or ISBN"
      autoComplete="off"
      value={text}
      onChange={(e) => setText(e.target.value)}
      className={className}
    />
  )
}
