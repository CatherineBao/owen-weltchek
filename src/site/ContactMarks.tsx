import { telHref } from './identity'

/**
 * Mail, phone, LinkedIn as marks rather than as text. The world clock prints
 * them inside the dial, where a spelled-out address would crowd the hands, and
 * the footer repeats them — so the paths live here once and the two callers
 * bring their own colour.
 *
 * The addresses are still reachable to a screen reader and to a hovering
 * cursor: each mark carries its own in `aria-label` and `title`.
 */
export default function ContactMarks({
  mail,
  tel,
  linkedin,
  className = '',
  linkClassName = '',
  iconClassName = 'h-5 w-5',
}: {
  mail: string
  tel: string
  linkedin: string
  className?: string
  linkClassName?: string
  iconClassName?: string
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <a
        href={`mailto:${mail}`}
        aria-label={`Email ${mail}`}
        title={mail}
        className={linkClassName}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClassName}>
          <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5v-13Zm2.4.5 7.6 5.9L19.6 6H4.4ZM20 7.6l-7.4 5.75a1 1 0 0 1-1.2 0L4 7.6V18h16V7.6Z" />
        </svg>
      </a>

      <a href={telHref(tel)} aria-label={`Call ${tel}`} title={tel} className={linkClassName}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClassName}>
          <path d="M6.6 2h-.3A4.3 4.3 0 0 0 2 6.3C2 14.4 9.6 22 17.7 22a4.3 4.3 0 0 0 4.3-4.3v-.3a1.5 1.5 0 0 0-1.1-1.45l-3.6-1a1.5 1.5 0 0 0-1.55.5l-1 1.25a12.6 12.6 0 0 1-5.5-5.5l1.25-1a1.5 1.5 0 0 0 .5-1.55l-1-3.6A1.5 1.5 0 0 0 8.55 4L6.6 2Z" />
        </svg>
      </a>

      <a
        href={linkedin}
        target="_blank"
        rel="noreferrer"
        aria-label="LinkedIn"
        title="LinkedIn"
        className={linkClassName}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClassName}>
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.71h.05c.53-.95 1.83-1.96 3.77-1.96 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.07-1.95-3.07-1.95 0-2.25 1.46-2.25 2.97V21h-4V9Z" />
        </svg>
      </a>
    </div>
  )
}
