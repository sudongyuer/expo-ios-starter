export const supportedLanguages = ['en', 'zh-Hans'] as const

export type Language = (typeof supportedLanguages)[number]

export const fallbackLanguage: Language = 'en'

export interface SystemLocale {
  languageCode: string | null
  languageScriptCode: string | null
}

function matchOne({
  languageCode,
  languageScriptCode,
}: SystemLocale): Language | null {
  if (languageCode === 'zh') {
    return languageScriptCode === 'Hant' ? null : 'zh-Hans'
  }
  if (languageCode === 'en') return 'en'
  return null
}

export function matchLanguage(locales: readonly SystemLocale[]): Language {
  for (const locale of locales) {
    const matched = matchOne(locale)
    if (matched) return matched
  }
  return fallbackLanguage
}
