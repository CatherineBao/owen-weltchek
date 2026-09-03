import { useLayoutEffect, useRef } from 'react'
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
  /** Which mark this is. Only used to make the table below readable. */
  id: string
  src: string
  /**
   * Where the layer comes to rest — its place in the finished artwork, as
   * percentages of the original 1920×1080 artboard. This is the wordmark
   * itself: change it and you have redrawn the logo.
   */
  end: { left: number; top: number; width: number; height: number }
  /**
   * Where it opens, before the scroll brings it home. Same coordinates as
   * `end`, so the two can be compared by eye. Only left/top — the layers
   * travel, they never resize. Values outside 0–100 open off the artboard and
   * the mark flies in from beyond the edge.
   */
  start: { left: number; top: number }
}

// The assets arrived as ten copies of the same 1920×1080 canvas, each holding
// one element in its final position and transparent everywhere else. Stacking
// them full-bleed rebuilt the artwork, but it also asked the compositor to
// blend ten viewport-sized textures every frame, which dropped ~40% of frames.
// Each file is now cropped to its own ink and placed by percentage instead, so
// the stack composites about a twentieth of the pixels and still lines up
// exactly. Only translation is animated — no scale, no fade.
const LAYERS: Layer[] = [
  // id        end: the finished wordmark                                          start: where it opens
  { id: 'owen', src: owenSrc,
    end:   { left: 4.6354, top: 22.6852, width: 62.7604, height: 53.0556 },
    start: { left: 4.6354, top: 29.6852 } },
  { id: 'W', src: letterWSrc,
    end:   { left: 56.6667, top: 27.2222, width: 15.0521, height: 22.1296 },
    start: { left: 69.6667, top: 62.2222 } },
  { id: 'C', src: letterCSrc,
    end:   { left: 57.0313, top: 52.5926, width: 8.5938, height: 22.6852 },
    start: { left: 86.0313, top: 24.5926 } },
  { id: 'E1', src: letterE1Src,
    end:   { left: 72.6563, top: 30.9259, width: 4.7917, height: 14.1667 },
    start: { left: 78.6563, top: 10.9259 } },
  { id: 'H', src: letterHSrc,
    end:   { left: 68.75, top: 49.537, width: 9.1146, height: 29.0741 },
    start: { left: 48.75, top: 60.537 } },
  { id: 'L', src: letterLSrc,
    end:   { left: 77.8646, top: 30.3704, width: 5.1563, height: 19.7222 },
    start: { left: 66.8646, top: 6.5185  } },
  { id: 'E2', src: letterE2Src,
    end:   { left: 79.0104, top: 53.6111, width: 6.6146, height: 19.4444 },
    start: { left: 60.0104, top: 66.6111 } },
  { id: 'T', src: letterTSrc,
    end:   { left: 81.5104, top: 21.4815, width: 13.9063, height: 27.963 },
    start: { left: 70.5104, top: 30.4815 } },
  { id: 'K', src: letterKSrc,
    end:   { left: 87.1354, top: 53.5185, width: 8.0729, height: 19.7222 },
    start: { left: 62.1354, top: 38.5185 } },
  { id: 'dot', src: dotSrc,
    end:   { left: 50.7813, top: 67.1296, width: 4.0104, height: 7.2222 },
    start: { left: 15.1813, top: 13.1296 } },
]

// How far each layer has to come home, in artboard percentages. Derived from
// the table above so the two can never fall out of step, and resolved once
// rather than per frame.
const TRAVEL = LAYERS.map((layer) => ({
  x: layer.start.left - layer.end.left,
  y: layer.start.top - layer.end.top,
}))

// The morse ring is drawn over the O and has to move with it.
const OWEN_INDEX = LAYERS.findIndex((layer) => layer.id === 'owen')

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
const RING = { cx: 345, cy: 539, r: 128, width: 13, color: '#1c1917' }

// The bouncing dot, in those same artboard coordinates. It sits on the O's own
// axis — the outer ring's centre, a little left of the morse ring above, since
// that one is centred on the off-set target inside the letter. `cy` is where it
// rests: far enough above the top of the O that the hop never crowds it.
const DOT = { cx: 329, cy: 226, r: 10, color: '#1c1917' }

// The scroll cue, in those same artboard coordinates: on the O's own axis,
// hung just below the bottom of the letter (which ends at y≈799). It is placed
// inside the artboard rather than pinned to the viewport so it stays tied to
// the O at any width, and it rides the O's parallax so the letter never drifts
// down over it as the mark opens.
const CUE = { x: 329, y: 830 }

// How much of the sticky runway the cue survives. It is an invitation to
// scroll, so the moment the invitation is taken it starts leaving; a quarter of
// the stage puts it fully gone well before the wordmark has finished composing.
const CUE_FADE = 0.25

export default function Hero({ tagline }: { tagline?: string | null }) {
  const sectionRef = useRef<HTMLElement>(null)
  const layerRefs = useRef<(HTMLImageElement | null)[]>([])
  const ringRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  // Layout, not plain effect: the marks have to be pushed out to their start
  // positions before the browser paints, or the first frame shows the finished
  // wordmark and then snaps apart.
  useLayoutEffect(() => {
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
    // The artboard's rendered size. `start` and `end` are percentages of it,
    // so the whole move scales with the artwork and stays in proportion on a
    // phone. Cached rather than read per frame: touching clientWidth inside
    // the paint forces a layout on every tick.
    let frameW = 1
    let frameH = 1
    const measure = () => {
      const el = sectionRef.current
      range = el ? Math.max(1, el.offsetHeight - window.innerHeight) : 1
      const box = frameRef.current
      if (box) {
        frameW = box.clientWidth
        frameH = box.clientHeight
      }
    }

    const paint = () => {
      frame = 0
      // 1 at the top of the runway, 0 once the stage has been scrolled through:
      // how much of the opening offset is still owed. Clamped at both ends, so
      // the artwork is exactly composed by the time the stage lets go and
      // stays that way.
      const owed = 1 - Math.min(window.scrollY, range) / range
      const offset = (i: number) => {
        const t = TRAVEL[i]
        const x = ((t.x / 100) * frameW * owed).toFixed(2)
        const y = ((t.y / 100) * frameH * owed).toFixed(2)
        return `translate3d(${x}px, ${y}px, 0)`
      }
      for (let i = 0; i < LAYERS.length; i++) {
        const el = layerRefs.current[i]
        if (el) el.style.transform = offset(i)
      }
      // The ring rides the O, so it takes that layer's move exactly. Its spin
      // lives on the inner <g>, so this outer translate never fights it.
      const ring = ringRef.current
      if (ring) ring.style.transform = offset(OWEN_INDEX)
      // The cue hangs off the same letter, and fades as the scroll it asks for
      // begins. `owed` runs 1 → 0 across the whole stage, so the tail end of it
      // is the opening slice of the scroll.
      const cue = cueRef.current
      if (cue) {
        cue.style.transform = offset(OWEN_INDEX)
        cue.style.opacity = Math.max(0, (owed - (1 - CUE_FADE)) / CUE_FADE).toFixed(3)
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
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-x-clip">
        {/* The 16:9 frame stands in for the original artboard. Each cropped
            layer is placed as a percentage of it, and the morse ring below maps
            the same artboard through its viewBox, so everything stays
            registered at any viewport without being re-measured. */}
        <div ref={frameRef} className="relative aspect-[16/9] w-full max-w-[1600px]">
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
                left: `${layer.end.left}%`,
                top: `${layer.end.top}%`,
                width: `${layer.end.width}%`,
                height: `${layer.end.height}%`,
              }}
            />
          ))}

          {/* The O is drawn as an empty ring around a target. This fills that
              band with the name in morse and turns it, like a dial.
              viewBox + xMidYMid meet is the same fit as object-contain on the
              1920×1080 layers, so the ring stays registered to the O. */}
          <svg
            ref={ringRef}
            viewBox="0 0 1920 1080"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full will-change-transform"
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

            {/* A dot resting above the O, bouncing on the spot as the overlay
                drifts with the letter beneath it. */}
            <circle className="dot-hop" cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill={DOT.color} />
          </svg>

          {/* The scroll cue, hung under the O. The outer node owns the
              placement and the parallax the paint loop writes; the inner one
              owns the centring, so the two transforms never overwrite each
              other. */}
          <div
            ref={cueRef}
            aria-hidden="true"
            className="pointer-events-none absolute z-10"
            style={{ left: `${(CUE.x / 1920) * 100}%`, top: `${(CUE.y / 1080) * 100}%` }}
          >
            <div className="flex w-max -translate-x-1/2 flex-col items-center gap-2 text-neutral-400">
              <span className="text-[10px] tracking-[0.4em] uppercase sm:text-xs">Scroll</span>
              <svg
                className="scroll-cue"
                width="14"
                height="18"
                viewBox="0 0 14 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 1v14" />
                <path d="M2 11l5 5 5-5" />
              </svg>
            </div>
          </div>
        </div>

      {tagline && (
        <p className="pointer-events-none absolute bottom-28 left-1/2 z-10 -translate-x-1/2 px-6 text-center text-sm tracking-[0.3em] text-neutral-500 uppercase">
          {tagline}
        </p>
      )}

      {/* The artwork spells the name but carries no text, so this block is the
          real heading — for screen readers and crawlers as much as for the eye.
          It sits clear of the centred tagline. */}
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
      </div>
    </section>
  )
}
