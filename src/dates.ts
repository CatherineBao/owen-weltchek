/**
 * Project dates are stored as "YYYY-MM" strings, so they never touch the Date
 * parser — `new Date('2026-06')` is UTC midnight, which reads as May in every
 * timezone west of Greenwich. Splitting the string sidesteps that entirely.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "2026-06" -> "Jun 2026". Returns null for anything that isn't a month. */
export function formatMonth(value: string | null | undefined): string | null {
  if (!value) return null
  const [year, month] = value.split('-')
  const name = MONTHS[Number(month) - 1]
  if (!name || year?.length !== 4) return null
  return `${name} ${year}`
}

/**
 * The line under a project title: "Jun 2026 - Aug 2026", or "Jun 2026 - Present"
 * while it's ongoing, or just the end month if only that is known.
 */
export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  const start = formatMonth(startDate)
  const end = formatMonth(endDate)
  if (start && end) return start === end ? start : `${start} - ${end}`
  if (start) return `${start} - Present`
  return end
}
