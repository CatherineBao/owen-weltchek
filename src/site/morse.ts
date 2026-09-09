// What the ring spells. The code below is generated from it rather than written
// out beside it: the dial's turn, the dot's bounce and the letters that flash in
// the middle are all keyed off this one string, and a second copy in morse would
// be a second thing to keep in step.
const NAME = 'OWEN WELTCHEK'

// International morse, enough of it to spell a name.
const CODE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
}

/**
 * The name as an alternating mark/gap run-length list, measured in dot units:
 * dot 1, dash 3, one unit between elements, three between letters, seven between
 * words. Handed to `stroke-dasharray` alongside a matching `pathLength`, it lays
 * the message round the circle at exactly those proportions no matter what
 * radius the circle happens to be.
 *
 * The same walk records each letter and where it begins, as a running unit
 * count. That is what lets the dial be turned a letter at a time rather than
 * evenly: the distance from one stop to the next is the letter's own width plus
 * the silence owed after it, so a long letter travels further — and holds
 * longer — than a short one, which is the whole of what makes the stepping read
 * as a message being keyed rather than as a ring ticking round.
 */
function readName(name: string): { segments: number[]; stops: number[]; letters: string[] } {
  const segments: number[] = []
  const stops: number[] = []
  const letters: string[] = []
  let total = 0 // running sum of `segments`, so a stop can be recorded in place
  let gap = 0 // silence owed before the next mark

  const push = (n: number) => {
    segments.push(n)
    total += n
  }

  for (const char of name.trim().toUpperCase()) {
    if (char === ' ') {
      gap = 7
      continue
    }
    const token = CODE[char]
    if (!token) continue // Nothing to key: leave it out rather than mis-spell it.
    if (segments.length && !gap) gap = 3
    for (const [i, symbol] of [...token].entries()) {
      if (segments.length) push(gap)
      if (i === 0) {
        // Recorded after the gap and before the mark, so a stop names the moment
        // the letter starts sounding rather than the silence in front of it.
        stops.push(total)
        letters.push(char)
      }
      push(symbol === '-' ? 3 : 1)
      gap = 1
    }
    gap = 0
  }
  segments.push(7) // the seam, so the loop reads as one more word break
  return { segments, stops, letters }
}

const READING = readName(NAME)

export const MORSE_SEGMENTS = READING.segments
export const MORSE_UNITS = MORSE_SEGMENTS.reduce((sum, n) => sum + n, 0)

/** Where each letter begins, in dot units round the ring. */
export const MORSE_LETTER_STOPS = READING.stops

/** The letters themselves, in step with the stops above. */
export const MORSE_LETTERS = READING.letters

/**
 * How fast the name is keyed, in words per minute. Morse speed is quoted against
 * the word PARIS, which is exactly 50 dot units long — so a dot is 1200/WPM
 * milliseconds and every other length follows from it. 20 wpm is a competent
 * operator's hand: quick enough to read as someone who knows the key, slow
 * enough that the letters still land separately.
 */
export const WPM = 20

/** A dot, in seconds — the unit every length in the message is counted in. */
export const UNIT_SECONDS = 1.2 / WPM

/**
 * One pass of the name, at that speed. It is the message's own length rather
 * than a figure chosen to look right: 120 units at 20 wpm is 7.2 seconds.
 */
export const MORSE_PUNCH_SECONDS = Number((MORSE_UNITS * UNIT_SECONDS).toFixed(4))

/** Where a letter ends, which is where the next one starts — or the seam. */
function letterEnd(i: number): number {
  return i + 1 < MORSE_LETTER_STOPS.length ? MORSE_LETTER_STOPS[i + 1] : MORSE_UNITS
}

/** A unit offset as a percentage of the way round the loop. */
function at(units: number): string {
  return ((units / MORSE_UNITS) * 100).toFixed(3)
}

// How much of a letter's slice it takes to come up. Short, so it arrives on the
// punch rather than swelling into it, and the rest of the slice is the fade.
const FLASH_IN = 0.16

/**
 * The keyed mark, as a stylesheet: the ring's turn, the dot's bounce and the
 * letter that flashes in the middle, all written from the name itself so they
 * cannot drift apart or be left behind describing an older one. They are one
 * animation in three places — the same duration, the same letter boundaries —
 * which is what keeps the dot landing on the punch, and the letter arriving with
 * it, rather than near it.
 *
 * Because time here is the message's own clock, a letter's slice of the loop is
 * exactly its width in dot units: `O` (`---`) holds for 14 units and `E` (`.`)
 * for 4, so all three speed up and slow down through the name the way a hand on
 * a key does.
 *
 * `step-end` is what makes the ring a punch rather than a spin: each angle is
 * held for the whole of its slice and then snaps.
 */
export const MORSE_PUNCH_CSS = [
  '@keyframes morse-punch {',
  ...MORSE_LETTER_STOPS.map(
    (u) => `  ${at(u)}% { transform: rotate(${((u / MORSE_UNITS) * 360).toFixed(3)}deg); }`,
  ),
  // A whole turn is the same picture as none, so the last punch lands the ring
  // back where it started and the loop is invisible.
  '  100% { transform: rotate(360deg); }',
  '}',
  '',
  '@keyframes dot-punch {',
  ...MORSE_LETTER_STOPS.flatMap((u, i) => [
    // Down on the boundary — the moment the ring snaps to this letter.
    `  ${at(u)}% { transform: translateY(0); animation-timing-function: ease-out; }`,
    // Up at the middle of the letter, so it slows at the apex and drops back
    // under something like gravity rather than sliding evenly between the ends.
    `  ${at((u + letterEnd(i)) / 2)}% { transform: translateY(-220%); animation-timing-function: ease-in; }`,
  ]),
  '  100% { transform: translateY(0); }',
  '}',
  '',
  // One keyframe set per letter: each is dark for the whole loop but its own
  // slice, so the twelve of them stacked in the middle of the dial read as a
  // single letter being replaced rather than as twelve overlapping fades.
  ...MORSE_LETTER_STOPS.flatMap((u, i) => {
    const end = letterEnd(i)
    const frames = new Map<string, string>([
      ['0.000', 'opacity: 0;'],
      [at(u), 'opacity: 0;'],
      [at(u + (end - u) * FLASH_IN), 'opacity: 1;'],
      [at(end), 'opacity: 0;'],
      ['100.000', 'opacity: 0;'],
    ])
    return [
      `@keyframes morse-letter-${i} {`,
      ...[...frames].map(([pct, rule]) => `  ${pct}% { ${rule} }`),
      '}',
    ]
  }),
  '',
  `.morse-punch { animation: morse-punch ${MORSE_PUNCH_SECONDS}s step-end infinite; }`,
  `.dot-punch { animation: dot-punch ${MORSE_PUNCH_SECONDS}s linear infinite; }`,
  // Dark by default, so a browser that will not run the animation — or a reader
  // who has asked it not to — is left with a clean dial rather than a letter
  // frozen over it.
  '.morse-letter { opacity: 0; }',
  ...MORSE_LETTERS.map(
    (_, i) =>
      `.morse-letter-${i} { animation: morse-letter-${i} ${MORSE_PUNCH_SECONDS}s linear infinite; }`,
  ),
  '',
  '@media (prefers-reduced-motion: reduce) {',
  '  .morse-punch, .dot-punch, [class*="morse-letter-"] { animation: none; }',
  '}',
].join('\n')
