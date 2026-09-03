import { useReducedMotion } from 'framer-motion'
import { IDENTITY } from './identity'

// "OWEN WELTCHEK", which is what the ring in the middle of the page spells.
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

// The dial, drawn into a 100×100 viewBox of its own so the geometry stays
// readable at any size. `size` is how much of the screen it takes: the smaller
// of the two axes, so it is the same circle in portrait and in landscape. The
// stroke is hairline on purpose — the message is a line of morse, and a heavy
// one turns every dot into a radial bar and loses the reading.
const RING = { size: 'min(52vh, 52vw)', r: 45, width: 0.75, color: '#1c1917' }

// The bouncing dot, hung above the dial. Given as a percentage of the dial's
// own box, so the two scale together.
const DOT = { size: '1.5%', gap: '7%', color: '#1c1917' }

interface Props {
  name?: string | null
  school?: string | null
  degree?: string | null
  /** The disciplines line. Prints where the hardcoded majors used to. */
  tagline?: string | null
}

export default function Hero({ name, school, degree, tagline }: Props) {
  const reduceMotion = useReducedMotion()

  // Settings win wherever the row carries a value, and a blank or missing row
  // falls back — same rule the world clock and the footer run on, so a fresh
  // database still prints a whole heading.
  const heading = {
    name: name || IDENTITY.name,
    school: school || IDENTITY.school,
    degree: degree || IDENTITY.degree,
    majors: tagline || IDENTITY.majors,
  }

  return (
    <section
      // Taller than the viewport, so the dial holds the screen for a beat
      // before the page moves on — the drape behind it answers to the cursor,
      // not to this. That runway is only worth its scroll where something is
      // actually moving under it, so with motion off, and on a phone — where
      // the drape does not answer to a cursor and the dial is stilled — it
      // collapses to a single screen.
      className={`relative h-[100svh] ${reduceMotion ? '' : 'sm:h-[150svh]'}`}
      aria-label="Owen Weltchek"
    >
      <div className="sticky top-0 flex h-[100svh] items-center justify-center">
        {/* The dial sits in the middle of the screen and the dot hangs off it,
            so the two of them stay one mark at any size. Narrow screens stack
            the name and the tagline underneath it rather than off to the side,
            which reaches up into where a centred dial sits, so there the dial
            rides high enough to clear them. */}
        <div
          className="relative -translate-y-[15svh] sm:translate-y-0"
          style={{ width: RING.size, height: RING.size }}
        >
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="pointer-events-none h-full w-full overflow-visible"
          >
            {/* The spin sits on the <g> rather than the <svg> so it stays the
                dial's own, whatever else is done to the box above it. */}
            <g
              className="morse-orbit"
              style={{ transformBox: 'view-box', transformOrigin: '50px 50px' }}
            >
              <circle
                cx="50"
                cy="50"
                r={RING.r}
                fill="none"
                stroke={RING.color}
                strokeWidth={RING.width}
                strokeLinecap="round"
                // pathLength rescales the circle to the message's own clock, so
                // the dasharray below is literally the morse timing.
                pathLength={MORSE_UNITS}
                strokeDasharray={MORSE_SEGMENTS.join(' ')}
              />
            </g>
          </svg>

          {/* A dot resting above the dial, bouncing on the spot. The outer node
              places and centres it, the inner one owns the hop. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2"
            // Sized here rather than on the dot itself: a percentage width on
            // the child would be measured against this box, whose own width is
            // whatever the child turns out to be.
            style={{ width: DOT.size, aspectRatio: '1', marginBottom: DOT.gap }}
          >
            <div className="dot-hop h-full w-full rounded-full" style={{ backgroundColor: DOT.color }} />
          </div>
        </div>

        {/* The dial spells the name in morse and nothing else on this screen
            says it in words, so this block is the heading — for screen readers
            and crawlers as much as for the eye. The tagline is its last line
            rather than a second mark in the middle of the page: the two said
            the same thing, and the centre belongs to the dial. */}
        <div className="pointer-events-none absolute bottom-36 left-1/2 z-10 max-w-[80vw] -translate-x-1/2 px-6 text-center sm:right-10 sm:bottom-12 sm:left-auto sm:translate-x-0 sm:px-0 sm:text-right">
          <h1 className="text-sm font-semibold tracking-[0.2em] text-neutral-800 uppercase">
            {heading.name}
          </h1>
          <p className="mt-2 text-xs tracking-[0.12em] text-neutral-600">
            {heading.school}
          </p>
          <p className="text-xs tracking-[0.12em] text-neutral-600">
            {heading.degree}
          </p>
          <p className="mt-2 text-[11px] tracking-[0.14em] text-neutral-600">
            {heading.majors}
          </p>
        </div>
      </div>
    </section>
  )
}
