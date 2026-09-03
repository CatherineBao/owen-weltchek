import { toEmbedUrl } from './embed'
import type { Block } from '../types'

/** Renders one block. Structural only — styling comes later. */
export default function BlockView({ block }: { block: Block }) {
  return (
    <div>
      {block.heading && <h3>{block.heading}</h3>}
      {renderBody(block)}
    </div>
  )
}

function renderBody(block: Block) {
  switch (block.kind) {
    case 'text':
      // Preserve the paragraph breaks the author typed.
      return block.body
        ?.split(/\n{2,}/)
        .map((para, i) => <p key={i}>{para}</p>)

    case 'image':
      return block.url ? (
        <img src={block.url} alt={block.body ?? ''} loading="lazy" />
      ) : null

    case 'document':
      return block.url ? (
        <a href={block.url} target="_blank" rel="noreferrer">
          {block.body || block.fileName || 'Download'}
        </a>
      ) : null

    case 'link':
      return block.url ? (
        <a href={block.url} target="_blank" rel="noreferrer">
          {block.body || block.url}
        </a>
      ) : null

    case 'embed': {
      const embedUrl = toEmbedUrl(block.url)
      // Unrecognised provider: a working link beats a blank iframe.
      if (!embedUrl) {
        return block.url ? (
          <a href={block.url} target="_blank" rel="noreferrer">
            {block.body || block.url}
          </a>
        ) : null
      }
      return (
        <iframe
          src={embedUrl}
          title={block.heading || block.body || 'Embedded media'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )
    }
  }
}
