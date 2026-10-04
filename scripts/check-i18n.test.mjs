import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkCatalogs, checkUsedKeys, loadCatalogs } from './check-i18n.mjs'

const dirs = []

function fixture(locales, sources = {}) {
  const root = mkdtempSync(join(tmpdir(), 'check-i18n-'))
  dirs.push(root)
  mkdirSync(join(root, 'locales'))
  mkdirSync(join(root, 'src'))
  for (const [name, value] of Object.entries(locales)) {
    writeFileSync(join(root, 'locales', `${name}.json`), JSON.stringify(value))
  }
  for (const [name, text] of Object.entries(sources)) {
    writeFileSync(join(root, 'src', name), text)
  }
  return {
    catalogs: loadCatalogs(join(root, 'locales')),
    src: join(root, 'src'),
  }
}

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

describe('checkCatalogs', () => {
  it('passes when every locale has the reference keys', () => {
    const { catalogs } = fixture({
      en: { home: { title: 'Home' } },
      'zh-Hans': { home: { title: '首页' } },
    })
    expect(checkCatalogs(catalogs)).toEqual([])
  })

  it('fails when a key is deleted from en', () => {
    const { catalogs } = fixture({
      en: { home: {} },
      'zh-Hans': { home: { title: '首页' } },
    })
    expect(checkCatalogs(catalogs)).toEqual([
      'zh-Hans: key home.title is not in en.json',
    ])
  })

  it('fails when a translation is missing or empty', () => {
    const { catalogs } = fixture({
      en: { a: 'A', b: 'B' },
      'zh-Hans': { a: ' ' },
    })
    expect(checkCatalogs(catalogs)).toEqual([
      'zh-Hans: missing key b',
      'zh-Hans: empty value for a',
    ])
  })

  it('fails when placeholders differ', () => {
    const { catalogs } = fixture({
      en: { greet: 'Hi {{name}}' },
      'zh-Hans': { greet: '你好 {{user}}' },
    })
    expect(checkCatalogs(catalogs)).toEqual([
      'zh-Hans: greet placeholders {user} differ from en {name}',
    ])
  })
})

describe('checkUsedKeys', () => {
  it('reports t() keys that are not in en', () => {
    const { catalogs, src } = fixture(
      { en: { home: { title: 'Home' } } },
      { 'screen.tsx': "t('home.title'); t('home.missing')" },
    )
    const problems = checkUsedKeys(catalogs, src)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/t\('home\.missing'\) has no entry in en\.json/)
  })
})
