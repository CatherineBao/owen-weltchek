import { useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

import blueSrc from '../assets/drape-blue.webp'
import roseSrc from '../assets/drape-rose.webp'
import mintSrc from '../assets/drape-mint.webp'

/**
 * One plate of the print. `ink` is how much of it carries — the plates are
 * multiplied into the page and into each other, so the strengths compound where
 * they cross and have to be set well back from full. `drift` is how far it
 * follows the cursor, as a percentage of the viewport; giving the plates
 * different figures — and opposite signs — walks them out of register as the
 * pointer moves, which is the only thing that tells you there are three.
 */
type Plate = { src: string; ink: number; drift: number }

// The same drape, pulled three times in three inks, laid one over another the
// way a three-colour screen print is: each colour where its own plate has ink,
// and the crossings darker than any of them. They were drawn separately and so
// never quite register, which is the point of printing them together. Every
// plate carries less ink than two of them would, because the crossings
// compound: three at the strength two were set to comes back out as mud.
const PLATES: Plate[] = [
  { src: blueSrc, ink: 0.73, drift: 2.5 },
  { src: roseSrc, ink: 0.53, drift: -0.8 },
  { src: mintSrc, ink: 0.53, drift: -2.4 },
]

// The scan is portrait and the screen usually is not, so each plate is turned
// on its side: laid into a box with the viewport's two axes swapped and then
// rotated a quarter turn, it comes back the right way round having filled the
// whole screen, and the drape is cropped along its length rather than across
// it. `ZOOM` is the overscan that gives the parallax somewhere to go, and has
// to stay ahead of the largest `drift` above.
const TURN = 90
const ZOOM = 1.12

// Which way round the drape hangs, named the way the axes are spoken about
// rather than the way the transform is written: flipping *on the x axis* swaps
// top for bottom, flipping *on the y axis* swaps left for right. Both are read
// as the screen sees them, which is why they are applied outside the quarter
// turn — inside it, the turn would have swapped the two over and made the names
// lie.
const FLIP_X = false
const FLIP_Y = false

const ORIENT = [
  `scale(${FLIP_Y ? -1 : 1}, ${FLIP_X ? -1 : 1})`,
  `rotate(${TURN}deg)`,
  `scale(${ZOOM})`,
].join(' ')

// How quickly a plate closes the distance to the cursor, per frame. Low enough
// that the plates lag the pointer and settle after it stops, which is what
// makes them read as hanging behind the page rather than pinned to the mouse.
const EASE = 0.07

// Below this the plate is near enough home to stop asking for frames.
const SETTLED = 0.0005

/**
 * The page's ground: the three plates, held still against the viewport and
 * pulled about by the cursor. Each answers to the pointer by a different
 * amount, so the print falls in and out of register as the mouse moves across
 * it. Fixed rather than in flow, so the page travels over the print instead of
 * dragging it along.
 */
export default function Backdrop() {
  const driftRefs = useRef<(HTMLDivElement | null)[]>([])
  const reduceMotion = useReducedMotion()

  // Layout, not plain effect: the plates are written once before the first
  // paint so they start in register rather than snapping there.
  useLayoutEffect(() => {
    // A coarse pointer has no hover to follow — every move is a tap, which
    // would jerk the plates rather than lead them — so on those the print
    // simply stays where it was printed.
    if (reduceMotion || !window.matchMedia('(pointer: fine)').matches) return

    // Written straight to the nodes, at most once per frame: driving three
    // full-screen images through React state would re-render them on every
    // pointer event.
    let frame = 0
    // Where the cursor is and where the plates have got to, both as -1 → 1
    // across the viewport from its centre. The plates chase the cursor rather
    // than being placed at it, which is where the lag comes from.
    let toX = 0
    let toY = 0
    let atX = 0
    let atY = 0

    const paint = () => {
      frame = 0
      atX += (toX - atX) * EASE
      atY += (toY - atY) * EASE
      for (let i = 0; i < PLATES.length; i++) {
        const el = driftRefs.current[i]
        if (!el) continue
        const d = PLATES[i].drift
        el.style.transform = `translate3d(${(atX * d).toFixed(3)}%, ${(atY * d).toFixed(3)}%, 0)`
      }
      // Keep asking for frames until the plates have caught up, so they carry
      // on settling after the pointer has stopped moving.
      if (Math.abs(toX - atX) > SETTLED || Math.abs(toY - atY) > SETTLED) ask()
    }

    const ask = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }

    const onPointerMove = (e: PointerEvent) => {
      toX = (e.clientX / window.innerWidth - 0.5) * 2
      toY = (e.clientY / window.innerHeight - 0.5) * 2
      ask()
    }
    // Off the window — another tab, another app — there is no cursor to follow,
    // so the print eases back to where it was printed rather than holding the
    // last place the pointer happened to be.
    const onLeave = () => {
      toX = 0
      toY = 0
      ask()
    }

    paint()
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('blur', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [reduceMotion])

  return (
    // Paper of its own, and not because the page lacks one: `position: fixed`
    // isolates this subtree from what is painted behind it, so a plate set to
    // multiply has nothing to multiply into and washes out to white instead.
    // Giving the backdrop the page's own ground puts the paper back inside the
    // subtree, where the blend can reach it — and where the plates can reach
    // each other.
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {PLATES.map((plate, i) => (
        // The parallax is written here, outside the quarter turn below, so it
        // stays a move across the screen rather than being turned with the
        // plate and answering the wrong axis.
        <div
          key={plate.src}
          ref={(el) => {
            driftRefs.current[i] = el
          }}
          className="absolute inset-0"
        >
          {/* The turned box: the viewport's height wide and its width tall, so
              the quarter turn lands it back over the screen exactly. */}
          <div
            className="absolute top-1/2 left-1/2"
            style={{
              width: '100lvh',
              height: '100lvw',
              transform: `translate(-50%, -50%) ${ORIENT}`,
            }}
          >
            <img
              src={plate.src}
              alt=""
              draggable={false}
              // The plates are printed on white paper, so they are multiplied
              // into the page's ground rather than laid over it: the white
              // drops out and only the ink is left, the way the drape was
              // screened. It is also what makes them overprint instead of each
              // one simply hiding the one beneath it.
              className="h-full w-full object-cover mix-blend-multiply select-none"
              style={{ opacity: plate.ink }}
              fetchPriority="high"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
