import { motion } from 'framer-motion'
import Hero from './Hero'
import Backdrop from './Backdrop'
import ProjectSpread from './ProjectSpread'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import WorldClock from './WorldClock'
import { useContent } from './useContent'

/**
 * The whole site, on one page, in this order: the bar, the banner, the work,
 * the clock, the foot. The work is what the page is for, so it comes first
 * under the banner; the clock is the last band before the footer, and it is
 * where the contact details are printed. The backdrop is fixed and the
 * page travels across it, so the ground stays put under the reading rather than
 * scrolling away with it — it answers to the cursor instead. The nav is anchors
 * into this page rather than routes, since there is nowhere else to go.
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

      {/* The work itself, in the order the editor put it in: every published
          project, printed as a spread — the writing in one half, the
          photographs, video and documents in the other — with the two halves
          swapping sides down the page. A paper wash rather than solid paper:
          enough to carry running text, sheer enough that the drape behind it
          still reads. */}
      <div id="work" className="relative z-10 scroll-mt-16 bg-paper/85">
        <header className="mx-auto max-w-6xl px-6 pt-16 pb-14">
          <p className="text-[11px] tracking-[0.3em] text-clay uppercase">Technical</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Projects
          </h2>
        </header>

        {state.status === 'loading' && (
          <p className="mx-auto max-w-6xl px-6 pb-24 text-sm text-neutral-600">Loading…</p>
        )}

        {state.status === 'error' && (
          <p className="mx-auto max-w-6xl px-6 pb-24 text-sm text-neutral-600">
            {state.message}
          </p>
        )}

        {state.status === 'ready' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {state.data.projects.length === 0 ? (
              <p className="mx-auto max-w-6xl px-6 pb-24 text-sm text-neutral-600">
                Nothing published yet.
              </p>
            ) : (
              state.data.projects.map((project, i) => (
                <ProjectSpread
                  key={project.id}
                  project={project}
                  index={i}
                  // Odd spreads run mirrored, so the media alternates from one
                  // side of the page to the other as you scroll.
                  flip={i % 2 === 1}
                />
              ))
            )}
          </motion.div>
        )}
      </div>

      {/* Time-driven, not content-driven, so it paints with the hero and fills
          in the contact details when the settings land. Solid clay by design —
          it is the one band that shuts the drape out. */}
      <div id="contact" className="scroll-mt-16">
        <WorldClock
          email={settings?.contact_email}
          phone={settings?.contact_phone}
          linkedinUrl={settings?.linkedin_url}
          resumeUrl={settings?.resume_url}
          portfolioHref={settings?.portfolio_url || '#work'}
        />
      </div>

      <SiteFooter settings={settings} />
    </main>
  )
}
