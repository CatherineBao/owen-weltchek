import { motion } from 'framer-motion'
import Hero from './Hero'
import ProjectView from './ProjectView'
import { useContent } from './useContent'

/** The whole public site: one scrolling page. */
export default function Home() {
  const state = useContent()

  // The hero is pure static art, so it paints while the content request is
  // still in flight instead of leaving a blank screen.
  const settings = state.status === 'ready' ? state.data.settings : null

  return (
    <main className="bg-paper">
      <Hero tagline={settings?.site_tagline} />

      {state.status === 'error' && <p>{state.message}</p>}

      {state.status === 'ready' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 bg-paper"
        >
          <header>
            <h2>{state.data.settings.site_title || 'Owen Weltchek'}</h2>
          </header>

          {state.data.settings.about_body && (
            <section>
              {state.data.settings.about_body.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </section>
          )}

          {state.data.projects.map((project) => (
            <ProjectView key={project.id} project={project} />
          ))}

          <footer>
            {state.data.settings.resume_url && (
              <a href={state.data.settings.resume_url} target="_blank" rel="noreferrer">
                {state.data.settings.resume_file_name || 'Resume'}
              </a>
            )}
            {state.data.settings.contact_email && (
              <a href={`mailto:${state.data.settings.contact_email}`}>
                {state.data.settings.contact_email}
              </a>
            )}
          </footer>
        </motion.div>
      )}
    </main>
  )
}
