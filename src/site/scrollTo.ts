import { animate, useReducedMotion } from 'framer-motion'
import type { MouseEvent } from 'react'

// The scroll a link into the page takes. Long enough to read as travel across a
// page this tall, on an ease-out so it arrives rather than stopping dead.
const TRAVEL = { duration: 0.8, ease: [0.32, 0.72, 0, 1] } as const

/**
 * Takes the page to a band rather than letting the browser jump to it: the
 * window's own scroll position is animated, so the bar's ink and whatever else
 * is reading the scroll have something continuous to answer to on the way. Used
 * by every anchor into this page — the bar's nav and the clock's own pill — so
 * a link travels the same distance in the same time wherever it is pressed.
 *
 * Framer's `animate` returns the running animation, and starting a second one
 * on a fast second click simply supersedes the first.
 *
 * The hash is written after the fact rather than left to the anchor, so the
 * address still names the section without the browser having done the moving.
 * Anything that is not an anchor into this page — an external portfolio URL out
 * of settings, say — is left alone for the browser to follow normally.
 */
export function useScrollTo() {
  const reduceMotion = useReducedMotion()

  return (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return // Somewhere else entirely: not ours to animate.

    const target = document.querySelector(href)
    if (!target) return // Nothing to travel to: let the anchor do whatever it would.
    event.preventDefault()

    // Measured off the bar itself, so the band lands under it rather than
    // behind it whatever height the bar happens to be.
    const bar = document.querySelector('[data-header-bar]')
    const offset = bar ? bar.getBoundingClientRect().height : 0
    const to = window.scrollY + target.getBoundingClientRect().top - offset

    if (reduceMotion) {
      window.scrollTo(0, to)
    } else {
      animate(window.scrollY, to, {
        ...TRAVEL,
        onUpdate: (y) => window.scrollTo(0, y),
      })
    }

    history.replaceState(null, '', href)
  }
}
