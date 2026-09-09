import { useEffect, useRef, useState } from 'react'
import {
  type EditorSlide,
  revokeSlidePreviews,
  toPendingSlides,
} from './carouselSlides'
import { IMAGE_ACCEPT, IMAGE_TYPES, MAX_UPLOAD_BYTES } from './upload'
import { alert, breakable, button, buttonDanger, fileInput, input, label } from './ui'

interface Props {
  /** Scopes the input ids to this form; see BlockForm for why. */
  uid: string
  slides: EditorSlide[]
  onChange: (slides: EditorSlide[]) => void
  disabled?: boolean
}

/**
 * The carousel's slides: add images, caption each one, put them in the order
 * they should be flipped through.
 *
 * Order here is the order on the site, so it's edited with buttons rather than
 * a drag: this list sits inside a form, and the surrounding page already drags
 * blocks around — two drag targets nested one inside the other are a coin toss
 * for the pointer.
 */
export default function CarouselEditor({ uid, slides, onChange, disabled }: Props) {
  const [error, setError] = useState<string | null>(null)
  // Clearing it after each pick is what lets the same file be chosen twice in
  // a row: without it the input's value is unchanged and no event fires.
  const picker = useRef<HTMLInputElement>(null)

  // Whatever is still on screen when the form closes — cancelled, or saved and
  // reset — still holds an object URL per pending slide. A ref, because the
  // cleanup has to run on unmount only, and an effect that depended on `slides`
  // would instead revoke the previews on every keystroke in a caption.
  const latest = useRef(slides)
  useEffect(() => {
    latest.current = slides
  }, [slides])
  useEffect(() => () => revokeSlidePreviews(latest.current), [])

  function add(files: FileList | null) {
    if (!files || files.length === 0) return
    const chosen = Array.from(files)
    const tooBig = chosen.filter((file) => file.size > MAX_UPLOAD_BYTES)
    if (tooBig.length > 0) {
      setError(`Too large (50 MB max): ${tooBig.map((f) => f.name).join(', ')}`)
      return
    }
    // A picker's `accept` is a filter, not a rule — a file dragged in, or
    // chosen through "All files", arrives whatever its type. Caught here so it
    // is refused while it is being added rather than at the end of a save that
    // has already uploaded the slides in front of it.
    const wrongType = chosen.filter((file) => !IMAGE_TYPES.includes(file.type))
    if (wrongType.length > 0) {
      setError(
        `Not an image the store takes: ${wrongType.map((f) => f.name).join(', ')}. ` +
          'Use JPEG, PNG, WebP, GIF, AVIF or SVG.',
      )
      return
    }
    setError(null)
    onChange([...slides, ...toPendingSlides(chosen)])
  }

  function update(key: string, caption: string) {
    onChange(slides.map((s) => (s.key === key ? { ...s, caption } : s)))
  }

  function move(index: number, delta: number) {
    const to = index + delta
    if (to < 0 || to >= slides.length) return
    const next = [...slides]
    next.splice(to, 0, ...next.splice(index, 1))
    onChange(next)
  }

  function remove(index: number) {
    const [dropped] = slides.slice(index, index + 1)
    // Only the preview goes; the stored file is left alone until the block is
    // saved, so a removal that's never saved doesn't delete anything real.
    if (dropped) revokeSlidePreviews([dropped])
    onChange(slides.filter((_, i) => i !== index))
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className={label}>Images</span>
        <span className="text-sm text-neutral-600">
          {slides.length === 0
            ? 'No images yet'
            : `${slides.length} image${slides.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {slides.length > 0 && (
        <ul className="min-w-0 divide-y divide-neutral-200 border-y border-neutral-200">
          {slides.map((slide, index) => (
            <li key={slide.key} className="flex items-start gap-3 py-3">
              <img
                src={slide.preview}
                alt=""
                className="h-16 w-16 shrink-0 rounded border border-neutral-200 object-cover"
              />
              <div className="grid min-w-0 flex-1 gap-1.5">
                <label htmlFor={`${uid}-slide-${slide.key}`} className={`${breakable} text-sm`}>
                  {index + 1}. {slide.fileName || 'Image'}
                  {slide.file && <span className="text-neutral-500"> — not uploaded yet</span>}
                </label>
                <input
                  id={`${uid}-slide-${slide.key}`}
                  className={input}
                  value={slide.caption}
                  placeholder="Caption"
                  onChange={(e) => update(slide.key, e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={button}
                    aria-label={`Move image ${index + 1} earlier`}
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={button}
                    aria-label={`Move image ${index + 1} later`}
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === slides.length - 1}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  className={buttonDanger}
                  onClick={() => remove(index)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label htmlFor={`${uid}-slides`} className="sr-only">
          Add images to the carousel
        </label>
        <input
          id={`${uid}-slides`}
          ref={picker}
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          className={fileInput}
          disabled={disabled}
          onChange={(e) => {
            add(e.target.files)
            if (picker.current) picker.current.value = ''
          }}
        />
        <p className="mt-1 text-sm text-neutral-600">
          Choose one or more images (JPEG, PNG, WebP, GIF, AVIF or SVG). They
          upload when you save.
        </p>
      </div>

      {error && (
        <p role="alert" className={alert}>
          {error}
        </p>
      )}
    </div>
  )
}
