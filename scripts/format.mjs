#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

function changedFiles() {
  const git = (...args) =>
    execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean)
  return [
    ...new Set([
      ...git('diff', '--name-only', '--diff-filter=d', 'HEAD'),
      ...git('ls-files', '--others', '--exclude-standard'),
    ]),
  ].filter((file) => existsSync(file))
}

function hasHead() {
  return (
    spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { stdio: 'ignore' })
      .status === 0
  )
}

const args = process.argv.slice(2)
const files = args.length > 0 ? args : hasHead() ? changedFiles() : ['.']

if (files.length === 0) {
  console.log('format: no changed files')
} else {
  const result = spawnSync(
    'prettier',
    ['--write', '--ignore-unknown', ...files],
    { stdio: 'inherit' },
  )
  process.exitCode = result.status ?? 1
}
