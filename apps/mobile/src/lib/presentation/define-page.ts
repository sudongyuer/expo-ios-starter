import type { Href } from 'expo-router'

export type PagePresentation = 'modal' | 'fullScreenModal'

export interface PageDefinition<P, R> {
  route: Extract<Href, `/${string}`>
  presentation: PagePresentation
  readonly types?: { params: P; result: R }
}

export function definePage<P extends object, R>(
  definition: Omit<PageDefinition<P, R>, 'types'>,
): PageDefinition<P, R> {
  return definition
}
