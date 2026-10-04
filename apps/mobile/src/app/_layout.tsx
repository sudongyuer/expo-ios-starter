import '@/i18n'

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'react-native'

import { presentedPages } from '@/pages'

const debugScreenOptions = {
  headerShown: true,
  headerTransparent: true,
  headerShadowVisible: false,
}

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="debug/index" options={debugScreenOptions} />
        <Stack.Screen name="debug/scene/[id]" options={debugScreenOptions} />
        {presentedPages.map((page) => (
          <Stack.Screen
            key={page.route}
            name={page.route.slice(1)}
            options={{
              presentation: page.presentation,
              headerShown: true,
              headerTransparent: true,
              headerShadowVisible: false,
            }}
          />
        ))}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  )
}
