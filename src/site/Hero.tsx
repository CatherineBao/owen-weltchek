import Logo from './Logo'
import { IDENTITY } from './identity'

// The mark at the head of the page: the morse dial, printed as large as the
// band allows. `size` is how much of the screen it takes — the smaller of the
// two axes, so it is the same mark in portrait and in landscape.
const MARK = { size: 'min(26svh, 34vw, 220px)' }

// The bouncing dot, hung above the mark. Given as a percentage of the mark's
// own box, so the two scale together.
const DOT = { size: '1.8%', gap: '7%', color: '#1c1917' }

interface Props {
  name?: string | null
  school?: string | null
  degree?: string | null
  /** The disciplines line. Prints where the hardcoded majors used to. */
  tagline?: string | null
}

export default function Hero({ name, school, degree, tagline }: Props) {
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
      // A banner rather than a screen of its own: the mark and the heading sit
      // in one band and the work starts within a scroll of the top. The drape
      // behind it still answers to the cursor, but it no longer has a page of
      // runway to do it in.
      className="relative flex min-h-[46svh] flex-col items-center justify-center gap-6 px-6 pt-28 pb-14 sm:min-h-[54svh] sm:flex-row sm:justify-between sm:gap-10 sm:px-12"
      aria-label="Owen Weltchek"
    >
      {/* The mark and the dot hanging off it stay one thing at any size. */}
      <div
        className="relative shrink-0"
        style={{ width: MARK.size, height: MARK.size }}
      >
        {/* The one printing that turns, and the one drawn hairline: at this
            size a heavier stroke makes radial bars of the dots. */}
        <Logo spin strokeWidth={0.75} className="h-full w-full" />

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
          <div className="dot-hop h-full w-full rounded-full" style={{ backgroundColor: DOT.color }} />
        </div>
      </div>

      {/* The mark carries no words, so this block is the heading — for screen
          readers and crawlers as much as for the eye. The tagline is its last
          line rather than a mark of its own: the two said the same thing. */}
      <div className="relative z-10 max-w-[80vw] text-center sm:text-right">
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
    </section>
  )
}
