// "OWEN WELTCHEK", which is what the ring spells.
const MORSE = '--- .-- . -. / .-- . .-.. - -.-. .... . -.-'

/**
 * Turns morse into an alternating mark/gap run-length list, measured in dot
 * units: dot 1, dash 3, one unit between elements, three between letters, seven
 * between words. Handed to `stroke-dasharray` alongside a matching
 * `pathLength`, it lays the message round the circle at exactly those
 * proportions no matter what radius the circle happens to be.
 */
function morseSegments(code: string): number[] {
  const segments: number[] = []
  let gap = 0 // silence owed before the next mark
  for (const token of code.trim().split(/\s+/)) {
    if (token === '/') {
      gap = 7
      continue
    }
    if (segments.length && !gap) gap = 3
    for (const symbol of token) {
      if (segments.length) segments.push(gap)
      segments.push(symbol === '-' ? 3 : 1)
      gap = 1
    }
    gap = 0
  }
  segments.push(7) // the seam, so the loop reads as one more word break
  return segments
}

export const MORSE_SEGMENTS = morseSegments(MORSE)
export const MORSE_UNITS = MORSE_SEGMENTS.reduce((sum, n) => sum + n, 0)
