import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, NavLink } from 'react-router'
import Logo from './Logo'
import { IDENTITY } from './identity'

// The panel's drop and the icon's fold are the same gesture in two places, so
// they run on one curve and one duration — a quick ease-out, short enough that
// a tap on the button never has to be waited out.
const SWING = { duration: 0.26, ease: [0.32, 0.72, 0, 1] } as const

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/technical', label: 'Technical Projects' },
]

/**
 * The site's only navigation. Fixed rather than in flow so the hero keeps its
 * full screen underneath it, and unpainted so the drape reads straight through
 * — which means the type has to answer to whatever is passing behind it: over
 * a band marked `data-header-dark` it turns white, and everywhere else it is
 * near-black on paper. The current page is underlined *and* set apart in
 * colour, since neither mark survives both grounds on its own — the terracotta
 * that names it on paper would vanish into the clay band, where it goes to
 * full white against a dimmed pair instead.
 */
export default function SiteHeader() {
  const onDark = useOverDarkBand()
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  // With motion off the panel still opens and shuts — it simply arrives rather
  // than travelling, which is the whole of what was asked to be turned down.
  const swing = reduceMotion ? { duration: 0 } : SWING

  // The bar is painted for as long as any of the panel is on screen, not just
  // while it is open: the paper has to stay under the cross until the last of
  // the panel has rolled up, or the drape flashes through the bar for the
  // length of the closing animation.
  const [panelShowing, setPanelShowing] = useState(false)
  const painted = open || panelShowing

  // A painted bar carries its own ground, so it stops taking its colour from
  // the band passing behind and goes back to black on white.
  const inverted = onDark && !painted

  // The mark is the other way about. Its own ground is white, which is nothing
  // at all on paper, so everywhere but the clay band it is turned out — black
  // tile, light letters — and over the clay it stands exactly as printed.
  const markInverted = !inverted

  return (
    <header className="fixed inset-x-0 top-0 z-30">
      {/* The bar's own ground, run full width rather than inside the max-width
          box so the wash reaches both edges of the screen. A thin black over a
          blur: enough to settle the drape behind the type without shutting it
          out, since the whole point of the print is that it runs under the
          page. Solid paper instead while the menu is down — that is the one
          state where the bar and the panel have to read as one white block
          rather than as a wash over the drape. */}
      <div
        className={[
          'backdrop-blur-xs',
          // Only ever painted on a phone: the panel is the reason for it, and
          // it cannot be open above sm.
          painted ? 'bg-paper sm:bg-black/5' : 'bg-black/5',
        ].join(' ')}
      >
        <div
          data-header-bar
          className={[
            // The mark is a tile with its own white margin, so the bar takes
            // its height from that rather than padding a line of type.
            'mx-auto flex max-w-6xl items-center justify-between px-6 py-3',
            // Only the button inherits this; the links each paint their own so
            // the current one can differ from the rest.
            inverted ? 'text-white' : 'text-neutral-800',
          ].join(' ')}
        >
          {/* The mark leads the bar at every width, and is a way home from
              anywhere — including from Home, where it is simply inert rather
              than a second link competing with the one in the nav. */}
          <Link to="/" aria-label={`${IDENTITY.name} — home`} className="shrink-0">
            <Logo inverted={markInverted} className="h-10 transition-opacity hover:opacity-70" />
          </Link>

          <nav aria-label="Primary" className="ml-8 hidden items-center gap-6 sm:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={linkClass(inverted)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* The bar is otherwise empty on a phone, so the button is pushed to the
              right on its own rather than sitting under the hero's centred mark. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="ml-auto sm:hidden"
          >
            <MenuIcon open={open} swing={swing} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false} onExitComplete={() => setPanelShowing(false)}>
        {open && (
          // Solid paper: the panel sits over the drape and over the clay band
          // alike, and a sheer one would leave the links unreadable on both.
          // It rolls down out of the bar rather than appearing under it — the
          // height is animated to `auto` so the links set their own extent, and
          // the clipping is what turns that into a blind being drawn.
          <motion.nav
            id="site-menu"
            aria-label="Primary"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={swing}
            onAnimationStart={() => setPanelShowing(true)}
            className="overflow-hidden border-b border-black/15 bg-paper text-neutral-800 sm:hidden"
          >
            {/* The padding lives on an inner box: on the animated node it would
                be part of the height being driven to zero and the links would
                squash before the panel had finished closing. */}
            <div className="grid gap-4 px-6 py-6">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  // The header stays mounted across the route change, so the
                  // panel has to be shut from the tap that navigated rather
                  // than left to unmount with the page.
                  onClick={() => setOpen(false)}
                  className={linkClass(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

/**
 * The two states of a link, on whichever ground it happens to be over. The
 * underline is drawn in `border-current` so it follows the type's colour rather
 * than having to be inverted separately, and the inactive links carry the same
 * border in transparent so nothing shifts as the current page moves between
 * them. `w-fit` keeps the rule under the words rather than across the row — the
 * panel's links are grid items and would otherwise stretch the full width.
 */
function linkClass(inverted: boolean) {
  const colours = inverted
    ? { active: 'text-white', idle: 'text-white/60 hover:text-white' }
    : { active: 'text-clay', idle: 'text-neutral-800 hover:text-clay' }

  return ({ isActive }: { isActive: boolean }) =>
    [
      'w-fit pb-1 text-[11px] tracking-[0.18em] uppercase transition-colors',
      isActive ? `border-b border-current ${colours.active}` : `border-b border-transparent ${colours.idle}`,
    ].join(' ')
}

// The three rules, as bars on a 24-unit box: the top one solid — a filled slab
// rather than a hairline — and the two under it drawn fine, so the mark reads
// as a weight falling off down the stack rather than as three of a kind. Each
// is given by its own centre line, because the centre is what the fold turns
// and travels; the box is a bar's own bounding box, so both are read from the
// middle of the rule itself.
const BARS = [
  { y: 6.5, height: 3 },
  { y: 12, height: 1.5 },
  { y: 17.5, height: 1.5 },
]

const SPIN = { transformBox: 'fill-box', transformOrigin: 'center' } as const

/**
 * Three rules that fold into a cross when the panel is open: the outer two ride
 * in to the middle and cross at a right angle, and the one already there fades
 * out from under them. The fine bar thickens to the solid one's weight on the
 * way in, so the cross is drawn in one line rather than in two.
 */
function MenuIcon({ open, swing }: { open: boolean; swing: { duration: number } }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      {BARS.map((bar, i) => {
        // The middle rule is the one that goes; the outer two are the arms, and
        // they turn opposite ways so they meet rather than stack.
        const middle = i === 1
        return (
          <motion.g
            key={bar.y}
            style={SPIN}
            animate={
              middle
                ? { opacity: open ? 0 : 1 }
                : {
                    // Both arms end on the box's midline, whichever side of it
                    // they started on.
                    y: open ? 12 - bar.y : 0,
                    rotate: open ? (i === 0 ? 45 : -45) : 0,
                    scaleY: open ? BARS[0].height / bar.height : 1,
                  }
            }
            transition={swing}
          >
            <rect
              x="3.5"
              y={bar.y - bar.height / 2}
              width="17"
              height={bar.height}
              rx={bar.height / 2}
            />
          </motion.g>
        )
      })}
    </svg>
  )
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
