import { Stack } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'

import { GroupedList } from '@/components/grouped-list'
import { colorIds } from '@/features/colors'
import { useTranslation } from '@/i18n'
import { MissingPresentation, usePageRuntime } from '@/lib/presentation'
import { PickColor } from '@/pages'
import { colors } from '@/theme/tokens'

export default function PickColorScreen() {
  const { t } = useTranslation()
  const { params, complete, cancel } = usePageRuntime(PickColor)

  if (!params) return <MissingPresentation onClose={cancel} />

  return (
    <>
      <Stack.Screen options={{ title: t('pickColor.title') }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" onPress={cancel}>
          {t('common.cancel')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
      >
        <GroupedList
          testID="pick-color"
          sections={[
            {
              id: 'colors',
              rows: colorIds.map((id) => ({
                id,
                title: t(`colors.${id}`),
                checked: id === params.initial,
                onPress: () => complete({ color: id }),
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
