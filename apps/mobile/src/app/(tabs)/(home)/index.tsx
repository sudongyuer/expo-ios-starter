import { Stack } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'

import { GroupedList } from '@/components/grouped-list'
import type { ColorId } from '@/features/colors'
import { useTranslation } from '@/i18n'
import { present } from '@/lib/presentation'
import { PickColor } from '@/pages'
import { colors, spacing, type } from '@/theme/tokens'

type LastResult =
  { status: 'completed'; color: ColorId } | { status: 'cancelled' }

export default function HomeScreen() {
  const { t } = useTranslation()
  const [color, setColor] = useState<ColorId>()
  const [last, setLast] = useState<LastResult>()

  const pickColor = async () => {
    const result = await present(PickColor, { initial: color })
    if (result.status === 'completed') {
      setColor(result.value.color)
      setLast({ status: 'completed', color: result.value.color })
    } else {
      setLast({ status: 'cancelled' })
    }
  }

  const footer =
    last === undefined
      ? t('home.present.footerIdle')
      : last.status === 'completed'
        ? t('home.present.footerCompleted', {
            color: t(`colors.${last.color}`),
          })
        : t('home.present.footerCancelled')

  return (
    <>
      <Stack.Screen options={{ title: t('home.title') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
      >
        <Text style={styles.body}>{t('home.body')}</Text>
        <GroupedList
          testID="home"
          sections={[
            {
              id: 'present',
              header: t('home.present.header'),
              footer,
              rows: [
                {
                  id: 'color',
                  title: t('home.present.color'),
                  value: color ? t(`colors.${color}`) : t('home.present.none'),
                  chevron: true,
                  onPress: () => void pickColor(),
                },
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
  body: {
    ...type.body,
    color: colors.label,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
})
