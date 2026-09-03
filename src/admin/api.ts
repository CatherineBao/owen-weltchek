import { request } from '../http'
import type { Block, BlockKind, ProjectWithBlocks, Settings } from '../types'

export function getSession() {
  return request<{ authed: boolean }>('/api/admin/session')
}

export function login(password: string) {
  return request<{ ok: true }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function logout() {
  return request<void>('/api/admin/logout', { method: 'POST' })
}

export function listProjects() {
  return request<{ projects: ProjectWithBlocks[] }>('/api/admin/projects')
}

export interface ProjectInput {
  title?: string
  subtitle?: string
  year?: string
  sortOrder?: number
  published?: boolean
}

export function createProject(input: ProjectInput) {
  return request<{ project: ProjectWithBlocks }>('/api/admin/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateProject(id: string, input: ProjectInput) {
  return request<{ project: ProjectWithBlocks }>(
    `/api/admin/projects?id=${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  )
}

export function deleteProject(id: string) {
  return request<void>(`/api/admin/projects?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export interface BlockInput {
  projectId?: string
  kind?: BlockKind
  heading?: string
  body?: string
  url?: string
  fileName?: string
  mimeType?: string
  fileSize?: number
  sortOrder?: number
}

export function createBlock(input: BlockInput & { projectId: string }) {
  return request<{ block: Block }>('/api/admin/blocks', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateBlock(id: string, input: BlockInput) {
  return request<{ block: Block }>(`/api/admin/blocks?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteBlock(id: string) {
  return request<void>(`/api/admin/blocks?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function getSettings() {
  return request<{ settings: Settings }>('/api/admin/settings')
}

export function saveSettings(settings: Settings) {
  return request<{ settings: Settings }>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}
