import { useCallback, useEffect, useRef, useState } from 'react'
import type { CarouselImage } from '../types'

/**
 * A row of images flipped through one at a time, each with its own caption.
 *
 * Built on scroll snapping rather than on a transform: the browser then gives
 * us the swipe, the momentum and the trackpad gesture for nothing, and the
 * arrows below are just a second way to drive the same scroll. The index is
 * read back out of the scroll position, so the two can never disagree.
 */
export default function Carousel({
  images,
  label,
}: {
  images: CarouselImage[]
  /** Names the region for a screen reader — the block's heading, usually. */
  label?: string | null
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const count = images.length

  const goTo = useCallback((next: number) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(next, track.children.length - 1))
    track.scrollTo({
      left: clamped * track.clientWidth,
      // A page that asked for less motion gets the jump, not the glide.
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }, [])

  // The scroll position is the source of truth; this only mirrors it back into
  // React so the dots and the counter can follow a swipe as well as a click.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (track.clientWidth === 0) return
        setIndex(Math.round(track.scrollLeft / track.clientWidth))
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('scroll', onScroll)
    }
  }, [])

  if (count === 0) return null

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label || 'Image carousel'}
      className="grid gap-3"
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        goTo(index + (e.key === 'ArrowLeft' ? -1 : 1))
      }}
    >
      <div
        ref={trackRef}
        // tabIndex so the arrow keys above reach a keyboard user, and so the
        // track can be scrolled without a pointer.
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-sm border border-neutral-900/10 bg-paper [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <figure
            key={`${image.url}-${i}`}
            className="w-full shrink-0 snap-center"
            // Only the visible slide is announced; the others are off-screen
            // rather than absent, which a screen reader would otherwise read
            // as one long strip of images.
            aria-hidden={i !== index}
          >
            {/* A fixed frame with the image contained inside it: a mixed set of
                portrait and landscape photographs would otherwise change the
                height of the whole spread on every swipe. */}
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden">
              <img
                src={image.url}
                alt={image.caption || ''}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-contain"
              />
            </div>
            {image.caption && (
              <figcaption className="border-t border-neutral-900/10 px-4 py-3 text-xs leading-relaxed text-neutral-600">
                {image.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ArrowButton
              direction="previous"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
            />
            <ArrowButton
              direction="next"
              disabled={index === count - 1}
              onClick={() => goTo(index + 1)}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Dots for pointing at, the count for reading. Together they say
                both how far along you are and how much is left. */}
            <div className="flex items-center gap-1.5">
              {images.map((image, i) => (
                <button
                  key={`${image.url}-${i}`}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => goTo(i)}
                  className={[
                    'h-1.5 w-1.5 rounded-full transition-colors',
                    i === index ? 'bg-clay' : 'bg-neutral-900/20 hover:bg-neutral-900/40',
                  ].join(' ')}
                />
              ))}
            </div>
            {/* Polite, so a swipe is reported once it settles rather than on
                every frame of the scroll. */}
            <p aria-live="polite" className="text-[11px] tracking-[0.18em] text-neutral-500">
              {index + 1} / {count}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'previous' | 'next'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={`${direction === 'previous' ? 'Previous' : 'Next'} image`}
      disabled={disabled}
      onClick={onClick}
      className="rounded-sm border border-neutral-900/15 px-2.5 py-1 text-sm text-neutral-700 transition-colors hover:border-clay hover:text-clay disabled:opacity-30 disabled:hover:border-neutral-900/15 disabled:hover:text-neutral-700"
    >
      {direction === 'previous' ? '←' : '→'}
    </button>
  )
}
