import { Redirect, Stack, useRouter } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'

import { GroupedList } from '@/components/grouped-list'
import { debugScenes } from '@/debug/scenes'
import { useTranslation } from '@/i18n'
import { debugToolsEnabled } from '@/lib/ui-verify'
import { colors } from '@/theme/tokens'

export default function DebugScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  if (!debugToolsEnabled) return <Redirect href="/" />

  return (
    <>
      <Stack.Screen options={{ title: t('debug.title') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
      >
        <GroupedList
          testID="debug"
          sections={[
            {
              id: 'scenes',
              header: t('debug.scenesHeader'),
              footer: t('debug.scenesFooter'),
              rows: debugScenes.map((scene) => ({
                id: scene.id,
                title: t(`debug.scenes.${scene.id}`),
                subtitle: scene.id,
                chevron: true,
                onPress: () => router.push(`/debug/scene/${scene.id}`),
              })),
            },
          ]}
        />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.groupedBackground },
})
