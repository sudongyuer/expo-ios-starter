import type { PresentationResult } from '@starter/core'
import { type Href, router } from 'expo-router'

import type { PageDefinition } from './define-page'
import { presentationStore } from './store'

export function present<P, R>(
  page: PageDefinition<P, R>,
  params: P,
): Promise<PresentationResult<R>> {
  const { id, result } = presentationStore.open<P, R>(page.route, params)
  router.push({ pathname: page.route, params: { presentationId: id } } as Href)
  return result
}
