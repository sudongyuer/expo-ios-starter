import { execFile } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const POLL_MS = 200
const OPEN_IN_APP_LABELS = ['打开', 'Open']

function flatten(node, out = []) {
  if (Array.isArray(node)) {
    for (const child of node) flatten(child, out)
  } else if (node && typeof node === 'object') {
    out.push(node)
    flatten(node.children ?? [], out)
  }
  return out
}

function lookup(catalog, key) {
  return key.split('.').reduce((value, part) => value?.[part], catalog)
}

export function readSceneIds(scenesFile) {
  const source = readFileSync(scenesFile, 'utf8')
  return [...source.matchAll(/\{\s*id:\s*'([^']+)'/g)].map((match) => match[1])
}

export class UI {
  constructor({ udid, output, scheme, localesDir, locale, sceneIds }) {
    this.sceneIds = sceneIds
    this.udid = udid
    this.output = output
    this.scheme = scheme
    this.catalog = JSON.parse(
      readFileSync(join(localesDir, `${locale}.json`), 'utf8'),
    )
  }

  t(key, vars = {}) {
    const template = lookup(this.catalog, key)
    if (typeof template !== 'string') throw new Error(`Missing text ${key}`)
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) =>
      String(vars[name] ?? ''),
    )
  }

  async axe(...args) {
    const { stdout } = await run('axe', [...args, '--udid', this.udid], {
      timeout: 20_000,
      maxBuffer: 64 * 1024 * 1024,
    })
    return stdout
  }

  async tree() {
    return flatten(JSON.parse(await this.axe('describe-ui')))
  }

  async wait(predicate, message, timeoutMs = 15_000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const result = predicate(await this.tree())
      if (result) return result
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
    throw new Error(`Timed out: ${message}`)
  }

  element(id, timeoutMs) {
    return this.wait(
      (items) => items.find((item) => item.AXUniqueId === id),
      `element ${id}`,
      timeoutMs,
    )
  }

  labelled(label, timeoutMs) {
    return this.wait(
      (items) => items.find((item) => item.AXLabel === label),
      `label "${label}"`,
      timeoutMs,
    )
  }

  gone(id, timeoutMs) {
    return this.wait(
      (items) => !items.some((item) => item.AXUniqueId === id),
      `element ${id} to disappear`,
      timeoutMs,
    )
  }

  async valueOf(id, expected) {
    return this.wait(
      (items) =>
        items.find(
          (item) => item.AXUniqueId === id && item.AXValue === expected,
        ),
      `element ${id} with value "${expected}"`,
    )
  }

  async tap(id) {
    await this.element(id)
    await this.axe('tap', '--id', id, '--post-delay', '0.3')
  }

  async tapLabel(label) {
    await this.labelled(label)
    await this.axe('tap', '--label', label, '--post-delay', '0.3')
  }

  async swipeDown() {
    const [app] = await this.tree()
    const { width, height } = app.frame
    await this.axe(
      'swipe',
      '--start-x',
      String(width / 2),
      '--start-y',
      String(height * 0.35),
      '--end-x',
      String(width / 2),
      '--end-y',
      String(height * 0.98),
      '--duration',
      '0.25',
    )
  }

  async openUrl(path, readyId) {
    await run('xcrun', [
      'simctl',
      'openurl',
      this.udid,
      `${this.scheme}://${path}`,
    ])
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline) {
      const items = await this.tree()
      if (items.some((item) => item.AXUniqueId === 'ui-verify-missing-scene')) {
        throw new Error(`Missing scene for ${path}`)
      }
      if (items.some((item) => item.AXUniqueId === readyId)) return
      // SpringBoard asks before handing a custom-scheme URL to the app.
      const confirm = items.find(
        (item) =>
          item.type === 'Button' && OPEN_IN_APP_LABELS.includes(item.AXLabel),
      )
      if (confirm) await this.axe('tap', '--label', confirm.AXLabel)
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
    throw new Error(`Timed out: ${path} did not show ${readyId}`)
  }

  openScene(sceneId, readyId) {
    if (!this.sceneIds.includes(sceneId)) {
      throw new Error(`Missing scene ${sceneId}`)
    }
    return this.openUrl(`debug/scene/${sceneId}`, readyId)
  }

  expect(condition, message) {
    if (!condition) throw new Error(`Assertion failed: ${message}`)
  }

  expectTarget(item, name) {
    const { width, height } = item.frame
    this.expect(
      width >= 44 && height >= 44,
      `${name} touch target is ${Math.round(width)}×${Math.round(height)} pt, needs 44×44`,
    )
  }

  async capture(name) {
    await run('xcrun', [
      'simctl',
      'io',
      this.udid,
      'screenshot',
      join(this.output, `${name}.png`),
    ])
    writeFileSync(
      join(this.output, `${name}.json`),
      await this.axe('describe-ui'),
    )
  }
}
