import { useReducer } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

import {
  type GroupedListAccessory,
  type GroupedListNativeSection,
  GroupedListNativeView,
} from '@modules/starter-kit/src'

export interface GroupedListRow {
  id: string
  title: string
  subtitle?: string
  value?: string
  chevron?: boolean
  checked?: boolean
  navigates?: boolean
  onPress?: () => void
  toggle?: { value: boolean; onValueChange: (value: boolean) => void }
}

export interface GroupedListSection {
  id: string
  header?: string
  footer?: string
  rows: GroupedListRow[]
}

function accessoryOf(row: GroupedListRow): GroupedListAccessory {
  if (row.toggle) return 'toggle'
  if (row.checked) return 'checkmark'
  if (row.navigates || row.chevron) return 'chevron'
  return 'none'
}

function toNative(
  sections: GroupedListSection[],
  testID: string | undefined,
): GroupedListNativeSection[] {
  return sections.map(({ id, header, footer, rows }) => ({
    id,
    header,
    footer,
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      value: row.value,
      accessory: accessoryOf(row),
      isOn: row.toggle?.value ?? false,
      pressable: row.onPress !== undefined,
      navigates: row.navigates ?? false,
      accessibilityId: testID ? `${testID}.${row.id}` : undefined,
    })),
  }))
}

export function GroupedList({
  sections,
  style,
  testID,
}: {
  sections: GroupedListSection[]
  style?: StyleProp<ViewStyle>
  testID?: string
}) {
  const [revision, bumpRevision] = useReducer((n: number) => n + 1, 0)
  const findRow = (id: string) =>
    sections.flatMap((section) => section.rows).find((row) => row.id === id)

  return (
    <GroupedListNativeView
      revision={revision}
      sections={toNative(sections, testID)}
      testID={testID}
      style={style}
      onRowPress={({ nativeEvent }) => findRow(nativeEvent.id)?.onPress?.()}
      onRowToggle={({ nativeEvent }) => {
        findRow(nativeEvent.id)?.toggle?.onValueChange(nativeEvent.value)
        bumpRevision()
      }}
    />
  )
}
