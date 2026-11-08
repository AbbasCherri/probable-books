import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Upload, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'
import { MAX_PHOTOS, newKey } from './listingForm'

const MAX_BYTES = 10 * 1024 * 1024
const PHOTO_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/
const PHOTO_EXT = /\.(jpe?g|png|webp|heic|heif)$/i

function isPhoto(file) {
  return PHOTO_TYPES.test(file.type) || PHOTO_EXT.test(file.name)
}

function hasFiles(e) {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

/**
 * 1 to 6 photos; the first is the cover (section 4).
 * Drop files or use the button (on phones the button opens the camera or library).
 * Reorder by dragging a photo, or with the arrow buttons, which work by keyboard.
 *
 * photos: [{ key, url, alt, file? }]. New photos get an object URL for the mock API;
 * swap in a real upload when the backend exists.
 */
export function PhotoUploader({ id, photos, onChange, error, max = MAX_PHOTOS }) {
  const inputRef = useRef(null)
  const [dropping, setDropping] = useState(false)
  const [dragKey, setDragKey] = useState(null)
  const [problems, setProblems] = useState([])
  const [announce, setAnnounce] = useState('')
  const room = max - photos.length

  function addFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (!files.length) return
    const next = []
    const msgs = []
    let overLimit = 0
    for (const file of files) {
      if (!isPhoto(file))
        msgs.push(`${file.name} isn't a photo. Add a JPG, PNG, WebP or HEIC.`)
      else if (file.size > MAX_BYTES)
        msgs.push(`${file.name} is over 10 MB. Try a smaller photo.`)
      else if (next.length >= room) overLimit += 1
      else
        next.push({ key: newKey('photo'), url: URL.createObjectURL(file), alt: '', file })
    }
    if (overLimit)
      msgs.push(
        `${max} photos is the limit, so ${overLimit} ${overLimit === 1 ? 'was' : 'were'} left out.`,
      )
    setProblems(msgs)
    if (next.length) {
      onChange([...photos, ...next])
      setAnnounce(
        `${next.length} ${next.length === 1 ? 'photo' : 'photos'} added. ${photos.length + next.length} of ${max}.`,
      )
    }
  }

  function move(from, to) {
    if (to < 0 || to >= photos.length || from === to) return
    const list = photos.slice()
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
    onChange(list)
    setAnnounce(
      to === 0
        ? `Photo ${from + 1} is now the cover.`
        : `Photo moved to position ${to + 1}.`,
    )
  }

  function remove(index) {
    const photo = photos[index]
    if (photo.file) URL.revokeObjectURL(photo.url)
    onChange(photos.filter((_, i) => i !== index))
    setProblems([])
    setAnnounce(`Photo ${index + 1} removed.`)
  }

  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-3">
      {room > 0 && (
        <div
          onDragOver={(e) => {
            if (!hasFiles(e)) return
            e.preventDefault()
            setDropping(true)
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={(e) => {
            if (!hasFiles(e)) return
            e.preventDefault()
            setDropping(false)
            addFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex flex-col md:min-h-40 md:items-center md:justify-center md:gap-2.5 md:rounded-paper md:border-2 md:border-dashed md:p-5 md:text-center',
            dropping
              ? 'md:border-pen-600 md:bg-pen-50'
              : 'md:border-ink-500 md:bg-paper-50',
          )}
        >
          <Upload
            size={26}
            strokeWidth={1.5}
            aria-hidden="true"
            className="hidden text-ink-700 md:block"
          />
          <p className="hidden font-medium md:block">
            {dropping ? 'Drop to add them' : 'Drop photos here'}
          </p>
          <button
            id={id}
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-paper border border-ink-900 bg-paper-50 px-4 font-medium transition-colors duration-150 ease-out hover:bg-paper-200 md:min-h-11 md:w-auto"
          >
            <Camera
              size={20}
              strokeWidth={1.5}
              aria-hidden="true"
              className="md:hidden"
            />
            <span className="md:hidden">Take or choose photos</span>
            <span className="hidden md:inline">Choose files</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {photos.length > 0 && (
        <ol
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          aria-label="Your photos, in order"
        >
          {photos.map((photo, i) => (
            <li
              key={photo.key}
              draggable
              onDragStart={(e) => {
                setDragKey(photo.key)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => setDragKey(null)}
              onDragOver={(e) => {
                if (dragKey) e.preventDefault()
              }}
              onDrop={(e) => {
                if (!dragKey) return
                e.preventDefault()
                move(
                  photos.findIndex((p) => p.key === dragKey),
                  i,
                )
                setDragKey(null)
              }}
              className={cn('flex flex-col gap-1', dragKey === photo.key && 'opacity-50')}
            >
              <div className="relative overflow-hidden rounded-paper border border-paper-400 bg-paper-200">
                <img
                  src={photo.url}
                  alt={photo.alt || `Photo ${i + 1}${i === 0 ? ', the cover' : ''}`}
                  className="aspect-4/3 w-full object-cover"
                  draggable={false}
                />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 rounded-paper border border-ink-900 bg-paper-50 px-1.5 text-xs font-semibold">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={
                      i === 1
                        ? `Make photo ${i + 1} the cover`
                        : `Move photo ${i + 1} earlier`
                    }
                    className="grid size-11 place-items-center rounded-paper hover:bg-paper-200 disabled:text-ink-300 disabled:hover:bg-transparent"
                  >
                    <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === photos.length - 1}
                    aria-label={`Move photo ${i + 1} later`}
                    className="grid size-11 place-items-center rounded-paper hover:bg-paper-200 disabled:text-ink-300 disabled:hover:bg-transparent"
                  >
                    <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="grid size-11 place-items-center rounded-paper hover:bg-paper-200"
                >
                  <X size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p id={hintId} className="text-sm text-ink-500">
        {photos.length} of {max} added. The first photo is the cover.
        {photos.length > 1 && ' Drag to reorder, or use the arrows.'}
      </p>
      {problems.map((msg) => (
        <FieldError key={msg}>{msg}</FieldError>
      ))}
      <FieldError id={errorId}>{error}</FieldError>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  )
}
