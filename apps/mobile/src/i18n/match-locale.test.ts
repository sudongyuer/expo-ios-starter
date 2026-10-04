import { describe, expect, it } from 'vitest'

import { matchLanguage } from './match-locale'

const locale = (
  languageCode: string,
  languageScriptCode: string | null = null,
) => ({
  languageCode,
  languageScriptCode,
})

describe('matchLanguage', () => {
  it('maps Simplified Chinese to zh-Hans', () => {
    expect(matchLanguage([locale('zh', 'Hans')])).toBe('zh-Hans')
    expect(matchLanguage([locale('zh')])).toBe('zh-Hans')
  })

  it('skips Traditional Chinese because there is no zh-Hant catalog', () => {
    expect(matchLanguage([locale('zh', 'Hant'), locale('en')])).toBe('en')
  })

  it('uses the first supported language in preference order', () => {
    expect(
      matchLanguage([locale('ja'), locale('zh', 'Hans'), locale('en')]),
    ).toBe('zh-Hans')
  })

  it('falls back to en', () => {
    expect(matchLanguage([locale('fr')])).toBe('en')
    expect(matchLanguage([])).toBe('en')
  })
})
