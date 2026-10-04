import { getLocales } from 'expo-localization'
import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/locales/en.json'
import zhHans from '@/locales/zh-Hans.json'

import { fallbackLanguage, matchLanguage } from './match-locale'

export const resources = {
  en: { translation: en },
  'zh-Hans': { translation: zhHans },
} as const

export const i18n = createInstance()

void i18n.use(initReactI18next).init({
  resources,
  lng: matchLanguage(getLocales()),
  fallbackLng: fallbackLanguage,
  initAsync: false,
  interpolation: { escapeValue: false },
})

export { useTranslation } from 'react-i18next'
