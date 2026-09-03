import logoSrc from '../assets/logo-ow.png'

/**
 * The OW monogram, printed exactly as it was drawn: the mark sitting slightly
 * off centre on its own white ground, untrimmed and unsquared. The white is
 * part of it — it is what makes the thing a logo rather than two letters loose
 * on the drape — so what changes from ground to ground is which way round it is
 * printed, never whether the tile is there.
 */
export default function Logo({
  className = '',
  inverted = false,
}: {
  className?: string
  inverted?: boolean
}) {
  return (
    <img
      src={logoSrc}
      // Decorative wherever it stands: every caller either sets the name in
      // type beside it or gives its link an accessible name of its own.
      alt=""
      draggable={false}
      // Height is all a caller gives; the file's own proportions do the rest.
      // Turned out, the tile goes near-black and the letters light — which is
      // how the mark holds a white page, where its own white ground would
      // otherwise be nothing at all. The filter is eased because the header
      // flips it mid-scroll as the clay band passes under the bar.
      className={`w-auto rounded-md transition-[filter] duration-300 select-none ${
        inverted ? 'invert' : ''
      } ${className}`}
    />
  )
}
