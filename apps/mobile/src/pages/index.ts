import type { ColorId } from '@/features/colors'
import { definePage } from '@/lib/presentation'

export const PickColor = definePage<{ initial?: ColorId }, { color: ColorId }>({
  route: '/sheets/pick-color',
  presentation: 'modal',
})

export const presentedPages = [PickColor]
