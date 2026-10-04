import type { Stack } from 'expo-router'
import type { ComponentProps } from 'react'

type StackScreenOptions = NonNullable<
  ComponentProps<typeof Stack>['screenOptions']
>

export const tabStackScreenOptions = {
  headerLargeTitle: true,
  headerTransparent: true,
  headerShadowVisible: false,
} satisfies StackScreenOptions
