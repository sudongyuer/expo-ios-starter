import { Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { useTranslation } from '@/i18n'
import { colors, spacing, type } from '@/theme/tokens'

export function MissingPresentation({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <Stack.Screen options={{ title: t('presentation.missingTitle') }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" onPress={onClose}>
          {t('common.close')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <View style={styles.screen} testID="presentation-missing">
        <Text style={styles.message}>{t('presentation.missingBody')}</Text>
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
  message: {
    ...type.body,
    color: colors.secondaryLabel,
    textAlign: 'center',
  },
})
