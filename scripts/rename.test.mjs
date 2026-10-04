import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { kebab, renameProject, validate } from './rename.mjs'

const TARGET = {
  name: 'Acme Notes',
  slug: 'acme-notes',
  scheme: 'acme',
  bundleId: 'com.acme.notes',
  kit: 'AcmeKit',
}

const FILES = {
  'apps/mobile/app.config.ts': [
    "const APP_NAME = 'Starter'",
    "const SLUG = 'expo-ios-starter'",
    "const SCHEME = 'starter'",
    "const BUNDLE_ID = 'com.example.starter'",
  ].join('\n'),
  'apps/mobile/modules/starter-kit/expo-module.config.json':
    '{"platforms":["apple"],"apple":{"modules":["StarterKitModule"]}}',
  'apps/mobile/modules/starter-kit/ios/StarterKit.podspec':
    "s.name = 'StarterKit'",
  'apps/mobile/modules/starter-kit/ios/StarterKitModule.swift':
    'public class StarterKitModule: Module { Name("StarterKit") }',
  'apps/mobile/modules/starter-kit/src/index.ts':
    "requireNativeView('StarterKit', 'GroupedList')",
  'apps/mobile/src/components/grouped-list.tsx':
    "import { X } from '@modules/starter-kit/src'",
  'apps/mobile/locales/en.json': '{"footer":"Open starter://debug/scene/<id>"}',
  'apps/mobile/ios/Starter/Info.plist.json': '"StarterKit"',
  'ui-checks/run.mjs': "const DEVICE_NAME = 'Starter UI Verify'",
  'docs/specs/2026-10-04-starter-design.md': 'StarterKit starter-kit',
  'AGENTS.md':
    'Native code lives in `apps/mobile/modules/starter-kit` (`StarterKitModule`).',
}

const roots = []

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'rename-'))
  roots.push(root)
  for (const [file, content] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), content)
  }
  return root
}

const read = (root, file) => readFileSync(join(root, file), 'utf8')

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

describe('validate', () => {
  it('accepts a well-formed target', () => {
    expect(validate(TARGET)).toEqual([])
  })

  it('names every invalid field', () => {
    expect(
      validate({ ...TARGET, bundleId: 'acme', scheme: 'Acme', kit: 'acmeKit' }),
    ).toEqual([
      '--scheme must be lowercase, starting with a letter',
      '--bundle-id must be reverse-DNS like com.example.app',
      '--kit must be PascalCase like AcmeKit',
    ])
  })
})

describe('kebab', () => {
  it('converts kit and app names', () => {
    expect(kebab('StarterKit')).toBe('starter-kit')
    expect(kebab('Acme Notes')).toBe('acme-notes')
  })
})

describe('renameProject', () => {
  it('rewrites identity, kit, scheme links and file names', () => {
    const root = fixture()
    renameProject(root, TARGET)

    expect(read(root, 'apps/mobile/app.config.ts')).toBe(
      [
        "const APP_NAME = 'Acme Notes'",
        "const SLUG = 'acme-notes'",
        "const SCHEME = 'acme'",
        "const BUNDLE_ID = 'com.acme.notes'",
      ].join('\n'),
    )
    const kit = 'apps/mobile/modules/acme-kit'
    expect(existsSync(join(root, 'apps/mobile/modules/starter-kit'))).toBe(
      false,
    )
    expect(read(root, `${kit}/expo-module.config.json`)).toContain(
      'AcmeKitModule',
    )
    expect(read(root, `${kit}/ios/AcmeKit.podspec`)).toBe("s.name = 'AcmeKit'")
    expect(read(root, `${kit}/ios/AcmeKitModule.swift`)).toBe(
      'public class AcmeKitModule: Module { Name("AcmeKit") }',
    )
    expect(read(root, `${kit}/src/index.ts`)).toContain("'AcmeKit'")
    expect(read(root, 'apps/mobile/src/components/grouped-list.tsx')).toContain(
      '@modules/acme-kit/src',
    )
    expect(read(root, 'apps/mobile/locales/en.json')).toContain('acme://debug')
    expect(read(root, 'ui-checks/run.mjs')).toContain('Acme Notes UI Verify')
    expect(read(root, 'AGENTS.md')).toBe(
      'Native code lives in `apps/mobile/modules/acme-kit` (`AcmeKitModule`).',
    )
  })

  it('leaves specs and the generated ios/ folder alone', () => {
    const root = fixture()
    renameProject(root, TARGET)
    expect(read(root, 'docs/specs/2026-10-04-starter-design.md')).toBe(
      'StarterKit starter-kit',
    )
    expect(read(root, 'apps/mobile/ios/Starter/Info.plist.json')).toBe(
      '"StarterKit"',
    )
  })

  it('changes nothing on a dry run', () => {
    const root = fixture()
    const { changed, moved } = renameProject(root, TARGET, { dryRun: true })
    expect(changed.length).toBeGreaterThan(0)
    expect(moved.length).toBeGreaterThan(0)
    for (const [file, content] of Object.entries(FILES)) {
      expect(read(root, file)).toBe(content)
    }
  })
})
