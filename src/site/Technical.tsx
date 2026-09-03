import { motion } from 'framer-motion'
import Backdrop from './Backdrop'
import ProjectSpread from './ProjectSpread'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import { useContent } from './useContent'

/**
 * The work itself, in the order the editor put it in: every published project,
 * printed as a spread — the writing in one half, the photographs, video and
 * documents in the other — with the two halves swapping sides down the page.
 */
export default function Technical() {
  const state = useContent()
  const settings = state.status === 'ready' ? state.data.settings : null

  return (
    // No ground of its own: the paper is on <html> and the plates sit between
    // the two. Anything here that paints a background hides them.
    <main className="relative">
      <Backdrop />
      <SiteHeader />

      {/* A paper wash rather than solid paper: enough to carry running text,
          sheer enough that the drape behind it still reads. */}
      <div className="relative z-10 bg-paper/85 pt-20">
        <header className="mx-auto max-w-6xl px-6 pt-10 pb-14">
          <p className="text-[11px] tracking-[0.3em] text-clay uppercase">Technical</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Projects
          </h1>
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

      <SiteFooter settings={settings} />
    </main>
  )
}
