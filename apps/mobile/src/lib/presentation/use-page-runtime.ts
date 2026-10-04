import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'

import type { PageDefinition } from './define-page'
import { presentationStore } from './store'

export interface PageRuntime<P, R> {
  params: P | undefined
  complete: (value: R) => void
  cancel: () => void
}

export function usePageRuntime<P extends object, R>(
  page: PageDefinition<P, R>,
): PageRuntime<P, R> {
  const router = useRouter()
  const { presentationId } = useLocalSearchParams<{
    presentationId?: string
  }>()
  const entry = presentationId
    ? presentationStore.read<P>(presentationId, page.route)
    : undefined
  const found = entry !== undefined

  useEffect(() => {
    if (!presentationId || !found) return
    return () => presentationStore.release(presentationId)
  }, [presentationId, found])

  const dismiss = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  if (!presentationId || !entry) {
    return { params: undefined, complete: () => {}, cancel: dismiss }
  }

  return {
    params: entry.params,
    complete: (value) => {
      if (presentationStore.complete(presentationId, value)) dismiss()
    },
    cancel: () => {
      if (presentationStore.cancel(presentationId)) dismiss()
    },
  }
}
