import { motion } from 'framer-motion'
import Hero from './Hero'
import Backdrop from './Backdrop'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import WorldClock from './WorldClock'
import { useContent } from './useContent'

/**
 * The front of the site: the dial, the world clock, and the about copy. The
 * backdrop is fixed and the page travels across it, so the ground stays put
 * under the reading rather than scrolling away with it — it answers to the
 * cursor instead. The projects themselves live on /technical, so the database
 * is printed in one place rather than laid out twice in two ways.
 */
export default function Home() {
  const state = useContent()

  // The hero is pure static art, so it paints while the content request is
  // still in flight instead of leaving a blank screen.
  const settings = state.status === 'ready' ? state.data.settings : null

  return (
    // No ground of its own: the paper is on <html> and the plates sit between
    // the two. Anything here that paints a background hides them.
    <main className="relative">
      <Backdrop />
      <SiteHeader />

      <Hero
        name={settings?.site_title}
        school={settings?.site_school}
        degree={settings?.site_degree}
        tagline={settings?.site_tagline}
      />

      {/* Time-driven, not content-driven, so it paints with the hero and fills
          in the contact details when the settings land. Solid clay by design —
          it is the one band that shuts the drape out. */}
      <WorldClock
        email={settings?.contact_email}
        phone={settings?.contact_phone}
        linkedinUrl={settings?.linkedin_url}
        resumeUrl={settings?.resume_url}
        portfolioHref={settings?.portfolio_url || '/technical'}
      />

      {state.status === 'error' && (
        <p className="relative z-10 bg-paper/85 px-6 py-10 text-sm text-neutral-600">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && (
        <motion.div
          id="work"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          // A paper wash rather than solid paper: enough to carry running text,
          // sheer enough that the drape behind it still reads.
          className="relative z-10 bg-paper/85"
        >
        </motion.div>
      )}

      <SiteFooter settings={settings} />
    </main>
  )
}
