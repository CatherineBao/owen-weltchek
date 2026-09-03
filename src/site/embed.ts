/**
 * Turns a URL someone pasted from the address bar into one that actually works
 * in an iframe. A YouTube watch link and a Drive "view" link both refuse to
 * frame; their /embed and /preview forms don't.
 *
 * Returns null when the URL isn't a recognised provider, so the caller can fall
 * back to a plain link rather than rendering a broken frame.
 */
export function toEmbedUrl(raw: string | null): string | null {
  if (!raw) return null

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    return id ? `https://www.youtube.com/embed/${id}` : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    // Already an /embed/ or /shorts/ link.
    const shorts = url.pathname.match(/^\/shorts\/([^/]+)/)
    if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`
    if (url.pathname.startsWith('/embed/')) return url.toString()
    return null
  }

  if (host === 'drive.google.com') {
    const match = url.pathname.match(/^\/file\/d\/([^/]+)/)
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null
  }

  if (host === 'docs.google.com') {
    // /document/d/ID/edit -> /preview  (also works for spreadsheets, slides)
    const match = url.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([^/]+)/)
    return match ? `https://docs.google.com/${match[1]}/d/${match[2]}/preview` : null
  }

  if (host === 'vimeo.com') {
    const id = url.pathname.slice(1).split('/')[0]
    return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
  }

  return null
}
