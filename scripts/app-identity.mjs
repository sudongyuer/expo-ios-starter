#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const APP_CONFIG = resolve(
  import.meta.dirname,
  '../apps/mobile/app.config.ts',
)

export const IOS_DIR = resolve(import.meta.dirname, '../apps/mobile/ios')

export function readXcodeName(iosDir = IOS_DIR) {
  const workspaces = readdirSync(iosDir).filter((name) =>
    name.endsWith('.xcworkspace'),
  )
  if (workspaces.length !== 1) {
    throw new Error(
      `Expected one .xcworkspace in ${iosDir}, found ${workspaces.length}`,
    )
  }
  return workspaces[0].slice(0, -'.xcworkspace'.length)
}

export const IDENTITY_KEYS = {
  name: 'APP_NAME',
  slug: 'SLUG',
  scheme: 'SCHEME',
  bundleId: 'BUNDLE_ID',
}

export function readAppIdentity(file = APP_CONFIG) {
  const source = readFileSync(file, 'utf8')
  return Object.fromEntries(
    Object.entries(IDENTITY_KEYS).map(([field, constant]) => {
      const match = new RegExp(`const ${constant} = '([^']+)'`).exec(source)
      if (!match) throw new Error(`${file} has no ${constant}`)
      return [field, match[1]]
    }),
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const field = process.argv[2]
  if (field === 'xcode') {
    console.log(readXcodeName())
    process.exit(0)
  }
  const identity = readAppIdentity()
  if (!field) console.log(JSON.stringify(identity))
  else if (field in identity) console.log(identity[field])
  else {
    console.error(
      `Unknown field ${field}; expected ${Object.keys(identity).join(', ')}`,
    )
    process.exitCode = 1
  }
}
