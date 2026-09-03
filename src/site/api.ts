import { request } from '../http'
import type { ContentResponse } from '../types'

/**
 * The only endpoint the public site knows about. Nothing here references
 * /api/admin/, which keeps those paths out of the visitor's bundle.
 */
export function getContent(signal?: AbortSignal): Promise<ContentResponse> {
  return request<ContentResponse>('/api/content', { signal })
}
