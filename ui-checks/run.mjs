#!/usr/bin/env node
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { readAppIdentity, readXcodeName } from '../scripts/app-identity.mjs'
import { readSceneIds, UI } from './driver.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const APP_DIR = join(ROOT, 'apps/mobile')
const CHECKS_DIR = join(import.meta.dirname, 'checks')
const OUT_DIR = join(ROOT, 'artifacts/ui')
const SCENE_IDS = readSceneIds(join(APP_DIR, 'src/debug/scenes.ts'))
const BUILD_DIR = join(APP_DIR, 'ios/build-ui-verify')
const DEVICE_NAME = 'Starter UI Verify'
const DEVICE_TYPE = 'iPhone 17 Pro'
const CHECK_TIMEOUT_MS = 120_000

function parseArgs(argv) {
  const args = {
    checks: [],
    appearance: 'both',
    locale: 'zh-Hans',
    build: true,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--check') args.checks.push(...argv[++i].split(','))
    else if (arg === '--appearance') args.appearance = argv[++i]
    else if (arg === '--udid') args.udid = argv[++i]
    else if (arg === '--locale') args.locale = argv[++i]
    else if (arg === '--skip-build') args.build = false
    else throw new Error(`Unknown argument ${arg}`)
  }
  if (!['light', 'dark', 'both'].includes(args.appearance)) {
    throw new Error('--appearance must be light, dark or both')
  }
  return args
}

function sh(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options }).trim()
}

function resolveDevice(udid) {
  const { devices, runtimes } = {
    devices: JSON.parse(
      sh('xcrun', ['simctl', 'list', 'devices', 'available', '-j']),
    ).devices,
    runtimes: JSON.parse(
      sh('xcrun', ['simctl', 'list', 'runtimes', 'available', '-j']),
    ).runtimes,
  }
  const all = Object.entries(devices).flatMap(([runtime, list]) =>
    list.map((device) => ({ ...device, runtime })),
  )
  let device = udid
    ? all.find((d) => d.udid === udid)
    : all.find((d) => d.name === DEVICE_NAME)
  if (!device && udid) throw new Error(`No available simulator ${udid}`)
  if (!device) {
    const runtime = runtimes
      .filter((r) => r.platform === 'iOS')
      .sort((a, b) =>
        b.version.localeCompare(a.version, undefined, { numeric: true }),
      )[0]
    if (!runtime) throw new Error('No iOS simulator runtime installed')
    const created = sh('xcrun', [
      'simctl',
      'create',
      DEVICE_NAME,
      DEVICE_TYPE,
      runtime.identifier,
    ])
    device = { udid: created, name: DEVICE_NAME, runtime: runtime.identifier }
    console.log(`Created simulator "${DEVICE_NAME}" (${created})`)
  }
  spawnSync('xcrun', ['simctl', 'boot', device.udid], { stdio: 'ignore' })
  sh('xcrun', ['simctl', 'bootstatus', device.udid, '-b'])
  return device
}

function build(identity, udid) {
  if (!existsSync(join(APP_DIR, 'ios'))) {
    console.log('Generating ios/ with expo prebuild…')
    sh('npx', ['expo', 'prebuild', '--platform', 'ios'], {
      cwd: APP_DIR,
      stdio: 'inherit',
    })
  }
  const xcodeName = readXcodeName(join(APP_DIR, 'ios'))
  mkdirSync(OUT_DIR, { recursive: true })
  const log = join(OUT_DIR, 'build.log')
  console.log(`Building ${identity.name} (Release, UI verify) → ${log}`)
  const result = spawnSync(
    'xcodebuild',
    [
      '-workspace',
      join(APP_DIR, 'ios', `${xcodeName}.xcworkspace`),
      '-scheme',
      xcodeName,
      '-configuration',
      'Release',
      '-destination',
      `id=${udid}`,
      '-derivedDataPath',
      BUILD_DIR,
      'build',
    ],
    {
      cwd: APP_DIR,
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
      env: { ...process.env, EXPO_PUBLIC_UI_VERIFY: '1' },
    },
  )
  writeFileSync(log, `${result.stdout ?? ''}${result.stderr ?? ''}`)
  if (result.status !== 0) {
    const tail = `${result.stdout}${result.stderr}`
      .split('\n')
      .filter((l) => /error/i.test(l))
      .slice(-15)
    throw new Error(`xcodebuild failed:\n${tail.join('\n')}`)
  }
  return join(
    BUILD_DIR,
    'Build/Products/Release-iphonesimulator',
    `${xcodeName}.app`,
  )
}

async function loadChecks(names) {
  const available = readdirSync(CHECKS_DIR)
    .filter((file) => file.endsWith('.mjs'))
    .map((file) => basename(file, '.mjs'))
    .sort()
  const unknown = names.filter((name) => !available.includes(name))
  if (unknown.length > 0)
    throw new Error(`Unknown check: ${unknown.join(', ')}`)
  const selected = names.length > 0 ? names : available
  return Promise.all(
    selected.map(async (name) => ({
      name,
      ...(await import(pathToFileURL(join(CHECKS_DIR, `${name}.mjs`)).href)),
    })),
  )
}

function startRecording(udid, file) {
  const child = spawn(
    'xcrun',
    ['simctl', 'io', udid, 'recordVideo', '--codec=hevc', '--force', file],
    {
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  )
  const started = new Promise((resolveStart, rejectStart) => {
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      if (stderr.includes('Recording started')) resolveStart()
    })
    child.on('exit', (code) =>
      rejectStart(new Error(`recordVideo exited (${code}): ${stderr}`)),
    )
  })
  const stop = () =>
    new Promise((resolveStop) => {
      child.on('exit', () => resolveStop())
      child.kill('SIGINT')
    })
  return { started, stop }
}

function withTimeout(promise, ms, message) {
  let timer
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

function provenance(device) {
  const git = (...args) =>
    spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  const head = git('rev-parse', '--short', 'HEAD')
  return {
    commit: head.status === 0 ? head.stdout.trim() : 'none',
    dirty: git('status', '--porcelain').stdout.trim().length > 0,
    xcode: sh('xcodebuild', ['-version']).split('\n').join(' '),
    device: { name: device.name, udid: device.udid, runtime: device.runtime },
  }
}

async function runCheck({ check, appearance, device, identity, locale }) {
  const output = join(OUT_DIR, check.name, appearance)
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })
  const startedAt = Date.now()

  sh('xcrun', ['simctl', 'ui', device.udid, 'appearance', appearance])
  launch(device, identity, locale)

  const ui = new UI({
    udid: device.udid,
    output,
    scheme: identity.scheme,
    localesDir: join(APP_DIR, 'locales'),
    locale,
    sceneIds: SCENE_IDS,
  })
  const recording = check.video
    ? startRecording(device.udid, join(output, 'run.mp4'))
    : null
  let failure = null
  try {
    if (recording)
      await withTimeout(recording.started, 15_000, 'recordVideo did not start')
    await withTimeout(
      check.run(ui),
      CHECK_TIMEOUT_MS,
      `Timed out after ${CHECK_TIMEOUT_MS / 1000}s`,
    )
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error)
    await ui.capture('failure').catch(() => {})
  } finally {
    if (recording) await recording.stop()
  }

  const expected = check.video ? ['run.mp4'] : []
  const missing = expected.filter((file) => !existsSync(join(output, file)))
  if (!failure && missing.length > 0)
    failure = `Missing artifacts: ${missing.join(', ')}`

  const result = {
    check: check.name,
    behavior: check.behavior,
    appearance,
    locale,
    status: failure ? 'fail' : 'pass',
    failure,
    durationMs: Date.now() - startedAt,
    artifacts: readdirSync(output).sort(),
  }
  writeFileSync(
    join(output, 'result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  )
  return result
}

function launch(device, identity, locale) {
  spawnSync('xcrun', ['simctl', 'terminate', device.udid, identity.bundleId], {
    stdio: 'ignore',
  })
  const region = locale.startsWith('zh') ? 'zh_CN' : 'en_US'
  sh('xcrun', [
    'simctl',
    'launch',
    device.udid,
    identity.bundleId,
    '-AppleLanguages',
    `(${locale})`,
    '-AppleLocale',
    region,
  ])
}

async function preflight({ device, identity, locale }) {
  launch(device, identity, locale)
  const ui = new UI({
    udid: device.udid,
    output: OUT_DIR,
    scheme: identity.scheme,
    localesDir: join(APP_DIR, 'locales'),
    locale,
    sceneIds: SCENE_IDS,
  })
  try {
    await ui.openUrl('debug', 'debug.home')
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Preflight failed: the Debug page must be reachable in a UI verify build (${cause}). Rebuild without --skip-build.`,
    )
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const identity = readAppIdentity()
  const checks = await loadChecks(args.checks)
  const device = resolveDevice(args.udid)

  if (args.build) {
    const app = build(identity, device.udid)
    sh('xcrun', ['simctl', 'install', device.udid, app])
  }
  sh('xcrun', [
    'simctl',
    'status_bar',
    device.udid,
    'override',
    '--time',
    '9:41',
    '--batteryState',
    'charged',
    '--batteryLevel',
    '100',
    '--cellularBars',
    '4',
    '--wifiBars',
    '3',
  ])

  await preflight({ device, identity, locale: args.locale })

  const appearances =
    args.appearance === 'both' ? ['light', 'dark'] : [args.appearance]
  const results = []
  for (const appearance of appearances) {
    for (const check of checks) {
      process.stdout.write(`${check.name} (${appearance}) … `)
      const result = await runCheck({
        check,
        appearance,
        device,
        identity,
        locale: args.locale,
      })
      console.log(
        result.failure
          ? `FAIL\n  ${result.failure}`
          : `pass (${(result.durationMs / 1000).toFixed(1)}s)`,
      )
      results.push(result)
    }
  }

  const summary = { ...provenance(device), builtThisRun: args.build, results }
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(
    join(OUT_DIR, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  )
  const failed = results.filter((r) => r.status === 'fail')
  console.log(
    `\n${results.length - failed.length}/${results.length} passed → ${OUT_DIR}`,
  )
  return failed.length === 0 ? 0 : 1
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  },
)
