import { requireNativeView } from 'expo'
import type { ComponentType } from 'react'
import type { NativeSyntheticEvent, ViewProps } from 'react-native'

export type GroupedListAccessory = 'none' | 'chevron' | 'toggle' | 'checkmark'

export interface GroupedListNativeRow {
  id: string
  title: string
  subtitle?: string
  value?: string
  accessory: GroupedListAccessory
  isOn: boolean
  pressable: boolean
  navigates: boolean
  accessibilityId?: string
}

export interface GroupedListNativeSection {
  id: string
  header?: string
  footer?: string
  rows: GroupedListNativeRow[]
}

export type GroupedListRowPressEvent = NativeSyntheticEvent<{ id: string }>

export type GroupedListRowToggleEvent = NativeSyntheticEvent<{
  id: string
  value: boolean
}>

export interface GroupedListNativeViewProps extends ViewProps {
  sections: GroupedListNativeSection[]
  revision: number
  onRowPress?: (event: GroupedListRowPressEvent) => void
  onRowToggle?: (event: GroupedListRowToggleEvent) => void
}

export const GroupedListNativeView: ComponentType<GroupedListNativeViewProps> =
  requireNativeView('StarterKit', 'GroupedList')
