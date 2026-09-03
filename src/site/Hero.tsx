import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

import dotSrc from '../assets/IMG_8474.webp'
import letterTSrc from '../assets/IMG_8475.webp'
import letterLSrc from '../assets/IMG_8476.webp'
import letterE1Src from '../assets/IMG_8477.webp'
import letterWSrc from '../assets/IMG_8478.webp'
import letterCSrc from '../assets/IMG_8479.webp'
import letterHSrc from '../assets/IMG_8480.webp'
import letterE2Src from '../assets/IMG_8481.webp'
import letterKSrc from '../assets/IMG_8482.webp'
import owenSrc from '../assets/IMG_8483.webp'

type Layer = {
  src: string
  /**
   * Fraction of the scroll the layer holds back by. Larger = lags harder, so it
   * reads as further away. Everything stays well under 1, so the artwork drifts
   * apart rather than flying off.
   */
  lag: number
  /** Placement within the original 1920×1080 artboard, as percentages. */
  box: { left: number; top: number; width: number; height: number }
}

// The assets arrived as ten copies of the same 1920×1080 canvas, each holding
// one element in its final position and transparent everywhere else. Stacking
// them full-bleed rebuilt the artwork, but it also asked the compositor to
// blend ten viewport-sized textures every frame, which dropped ~40% of frames.
// Each file is now cropped to its own ink and placed by percentage instead, so
// the stack composites about a twentieth of the pixels and still lines up
// exactly. Only translation is animated — no scale, no fade.
const LAYERS: Layer[] = [
  { src: owenSrc, lag: 0.22, box: { left: 4.6354, top: 22.6852, width: 62.7604, height: 53.0556 } },
  { src: letterWSrc, lag: 0.16, box: { left: 56.6667, top: 27.2222, width: 15.0521, height: 22.1296 } },
  { src: letterCSrc, lag: 0.15, box: { left: 57.0313, top: 52.5926, width: 8.5938, height: 22.6852 } },
  { src: letterE1Src, lag: 0.13, box: { left: 72.6563, top: 30.9259, width: 4.7917, height: 14.1667 } },
  { src: letterHSrc, lag: 0.12, box: { left: 68.75, top: 49.537, width: 9.1146, height: 29.0741 } },
  { src: letterLSrc, lag: 0.1, box: { left: 77.8646, top: 30.3704, width: 5.1563, height: 19.7222 } },
  { src: letterE2Src, lag: 0.09, box: { left: 79.0104, top: 53.6111, width: 6.6146, height: 19.4444 } },
  { src: letterTSrc, lag: 0.07, box: { left: 81.5104, top: 21.4815, width: 13.9063, height: 27.963 } },
  { src: letterKSrc, lag: 0.06, box: { left: 87.1354, top: 53.5185, width: 8.0729, height: 19.7222 } },
  { src: dotSrc, lag: 0.02, box: { left: 50.7813, top: 67.1296, width: 4.0104, height: 7.2222 } },
]

// "OWEN WELTCHEK", which is what the empty ring inside the O now spells.
const MORSE = '--- .-- . -. / .-- . .-.. - -.-. .... . -.-'

/**
 * Turns morse into an alternating mark/gap run-length list, measured in dot
 * units: dot 1, dash 3, one unit between elements, three between letters, seven
 * between words. Handed to `stroke-dasharray` alongside a matching
 * `pathLength`, it lays the message round the circle at exactly those
 * proportions no matter what radius the circle happens to be.
 */
function morseSegments(code: string): number[] {
  const segments: number[] = []
  let gap = 0 // silence owed before the next mark
  for (const token of code.trim().split(/\s+/)) {
    if (token === '/') {
      gap = 7
      continue
    }
    if (segments.length && !gap) gap = 3
    for (const symbol of token) {
      if (segments.length) segments.push(gap)
      segments.push(symbol === '-' ? 3 : 1)
      gap = 1
    }
    gap = 0
  }
  segments.push(7) // the seam, so the loop reads as one more word break
  return segments
}

const MORSE_SEGMENTS = morseSegments(MORSE)
const MORSE_UNITS = MORSE_SEGMENTS.reduce((sum, n) => sum + n, 0)

// Measured off the artwork, in its own 1920×1080 coordinates: the centre of the
// O and a radius that lands in the middle of the empty band between the outer
// ring and the inner target. The stroke is kept slim so a single dot still
// reads as a dot rather than a radial bar.
// The warm near-black of the ink that edges the target inside the O, rather
// than a flat #000, so the ring reads as part of the same drawing.
const RING = { cx: 349, cy: 543, r: 128, width: 13, color: '#1c1917' }

// The bouncing dot, in those same artboard coordinates. It sits on the O's own
// axis — the outer ring's centre, which is a little left of the ring above,
// since that one is centred on the off-set target inside. `cy` is where it
// rests: far enough above the top of the O that the hop never crowds it, and
// sized to match the period at the end of the word.
const DOT = { cx: 329, cy: 226, r: 30, color: '#d46e45' }

export default function Hero({ tagline }: { tagline?: string | null }) {
  const sectionRef = useRef<HTMLElement>(null)
  const layerRefs = useRef<(HTMLImageElement | null)[]>([])
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return

    // Write transforms straight to the nodes, at most once per frame. Driving
    // ten layers through React state or motion values re-renders the whole
    // stack on every scroll tick, which is where the stutter came from.
    // translate3d promotes each layer while it is actually moving; a standing
    // `will-change: transform` on all ten measured strictly worse, because it
    // pins ten compositor layers for the whole life of the page.
    let frame = 0
    // How far the stage stays stuck. Cached rather than measured per frame:
    // reading offsetHeight inside the paint forces a layout on every tick.
    let range = 1
    const measure = () => {
      const el = sectionRef.current
      range = el ? Math.max(1, el.offsetHeight - window.innerHeight) : 1
    }

    const paint = () => {
      frame = 0
      // Clamped so the layers settle once the stage lets go, instead of
      // drifting further and further down the page behind the content.
      const travelled = Math.min(window.scrollY, range)
      for (const [i, layer] of LAYERS.entries()) {
        const el = layerRefs.current[i]
        if (el) el.style.transform = `translate3d(0, ${(travelled * layer.lag).toFixed(2)}px, 0)`
      }
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const onResize = () => {
      measure()
      onScroll()
    }

    measure()
    paint() // a reload can restore a scroll position mid-page
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [reduceMotion])

  return (
    <section
      ref={sectionRef}
      // Taller than the viewport so the drift always has room to play, even on
      // a page with almost no content under it. With motion off that extra
      // runway is dead scroll, so it collapses to a single screen.
      className={`relative bg-paper ${reduceMotion ? 'h-[100svh]' : 'h-[150svh]'}`}
      aria-label="Owen Weltchek"
    >
      {/* Deliberately not clipped: layers lag a little way past the fold, and
          the content section below paints over them with the same background. */}
      <div className="sticky top-0 flex h-[100svh] items-center justify-center">
        {/* The 16:9 frame stands in for the original artboard. Each cropped
            layer is placed as a percentage of it, and the morse ring below maps
            the same artboard through its viewBox, so everything stays
            registered at any viewport without being re-measured. */}
        <div className="relative aspect-[16/9] w-full max-w-[1600px]">
          {LAYERS.map((layer, i) => (
            <img
              key={layer.src}
              ref={(el) => {
                layerRefs.current[i] = el
              }}
              src={layer.src}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute select-none"
              style={{
                left: `${layer.box.left}%`,
                top: `${layer.box.top}%`,
                width: `${layer.box.width}%`,
                height: `${layer.box.height}%`,
              }}
            />
          ))}

          {/* The O is drawn as an empty ring around a target. This fills that
              band with the name in morse and turns it, like a dial. It sits
              still while the letters drift: the viewBox maps the same 1920×1080
              artboard the layers are placed against, so it stays put over the
              artwork's starting position and only ever spins. */}
          <svg
            viewBox="0 0 1920 1080"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <g
              className="morse-orbit"
              style={{ transformBox: 'view-box', transformOrigin: `${RING.cx}px ${RING.cy}px` }}
            >
              <circle
                cx={RING.cx}
                cy={RING.cy}
                r={RING.r}
                fill="none"
                stroke={RING.color}
                strokeWidth={RING.width}
                // pathLength rescales the circle to the message's own clock, so
                // the dasharray below is literally the morse timing.
                pathLength={MORSE_UNITS}
                strokeDasharray={MORSE_SEGMENTS.join(' ')}
              />
            </g>

            {/* A dot resting above the O, bouncing on the spot. Its only
                motion is the hop — it holds its place over the artboard the
                same way the ring does. */}
            <circle
              className="dot-hop"
              cx={DOT.cx}
              cy={DOT.cy}
              r={DOT.r}
              fill={DOT.color}
            />
          </svg>
        </div>

      {tagline && (
        <p className="pointer-events-none absolute bottom-28 left-1/2 z-10 -translate-x-1/2 px-6 text-center text-sm tracking-[0.3em] text-neutral-500 uppercase">
          {tagline}
        </p>
      )}

      {/* The artwork spells the name but carries no text, so this block is the
          real heading — for screen readers and crawlers as much as for the eye.
          It sits clear of the centred tagline and scroll hint. */}
      <div className="pointer-events-none absolute right-6 bottom-36 z-10 max-w-[80vw] text-right sm:right-10 sm:bottom-12">
        <h1 className="text-sm font-semibold tracking-[0.2em] text-neutral-800 uppercase">
          Owen Weltchek
        </h1>
        <p className="mt-2 text-xs tracking-[0.12em] text-neutral-600">
          Carnegie Mellon University
        </p>
        <p className="text-xs tracking-[0.12em] text-neutral-600">
          Bachelors of Engineering and Art
        </p>
        <p className="mt-2 text-[11px] tracking-[0.14em] text-neutral-400">
          Mechanical Engineering • Robotics • Art
        </p>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-xs tracking-[0.4em] text-neutral-400 uppercase"
      >
        Scroll
      </span>
      </div>
    </section>
  )
}
