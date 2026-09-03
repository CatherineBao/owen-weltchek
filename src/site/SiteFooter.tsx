import { Link } from 'react-router'
import ContactMarks from './ContactMarks'
import Logo from './Logo'
import { CONTACT, IDENTITY, RESUME_URL } from './identity'
import type { Settings } from '../types'

/**
 * The page's last band, and the one place on the site with no drape behind it:
 * solid white, black type, and the wordmark's terracotta reserved for the
 * headings and for whatever the cursor is on. The print stops at the top edge
 * of it rather than running out under the small print.
 */
export default function SiteFooter({ settings }: { settings: Settings | null }) {
  // Settings win wherever the row carries a value, and a blank or missing row
  // falls back — the footer is never a heading with nothing under it on a
  // fresh database. Same rule the world clock's contact marks run on.
  const mail = settings?.contact_email || CONTACT.email
  const tel = settings?.contact_phone || CONTACT.phone
  const linkedin = settings?.linkedin_url || CONTACT.linkedin
  const resume = settings?.resume_url || RESUME_URL
  const name = settings?.site_title || IDENTITY.name
  const school = settings?.site_school || IDENTITY.school
  const degree = settings?.site_degree || IDENTITY.degree
  const majors = settings?.site_tagline || IDENTITY.majors

  return (
    <footer className="relative z-10 border-t border-black/15 bg-paper text-black">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3 sm:gap-8">
        <div>
          {/* The same mark the header carries, at the foot of the page and in
              the footer's own black — it takes its colour from the type around
              it, so nothing here has to be set twice. */}
          {/* Solid white ground down here, so the mark is turned out the same
              way the header turns it out over paper. */}
          <Logo inverted className="mb-4 h-16" />
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase">
            {name}
          </p>
          <p className="mt-3 text-xs tracking-[0.12em]">{school}</p>
          <p className="text-xs tracking-[0.12em]">{degree}</p>
          <p className="mt-2 text-[11px] tracking-[0.14em]">{majors}</p>
        </div>

        <nav aria-label="Footer" className="grid content-start gap-2">
          <FooterHeading>Navigate</FooterHeading>
          <Link to="/home" className={linkClass}>
            Home
          </Link>
          <Link to="/" className={linkClass}>
            Technical Projects
          </Link>
          <a href={resume} target="_blank" rel="noreferrer" className={linkClass}>
            Resume
          </a>
        </nav>

        <div className="grid content-start gap-2">
          <FooterHeading>Contact</FooterHeading>
          {/* The same three marks the world clock prints, in the footer's own
              ink: black, and terracotta under the cursor. */}
          <ContactMarks
            mail={mail}
            tel={tel}
            linkedin={linkedin}
            className="mt-1 gap-5"
            linkClassName="transition-colors hover:text-clay"
            iconClassName="h-5 w-5"
          />
        </div>
      </div>
    </footer>
  )
}

const linkClass = 'text-xs tracking-[0.12em] transition-colors hover:text-clay'

function FooterHeading({ children }: { children: string }) {
  return <p className="text-[11px] tracking-[0.2em] text-clay uppercase">{children}</p>
}
