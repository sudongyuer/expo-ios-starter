export const uiVerify = process.env.EXPO_PUBLIC_UI_VERIFY === '1'

export const debugToolsEnabled = __DEV__ || uiVerify
