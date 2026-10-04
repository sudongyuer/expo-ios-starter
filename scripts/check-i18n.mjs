#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const REFERENCE = 'en'
const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g
const T_CALL = /\bt\(\s*['"`]([\w.-]+)['"`]/g

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) =>
    child !== null && typeof child === 'object'
      ? flatten(child, `${prefix}${key}.`)
      : [[`${prefix}${key}`, child]],
  )
}

function placeholders(text) {
  return [...String(text).matchAll(PLACEHOLDER)].map((m) => m[1]).sort()
}

export function loadCatalogs(localesDir) {
  return Object.fromEntries(
    readdirSync(localesDir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => [
        basename(name, '.json'),
        new Map(
          flatten(JSON.parse(readFileSync(join(localesDir, name), 'utf8'))),
        ),
      ]),
  )
}

export function checkCatalogs(catalogs) {
  const problems = []
  const reference = catalogs[REFERENCE]
  if (!reference) return [`missing reference catalog ${REFERENCE}.json`]

  for (const [locale, catalog] of Object.entries(catalogs)) {
    for (const key of reference.keys()) {
      if (!catalog.has(key)) problems.push(`${locale}: missing key ${key}`)
    }
    for (const [key, value] of catalog) {
      if (!reference.has(key)) {
        problems.push(`${locale}: key ${key} is not in ${REFERENCE}.json`)
        continue
      }
      if (typeof value !== 'string' || value.trim() === '') {
        problems.push(`${locale}: empty value for ${key}`)
        continue
      }
      const expected = placeholders(reference.get(key)).join(',')
      const actual = placeholders(value).join(',')
      if (expected !== actual) {
        problems.push(
          `${locale}: ${key} placeholders {${actual}} differ from ${REFERENCE} {${expected}}`,
        )
      }
    }
  }
  return problems
}

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

export function checkUsedKeys(catalogs, srcDir) {
  const reference = catalogs[REFERENCE] ?? new Map()
  return sourceFiles(srcDir).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(T_CALL)]
      .map((m) => m[1])
      .filter((key) => !reference.has(key))
      .map((key) => `${file}: t('${key}') has no entry in ${REFERENCE}.json`),
  )
}

function main(argv) {
  const args = { locales: 'apps/mobile/locales', src: 'apps/mobile/src' }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--locales') args.locales = argv[++i]
    else if (argv[i] === '--src') args.src = argv[++i]
  }
  const catalogs = loadCatalogs(resolve(args.locales))
  const problems = [
    ...checkCatalogs(catalogs),
    ...checkUsedKeys(catalogs, resolve(args.src)),
  ]
  for (const problem of problems) console.error(problem)
  if (problems.length > 0) return 1
  console.log(`i18n ok: ${Object.keys(catalogs).join(', ')}`)
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.argv.slice(2))
}
