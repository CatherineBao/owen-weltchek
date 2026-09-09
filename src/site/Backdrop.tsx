/**
 * The page's ground: plain paper, held still against the viewport. It used to
 * be a three-colour screen print of a drape, pulled in blue, rose and mint and
 * dragged about by the cursor; the plates have been taken off and the paper
 * they were printed on is what is left.
 *
 * Still a fixed layer of its own rather than a background on <html>, because
 * the bands above it are set in washes — `bg-paper/85` and the like — and a
 * sheer band needs something inside the page to be sheer against.
 */
export default function Backdrop() {
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-paper" />
}
