// The editor is a private tool, not part of the public artwork, so it stays
// deliberately plain: no palette, just structure. These are the few shapes
// every form here shares, kept in one place so the pages stay in step.

/** A form field: label stacked over its control, fields spaced down the page. */
export const field = 'grid gap-1.5'

export const label = 'text-sm font-medium'

export const input =
  'w-full rounded border border-neutral-300 px-3 py-2 text-sm'

export const textarea = `${input} min-h-24 resize-y`

/**
 * A file input whose button reads as a button. The browser's default is a small
 * unstyled control that is easy to miss next to the bordered fields around it,
 * so the `file:` variants restyle the button half to match the others and the
 * wrapper gives the whole control a field's outline.
 */
export const fileInput =
  'w-full cursor-pointer rounded border border-dashed border-neutral-400 p-3 text-sm ' +
  'file:mr-3 file:cursor-pointer file:rounded file:border file:border-neutral-300 ' +
  'file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium ' +
  'hover:file:bg-neutral-200'

export const button =
  'rounded border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50'

/**
 * The two buttons that aren't neutral: the one that commits and the one that
 * destroys. Filled rather than tinted text, so they read at a glance in a list
 * of otherwise identical outlined buttons — the only colour in the editor, and
 * it means something.
 */
export const buttonSave =
  'rounded border border-green-700 bg-green-700 px-3 py-1.5 text-sm text-white ' +
  'hover:bg-green-800 disabled:opacity-50'

export const buttonDanger =
  'rounded border border-red-700 bg-red-700 px-3 py-1.5 text-sm text-white ' +
  'hover:bg-red-800 disabled:opacity-50'

/** The vertical rhythm inside a form or a list. */
export const stack = 'grid gap-4'

/**
 * For any line that prints something the editor did not write: a file name, a
 * blob URL, an error out of the upload. The two utilities are not decoration.
 * A grid item's default `min-width: auto` sizes it to its content, so one long
 * run with nothing to break on — `President_Truman_in_the_Cabinet_Room...png`
 * has no spaces and no hyphens, and a browser will not break on underscores —
 * widens the column it sits in, and every `w-full` control in the form widens
 * with it until the form runs off the page. `min-w-0` lets the item be narrower
 * than its content; `break-words` then wraps the run rather than letting it
 * push. Both are needed, and needed on every grid item down the chain: one
 * ancestor left at `auto` grows for all of them.
 */
export const breakable = 'min-w-0 break-words'

/** An error or status line, which is one of the above. */
export const alert = `${breakable} text-sm`

export const sectionHeading = 'text-lg font-semibold'
