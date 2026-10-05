import { Stack } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'

import { GroupedList } from '@/components/grouped-list'
import { useTranslation } from '@/i18n'
import { aboutService } from '@/services'
import { colors } from '@/theme/tokens'

export default function AboutScreen() {
  const { t } = useTranslation()
  const about = aboutService.getAboutInfo()

  return (
    <>
      <Stack.Screen
        options={{ title: t('about.title'), headerLargeTitleEnabled: false }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
      >
        <GroupedList
          testID="about"
          sections={[
            {
              id: 'app',
              rows: [
                {
                  id: 'version',
                  title: t('about.version'),
                  value: about.version,
                },
                { id: 'build', title: t('about.build'), value: about.build },
              ],
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
