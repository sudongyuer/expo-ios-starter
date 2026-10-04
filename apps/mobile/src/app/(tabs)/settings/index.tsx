import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Linking, ScrollView, StyleSheet } from 'react-native'

import { GroupedList } from '@/components/grouped-list'
import { useTranslation } from '@/i18n'
import { debugToolsEnabled } from '@/lib/ui-verify'
import { colors } from '@/theme/tokens'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [demoOn, setDemoOn] = useState(false)

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
      >
        <GroupedList
          testID="settings"
          sections={[
            {
              id: 'demo',
              header: t('settings.demo.header'),
              footer: t('settings.demo.footer'),
              rows: [
                {
                  id: 'demo-toggle',
                  title: t('settings.demo.toggle'),
                  subtitle: t('settings.demo.toggleSubtitle'),
                  toggle: { value: demoOn, onValueChange: setDemoOn },
                },
              ],
            },
            {
              id: 'general',
              header: t('settings.general.header'),
              footer: t('settings.general.languageFooter'),
              rows: [
                {
                  id: 'language',
                  title: t('settings.general.language'),
                  value: t('settings.general.languageValue'),
                  chevron: true,
                  onPress: () => void Linking.openSettings(),
                },
                {
                  id: 'about',
                  title: t('settings.general.about'),
                  navigates: true,
                  onPress: () => router.push('/settings/about'),
                },
              ],
            },
            ...(debugToolsEnabled
              ? [
                  {
                    id: 'developer',
                    header: t('settings.developer.header'),
                    rows: [
                      {
                        id: 'debug',
                        title: t('settings.developer.debug'),
                        navigates: true,
                        onPress: () => router.push('/debug'),
                      },
                    ],
                  },
                ]
              : []),
          ]}
        />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.groupedBackground },
})
