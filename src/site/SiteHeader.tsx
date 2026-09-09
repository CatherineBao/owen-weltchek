import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import { useScrollTo } from './scrollTo'
import { IDENTITY } from './identity'
import type { Settings } from '../types'

// The site is one page, so the nav is anchors into it rather than routes. The
// mark leads them and goes to the first of the two, which is what the page is
// for; `LINKS[0]` is named rather than repeated so the two cannot drift apart.
const LINKS = [
  { to: '#work', label: 'Projects' },
  { to: '#contact', label: 'Contact' },
]
const HOME = LINKS[0]

/**
 * The site's only navigation: the mark and the name on one side, the bands they
 * lead to on the other. The name is set beside the dial in the same tracked
 * caps the footer gives it, so the two printings of the wordmark match and the
 * bar says whose site this is without waiting for the nameplate to scroll past.
 *
 * Fixed rather than in flow, and unpainted beyond a wash, so whatever the page
 * is showing runs on underneath it — which means the type has to answer to what
 * is passing behind: over a band marked `data-header-dark` it turns white, and
 * everywhere else it is near-black on paper. The band being read is underlined
 * *and* set apart in colour, since neither mark survives both grounds on its
 * own — the terracotta that names it on paper would vanish into the clay band,
 * where it goes to full white instead.
 */
export default function SiteHeader({ settings }: { settings: Settings | null }) {
  // Settings win wherever the row carries a value, the same rule the nameplate
  // and the footer run on — the three printings of the name have to agree, and
  // this one paints before the content request lands.
  const name = settings?.site_title || IDENTITY.name
  const onDark = useOverDarkBand()
  const scrollTo = useScrollTo()
  const current = useCurrentSection()

  return (
    <header className="fixed inset-x-0 top-0 z-30">
      {/* The bar's own ground, run full width rather than inside the max-width
          box so the wash reaches both edges of the screen. A thin black over a
          blur: enough to settle what is behind the type without shutting it
          out, since the point of the ground is that it runs under the page. */}
      <div className="bg-black/5 backdrop-blur-xs">
        <div
          data-header-bar
          className={[
            // The mark is a tile with its own margin, so the bar takes its
            // height from that rather than from padding a line of type.
            'mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3',
            onDark ? 'text-white' : 'text-neutral-800',
          ].join(' ')}
        >
          {/* The mark and the name lead the bar at every width, and are the way
              back to the top of the work from anywhere down the page. Neither
              carries a ground of its own, so both simply take the ink the bar is
              using: near-black on paper, white over clay. One link rather than
              two, since they are one wordmark and go one place — which is why
              the hover fades them together. */}
          <a
            href={HOME.to}
            onClick={(event) => scrollTo(event, HOME.to)}
            aria-label={`${HOME.label} — ${name}`}
            className="group flex shrink-0 items-center gap-2.5 sm:gap-3"
          >
            <Logo
              spin
              tone={onDark ? 'paper' : 'ink'}
              className="h-9 transition-opacity group-hover:opacity-70 sm:h-10"
            />
            {/* Nowrap and a shade tighter below sm: the name shares the bar with
                two nav links, and a wordmark broken across two lines is worse
                than one set a little closer. */}
            <span className="text-[10px] font-semibold tracking-[0.16em] whitespace-nowrap uppercase transition-opacity group-hover:opacity-70 sm:text-[11px] sm:tracking-[0.2em]">
              {name}
            </span>
          </a>

          {/* The links sit off at the far end rather than beside the mark, so
              the bar is read as two things — whose site this is, and where it
              goes — with the width of the page between them. */}
          <nav aria-label="Primary" className="flex shrink-0 items-center gap-4 sm:gap-6">
            {LINKS.map((link) => (
              <a
                key={link.to}
                href={link.to}
                aria-current={current === link.to ? 'true' : undefined}
                onClick={(event) => scrollTo(event, link.to)}
                className={linkClass(onDark, current === link.to)}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}

/**
 * The two states of the link, on whichever ground it happens to be over. The
 * underline is drawn in `border-current` so it follows the type's colour rather
 * than having to be inverted separately, and the idle state carries the same
 * border in transparent so nothing shifts as the mark comes and goes. The band
 * being read is underlined *and* set apart in colour, since neither mark
 * survives both grounds on its own — the terracotta that names it on paper
 * would vanish into the clay band, where it goes to full white instead.
 */
function linkClass(inverted: boolean, active: boolean) {
  const colours = inverted
    ? { active: 'text-white', idle: 'text-white/60 hover:text-white' }
    : { active: 'text-clay', idle: 'text-neutral-800 hover:text-clay' }

  return [
    'w-fit pb-1 text-[11px] tracking-[0.18em] uppercase transition-colors',
    active
      ? `border-b border-current ${colours.active}`
      : `border-b border-transparent hover:border-current ${colours.idle}`,
  ].join(' ')
}

/**
 * Which band is being read, as the hash that names it. Measured the same way
 * the dark band is — off the bar's own underside on a rAF-capped scroll
 * listener — so the two readings agree about where the page has got to: the
 * current band is the last one whose top has passed under the bar. The foot of
 * the page always marks the last band, which is otherwise short enough to be
 * left unmarked at full scroll.
 */
function useCurrentSection(): string {
  const [current, setCurrent] = useState('')
  // Read inside the callback rather than closed over, so the effect stays a
  // mount-once listener rather than re-subscribing on every change.
  const currentRef = useRef('')

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const bar = document.querySelector('[data-header-bar]')
      const line = bar ? bar.getBoundingClientRect().bottom : 0

      let found = ''
      const atFoot = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2
      for (const link of LINKS) {
        const section = document.querySelector(link.to)
        if (!section) continue
        // A hair of slack, so a band scrolled exactly to the bar counts as
        // reached rather than falling a fraction short of it.
        if (atFoot || section.getBoundingClientRect().top <= line + 1) found = link.to
      }

      if (found !== currentRef.current) {
        currentRef.current = found
        setCurrent(found)
      }
    }

    const ask = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    // Scheduled rather than called: the first measurement wants a laid-out
    // page, and a synchronous setState here would re-render mid-effect.
    ask()
    window.addEventListener('scroll', ask, { passive: true })
    window.addEventListener('resize', ask)
    return () => {
      window.removeEventListener('scroll', ask)
      window.removeEventListener('resize', ask)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return current
}

/**
 * Whether a dark band is currently passing behind the header. Measured off the
 * bar's own midline against every `[data-header-dark]` element, on a rAF-capped
 * scroll listener: an IntersectionObserver would have to be given a root margin
 * computed from the viewport height and re-made on every resize, which is more
 * machinery than reading a couple of rects.
 */
function useOverDarkBand(): boolean {
  const [onDark, setOnDark] = useState(false)
  // Read inside the callback rather than closed over, so the effect stays a
  // mount-once listener rather than re-subscribing on every change.
  const onDarkRef = useRef(false)

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const bar = document.querySelector('[data-header-bar]')
      if (!bar) return
      const box = bar.getBoundingClientRect()
      const line = (box.top + box.bottom) / 2

      let dark = false
      for (const band of document.querySelectorAll('[data-header-dark]')) {
        const rect = band.getBoundingClientRect()
        if (rect.top <= line && rect.bottom >= line) {
          dark = true
          break
        }
      }
      if (dark !== onDarkRef.current) {
        onDarkRef.current = dark
        setOnDark(dark)
      }
    }

    const ask = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    // Scheduled rather than called: the first measurement wants a laid-out
    // page, and a synchronous setState here would re-render mid-effect.
    ask()
    window.addEventListener('scroll', ask, { passive: true })
    window.addEventListener('resize', ask)
    return () => {
      window.removeEventListener('scroll', ask)
      window.removeEventListener('resize', ask)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return onDark
}
