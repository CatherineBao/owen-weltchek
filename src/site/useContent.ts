import { useEffect, useState } from 'react'
import { getContent } from './api'
import type { ContentResponse } from '../types'

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: ContentResponse }
  | { status: 'error'; message: string }

export function useContent(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    // StrictMode double-invokes effects in dev; without this you chase a
    // phantom double-fetch.
    const controller = new AbortController()

    getContent(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === 'AbortError') return
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : 'Failed to load content',
        })
      })

    return () => controller.abort()
  }, [])

  return state
}
