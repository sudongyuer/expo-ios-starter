import type { Stack } from 'expo-router'
import type { ComponentProps } from 'react'

type StackScreenOptions = NonNullable<
  ComponentProps<typeof Stack>['screenOptions']
>

export const tabStackScreenOptions = {
  headerLargeTitleEnabled: true,
  headerTransparent: true,
  headerShadowVisible: false,
} satisfies StackScreenOptions
