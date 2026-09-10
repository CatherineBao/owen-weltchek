import Logo from './Logo'
import { MORSE_LETTERS, MORSE_PUNCH_CSS } from './morse'

// The mark: the morse dial, printed as large as the band allows. `size` is how
// much of the screen it takes — the smaller of the two axes, so it is the same
// mark in portrait and in landscape.
const MARK = { size: 'min(26svh, 34vw, 220px)' }

// The bouncing dot, hung above the mark. Given as a percentage of the mark's
// own box, so the two scale together.
const DOT = { size: '1.8%', gap: '7%', color: '#1c1917' }

// The letter struck in the middle of the dial, as a fraction of the mark's own
// width — so it holds the same place inside the ring at every size. Small
// enough to sit well inside the ring rather than filling it: the ring is the
// mark, and the letter is a reading of it going past.
const LETTER = { scale: 0.18 }

/**
 * The head of the work band, and the site's masthead now that the banner above
 * it is gone: the big mark and the word for what follows on one side, the name
 * and what it stands for on the other. The bar repeats the mark in miniature,
 * but this is the printing that carries the whole of it — which is why the
 * page's heading levels live here and the bar carries none.
 */
export default function Nameplate() {
  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
      {/* The mark and the word it heads, as one cluster — the dial reads as the
          thing announcing the work rather than as an ornament beside it. */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
        {/* The mark and the dot hanging off it stay one thing at any size. */}
        <div className="relative shrink-0" style={{ width: MARK.size, height: MARK.size }}>
          {/* The ring's turn, the dot's bounce and the letters' flash, all
              written out of the name itself — so they live here, with the
              assembly they drive, rather than in the stylesheet where the
              timings would have to be typed by hand and kept in step. */}
          <style>{MORSE_PUNCH_CSS}</style>

          {/* Drawn hairline: at this size a heavier stroke makes radial bars of
              the dots. It is the one printing that is punched rather than
              orbited — it steps a letter at a time, in time with the dot coming
              back down, so the mark reads as the name being keyed in. The bar's
              and the foot's turn evenly; they have no dot to keep time with. */}
          <Logo spin cadence="punch" strokeWidth={0.75} className="h-full w-full" />

          {/* A dot resting above the mark, bouncing on the spot. The outer node
              places and centres it, the inner one owns the hop. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2"
            // Sized here rather than on the dot itself: a percentage width on
            // the child would be measured against this box, whose own width is
            // whatever the child turns out to be.
            style={{ width: DOT.size, aspectRatio: '1', marginBottom: DOT.gap }}
          >
            <div
              className="dot-punch h-full w-full rounded-full"
              style={{ backgroundColor: DOT.color }}
            />
          </div>

          {/* The letter being keyed, struck in the middle of the dial as the
              ring snaps to it and gone again before the next. All twelve are
              printed and stacked in the one cell — each dark but for its own
              slice of the loop — because a single node swapped by a timer would
              be a second clock to keep in step with the CSS. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            {MORSE_LETTERS.map((letter, i) => (
              <span
                key={`${letter}-${i}`}
                className={`morse-letter morse-letter-${i} col-start-1 row-start-1 font-semibold tracking-[0.1em] text-neutral-900`}
                // Sized off the mark rather than off the page, so the letter
                // keeps its place inside the ring at every width.
                style={{ fontSize: `calc(${MARK.size} * ${LETTER.scale})`, lineHeight: 1 }}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>

        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Projects
        </h2>
      </div>

    </div>
  )
}
