import { MORSE_SEGMENTS, MORSE_UNITS } from './morse'

// The dial, drawn into a 100×100 viewBox of its own so the geometry stays
// readable at any size. The stroke is the one thing a caller tunes: the message
// is a line of morse, and a heavy stroke turns every dot into a radial bar and
// loses the reading — but at header size a hairline disappears altogether, so
// small printings ask for a heavier one.
const RING = { r: 45, width: 1.6 }

const INK = { ink: '#1c1917', paper: '#ffffff' } as const

/**
 * The mark: the name written round a circle in morse. It is the logo wherever
 * the site prints one — the bar, the foot of the page, and the banner at the
 * top — so the same line of code stands for the name at every size. It carries
 * no ground of its own, which is why the only thing that changes from one
 * ground to the next is the ink.
 */
export default function Logo({
  className = '',
  tone = 'ink',
  spin = false,
  cadence = 'orbit',
  strokeWidth = RING.width,
}: {
  className?: string
  /** Which way the ring is inked: near-black on paper, white on the clay band. */
  tone?: 'ink' | 'paper'
  /** Whether the dial turns. Every printing on the site does. */
  spin?: boolean
  /**
   * How it turns. `orbit` is one slow, even revolution — slow enough to read as
   * a dial being wound rather than as an animation. `punch` steps it a letter at
   * a time, at real keying speed, holding on each and snapping to the next in
   * time with the bouncing dot, so the mark reads as the name being keyed in
   * rather than spun. A punched dial only moves if the caller has also printed
   * `MORSE_PUNCH_CSS`, which is the one place the timings are written.
   */
  cadence?: 'orbit' | 'punch'
  strokeWidth?: number
}) {
  const punched = spin && cadence === 'punch'

  return (
    <svg
      viewBox="0 0 100 100"
      // Decorative wherever it stands: every caller either sets the name in
      // type beside it or gives its link an accessible name of its own.
      aria-hidden="true"
      // Height is all a caller gives; the square viewBox does the rest. The
      // colour is eased because the header flips it mid-scroll as the clay
      // band passes under the bar.
      className={`w-auto transition-[stroke] duration-300 select-none ${className}`}
    >
      {/* The spin sits on the <g> rather than the <svg> so it stays the dial's
          own, whatever else is done to the box above it. */}
      <g
        className={spin ? (punched ? 'morse-punch' : 'morse-orbit') : undefined}
        style={{ transformBox: 'view-box', transformOrigin: '50px 50px' }}
      >
        <circle
          cx="50"
          cy="50"
          r={RING.r}
          fill="none"
          stroke={INK[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          // pathLength rescales the circle to the message's own clock, so the
          // dasharray below is literally the morse timing.
          pathLength={MORSE_UNITS}
          strokeDasharray={MORSE_SEGMENTS.join(' ')}
        />
      </g>
    </svg>
  )
}
