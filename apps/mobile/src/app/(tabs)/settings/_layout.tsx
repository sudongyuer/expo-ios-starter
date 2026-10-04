import { Stack } from 'expo-router'

import { tabStackScreenOptions } from '@/navigation/tab-stack-options'

export default function TabStackLayout() {
  return <Stack screenOptions={tabStackScreenOptions} />
}
