import { toEmbedUrl } from './embed'
import { formatDateRange } from '../dates'
import type { Block, ProjectWithBlocks } from '../types'

/**
 * One project, printed across the page: the writing in one half, everything it
 * refers to — photographs, video, drawings, documents — in the other. `flip`
 * swaps the two, and the page alternates it down the list so the spreads read
 * as facing pages rather than as one long column with a gutter down it.
 */
export default function ProjectSpread({
  project,
  index,
  flip,
}: {
  project: ProjectWithBlocks
  index: number
  flip: boolean
}) {
  const dates = formatDateRange(project.startDate, project.endDate)

  // The one split this layout turns on: prose belongs with the writing, and
  // every other kind of block is something the writing points at. Blocks keep
  // the order the API sent them in — the editor's sort order — inside each half.
  const prose = project.blocks.filter((b) => b.kind === 'text')
  const media = project.blocks.filter((b) => b.kind !== 'text')

  return (
    <section className="border-t border-neutral-900/15">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        {/* Sticky, so a project with a long stack of media holds its own title
            and description alongside instead of scrolling them off the top.
            `self-start` is what gives the sticky element room to travel: a grid
            item stretched to the row's height has nowhere to stick. */}
        <div
          className={[
            'md:sticky md:top-20 md:self-start',
            flip ? 'md:order-2' : 'md:order-1',
          ].join(' ')}
        >
          {/* The running number is the only thing on the page that says where
              you are in the list, so it is set in the wordmark's terracotta and
              padded to two digits to keep the left edge straight past nine. */}
          <p className="text-[11px] tracking-[0.3em] text-clay">
            {String(index + 1).padStart(2, '0')}
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {project.title}
          </h2>

          {dates && (
            <p className="mt-2 text-[11px] tracking-[0.18em] text-neutral-600 uppercase">
              {dates}
            </p>
          )}

          {/* Same split as a text block: the blank lines the author typed are
              the paragraph breaks. */}
          {project.description && (
            <div className="mt-6 grid gap-4 text-sm leading-relaxed text-neutral-700">
              {project.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {prose.length > 0 && (
            <div className="mt-8 grid gap-6">
              {prose.map((block) => (
                <div key={block.id}>
                  {block.heading && (
                    <h3 className="text-[11px] tracking-[0.18em] text-neutral-900 uppercase">
                      {block.heading}
                    </h3>
                  )}
                  <div className="mt-2 grid gap-4 text-sm leading-relaxed text-neutral-700">
                    {block.body?.split(/\n{2,}/).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={['grid gap-8', flip ? 'md:order-1' : 'md:order-2'].join(' ')}>
          {media.map((block) => (
            <MediaItem key={block.id} block={block} />
          ))}
        </div>
      </div>
    </section>
  )
}

/** One supplementary item, with whatever caption the block carries beneath it. */
function MediaItem({ block }: { block: Block }) {
  const figure = renderMedia(block)
  if (!figure) return null

  // On an image the body is the caption *and* the alt text, so printing it
  // underneath as well would have a screen reader read it twice; the frame is
  // marked presentational there and the caption left to stand on its own.
  const captioned = block.kind === 'image' || block.kind === 'document'

  return (
    <figure>
      {block.heading && (
        <figcaption className="mb-2 text-[11px] tracking-[0.18em] text-neutral-900 uppercase">
          {block.heading}
        </figcaption>
      )}
      {figure}
      {captioned && block.body && (
        <figcaption className="mt-2 text-xs leading-relaxed text-neutral-600">
          {block.body}
        </figcaption>
      )}
    </figure>
  )
}

function renderMedia(block: Block) {
  switch (block.kind) {
    case 'image':
      if (!block.url) return null
      // Uploads are images and PDFs today, but a video URL pasted in by hand
      // would otherwise render as a broken <img>, so the mime type decides.
      if (block.mimeType?.startsWith('video/')) {
        return (
          <video
            src={block.url}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-sm border border-neutral-900/10 bg-paper"
          />
        )
      }
      return (
        <img
          src={block.url}
          alt={block.body ?? ''}
          loading="lazy"
          className="w-full rounded-sm border border-neutral-900/10 bg-paper"
        />
      )

    case 'embed': {
      const embedUrl = toEmbedUrl(block.url)
      // Unrecognised provider: a working link beats a blank iframe.
      if (!embedUrl) return renderLink(block)
      return (
        <div className="aspect-video w-full overflow-hidden rounded-sm border border-neutral-900/10 bg-paper">
          <iframe
            src={embedUrl}
            title={block.heading || block.body || 'Embedded media'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )
    }

    case 'document':
    case 'link':
      return renderLink(block)

    // Prose is drawn in the other half; nothing to put in this one.
    case 'text':
      return null
  }
}

function renderLink(block: Block) {
  if (!block.url) return null
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-baseline justify-between gap-4 rounded-sm border border-neutral-900/15 bg-paper/70 px-4 py-3 transition-colors hover:border-clay"
    >
      <span className="text-sm text-neutral-800 group-hover:text-clay">
        {block.body || block.fileName || block.url}
      </span>
      <span className="text-[11px] tracking-[0.18em] text-neutral-500 uppercase">
        {block.kind === 'document' ? 'PDF' : 'Link'}
      </span>
    </a>
  )
}
