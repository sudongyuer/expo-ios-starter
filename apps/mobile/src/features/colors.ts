export const colorIds = ['red', 'orange', 'green', 'blue', 'purple'] as const

export type ColorId = (typeof colorIds)[number]
