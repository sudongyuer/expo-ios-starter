import type { Href } from 'expo-router'

export const debugScenes = [
  { id: 'home', href: '/' },
  { id: 'settings', href: '/settings' },
  { id: 'about', href: '/settings/about' },
  { id: 'pick-color-missing', href: '/sheets/pick-color' },
] as const satisfies readonly { id: string; href: Href }[]

export type DebugScene = (typeof debugScenes)[number]

export function findScene(id: string | undefined): DebugScene | undefined {
  return debugScenes.find((scene) => scene.id === id)
}
