import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

/**
 * Owner confirmation before Mark as sold. `onConfirm()` returns a promise; a rejection shows
 * its message in the dialog and keeps it open.
 */
export function MarkSoldDialog({ open, onClose, title, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState(null)

  function close() {
    if (saving) return
    setFailure(null)
    onClose()
  }

  async function confirm() {
    if (saving) return
    setSaving(true)
    setFailure(null)
    try {
      await onConfirm()
    } catch (err) {
      setFailure(err?.message || 'That did not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} title="Mark this as sold?">
      <p className="mt-2 break-words text-ink-700">
        &ldquo;{title}&rdquo; gets a Sold stamp and stops taking offers. Its page stays up
        so old links still work. You can&apos;t undo this.
      </p>
      {failure && (
        <p role="alert" className="mt-4 text-small font-semibold text-redpen-600">
          {failure}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 pb-1 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={close}>
          Keep it listed
        </Button>
        <Button onClick={confirm} aria-disabled={saving || undefined}>
          {saving ? 'Saving…' : 'Mark as sold'}
        </Button>
      </div>
    </Dialog>
  )
}
