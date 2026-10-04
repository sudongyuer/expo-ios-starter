#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { IDENTITY_KEYS, readAppIdentity } from './app-identity.mjs'

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'artifacts',
  'dist',
  '.expo',
])
const SKIP_PATHS = [
  'apps/mobile/ios',
  'apps/mobile/android',
  'docs/specs',
  'LICENSE',
  'NOTICE',
  'pnpm-lock.yaml',
  'scripts/rename.test.mjs',
]
const TEXT_EXTENSIONS =
  /\.(ts|tsx|js|mjs|cjs|mts|json|md|yml|yaml|swift|podspec|m|mm|h)$/

const RULES = {
  name: [/^[^'"\\\n]+$/, 'letters, digits and spaces, no quotes'],
  slug: [/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase kebab-case'],
  scheme: [/^[a-z][a-z0-9+.-]*$/, 'lowercase, starting with a letter'],
  bundleId: [
    /^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/,
    'reverse-DNS like com.example.app',
  ],
  kit: [/^[A-Z][A-Za-z0-9]*$/, 'PascalCase like AcmeKit'],
}

export function kebab(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function validate(target) {
  return Object.entries(RULES)
    .filter(([field, [pattern]]) => !pattern.test(target[field] ?? ''))
    .map(([field, [, hint]]) => `--${kebab(field)} must be ${hint}`)
}

export function readKit(root) {
  const modulesDir = join(root, 'apps/mobile/modules')
  const [dir, ...others] = readdirSync(modulesDir).filter((name) =>
    statSync(join(modulesDir, name)).isDirectory(),
  )
  if (!dir || others.length > 0) {
    throw new Error(`Expected exactly one kit under ${modulesDir}`)
  }
  const config = JSON.parse(
    readFileSync(join(modulesDir, dir, 'expo-module.config.json'), 'utf8'),
  )
  const moduleName = config.apple?.modules?.[0] ?? ''
  if (!moduleName.endsWith('Module')) {
    throw new Error(`Unexpected kit module name "${moduleName}"`)
  }
  return { dir, name: moduleName.slice(0, -'Module'.length) }
}

function walk(root, dir = root) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    const rel = relative(root, path)
    if (SKIP_DIRS.has(name) || SKIP_PATHS.includes(rel)) return []
    if (statSync(path).isDirectory()) return walk(root, path)
    return TEXT_EXTENSIONS.test(name) ? [path] : []
  })
}

function replacements(current, target) {
  return [
    [current.kit.name, target.kit],
    [current.kit.dir, kebab(target.kit)],
    [`${current.scheme}://`, `${target.scheme}://`],
    [`${current.name} UI Verify`, `${target.name} UI Verify`],
  ].filter(([from, to]) => from !== to)
}

function rewriteAppConfig(source, target) {
  let next = source
  for (const [field, constant] of Object.entries(IDENTITY_KEYS)) {
    next = next.replace(
      new RegExp(`const ${constant} = '[^']+'`),
      `const ${constant} = '${target[field]}'`,
    )
  }
  return next
}

export function renameProject(root, target, { dryRun = false } = {}) {
  const appConfig = join(root, 'apps/mobile/app.config.ts')
  const current = { ...readAppIdentity(appConfig), kit: readKit(root) }
  const pairs = replacements(current, target)
  const changed = []

  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8')
    let next = pairs.reduce(
      (text, [from, to]) => text.replaceAll(from, to),
      source,
    )
    if (file === appConfig) next = rewriteAppConfig(next, target)
    if (next !== source) {
      changed.push(relative(root, file))
      if (!dryRun) writeFileSync(file, next)
    }
  }

  const moved = []
  const kitDir = join(root, 'apps/mobile/modules', current.kit.dir)
  const nextKitDir = join(dirname(kitDir), kebab(target.kit))
  const kitFiles = walk(kitDir)
  for (const file of kitFiles) {
    const name = basename(file)
    if (!name.includes(current.kit.name)) continue
    const destination = join(
      dirname(file),
      name.replaceAll(current.kit.name, target.kit),
    )
    moved.push([relative(root, file), relative(root, destination)])
    if (!dryRun) renameSync(file, destination)
  }
  if (kitDir !== nextKitDir) {
    if (existsSync(nextKitDir)) throw new Error(`${nextKitDir} already exists`)
    moved.push([relative(root, kitDir), relative(root, nextKitDir)])
    if (!dryRun) renameSync(kitDir, nextKitDir)
  }

  return { current, changed, moved }
}

function parseArgs(argv) {
  const flags = {
    '--name': 'name',
    '--slug': 'slug',
    '--scheme': 'scheme',
    '--bundle-id': 'bundleId',
    '--kit': 'kit',
  }
  const target = {}
  let dryRun = false
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') dryRun = true
    else if (flags[argv[i]]) target[flags[argv[i]]] = argv[++i]
    else if (argv[i] !== '--') throw new Error(`Unknown argument ${argv[i]}`)
  }
  target.slug ??= target.name ? kebab(target.name) : undefined
  return { target, dryRun }
}

function main(argv) {
  const { target, dryRun } = parseArgs(argv)
  const problems = validate(target)
  if (problems.length > 0) {
    console.error(
      'Usage: pnpm rename --name "Acme" --bundle-id com.acme.app --scheme acme --kit AcmeKit [--slug acme] [--dry-run]',
    )
    for (const problem of problems) console.error(`  ${problem}`)
    return 1
  }
  const root = resolve(import.meta.dirname, '..')
  const { current, changed, moved } = renameProject(root, target, { dryRun })
  console.log(
    `${dryRun ? 'Would rename' : 'Renamed'} ${current.name} → ${target.name}, ${current.kit.name} → ${target.kit}`,
  )
  for (const file of changed) console.log(`  edit  ${file}`)
  for (const [from, to] of moved) console.log(`  move  ${from} → ${to}`)
  if (!dryRun) {
    console.log(
      '\nNext: pnpm install, then regenerate the native project: (cd apps/mobile && npx expo prebuild --platform ios --clean)',
    )
  }
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
