import { motion } from 'framer-motion'
import Backdrop from './Backdrop'
import Nameplate from './Nameplate'
import ProjectSpread from './ProjectSpread'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import WorldClock from './WorldClock'
import { useContent } from './useContent'

/**
 * The whole site, on one page, in this order: the bar, the work, the clock, the
 * foot. The banner that used to stand between the first two is gone as a band
 * of its own — its mark, its bouncing dot and its heading are the nameplate at
 * the head of the work now, so the page opens on the thing it is for and still
 * says whose it is at full size. The clock is the last band before the footer,
 * and it is where the contact details are printed. The backdrop is fixed and the
 * page travels across it, so the ground stays put under the reading rather than
 * scrolling away with it. The nav is anchors into this page rather than routes,
 * since there is nowhere else to go.
 */
export default function Home() {
  const state = useContent()

  // The nameplate is near enough static art, so it paints while the content
  // request is still in flight instead of leaving a blank screen — settings
  // only move the words in it, and every one of them falls back until the rows
  // land.
  const settings = state.status === 'ready' ? state.data.settings : null

  return (
    // No ground of its own: the backdrop is the page's paper and it sits behind
    // everything here. Anything at this level that paints a background hides it.
    <main className="relative">
      <Backdrop />
      <SiteHeader settings={settings} />

      {/* The work itself, in the order the editor put it in: every published
          project, printed as a spread — the writing in one half, the
          photographs, video and documents in the other — with the two halves
          swapping sides down the page. The band opens the page now that the
          banner is gone, so it is padded clear of the fixed bar rather than
          starting under it. */}
      <div id="work" className="relative z-10 scroll-mt-16 bg-paper/85">
        <header className="mx-auto max-w-6xl px-6 pt-28 pb-14 sm:pt-32">
          <Nameplate />
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
          portfolioHref={settings?.portfolio_url || '#work'}
        />
      </div>

      <SiteFooter settings={settings} />
    </main>
  )
}
