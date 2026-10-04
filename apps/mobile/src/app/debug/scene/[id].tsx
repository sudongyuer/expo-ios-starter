import { Redirect, Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { findScene } from '@/debug/scenes'
import { useTranslation } from '@/i18n'
import { debugToolsEnabled } from '@/lib/ui-verify'
import { colors, spacing, type } from '@/theme/tokens'

export default function DebugSceneScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const scene = findScene(id)

  if (!debugToolsEnabled) return <Redirect href="/" />
  if (scene) return <Redirect href={scene.href} />

  return (
    <>
      <Stack.Screen options={{ title: t('debug.missingSceneTitle') }} />
      <View style={styles.screen} testID="ui-verify-missing-scene">
        <Text style={styles.message}>
          {t('debug.missingSceneBody', { id })}
        </Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.groupedBackground,
  },
  message: { ...type.body, color: colors.secondaryLabel, textAlign: 'center' },
})
