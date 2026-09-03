import BlockView from './BlockView'
import type { ProjectWithBlocks } from '../types'

export default function ProjectView({ project }: { project: ProjectWithBlocks }) {
  return (
    <section>
      <h2>{project.title}</h2>
      {project.subtitle && <p>{project.subtitle}</p>}
      {project.year && <p>{project.year}</p>}

      {project.blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </section>
  )
}
