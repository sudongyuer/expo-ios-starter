#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const STATUSES = ['proposed', 'approved', 'implemented', 'superseded']
export const RECORD_SUBSECTIONS = [
  'What was built',
  'Deviations from the design',
  'Bugs fixed during implementation',
  'Verification',
  'Known limits',
]
const DATE = /^\d{4}-\d{2}-\d{2}$/
const RECORD_HEADING =
  /^## Implementation Record(?: \(\d{4}-\d{2}-\d{2}\))?\s*$/

export function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return null
  const data = {}
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '')
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
    if (!kv) continue
    data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '')
  }
  return { data, body: text.slice(match[0].length) }
}

function recordProblems(body) {
  const lines = body.split(/\r?\n/)
  const starts = lines.flatMap((line, i) =>
    RECORD_HEADING.test(line) ? [i] : [],
  )
  if (starts.length === 0)
    return ['status is implemented but no "## Implementation Record" section']
  const problems = []
  for (const start of starts) {
    const end = lines.findIndex((line, i) => i > start && /^## /.test(line))
    const section = lines.slice(start + 1, end === -1 ? undefined : end)
    const headings = section
      .filter((line) => /^### /.test(line))
      .map((line) => line.slice(4).trim())
    for (const name of RECORD_SUBSECTIONS) {
      if (!headings.includes(name))
        problems.push(`${lines[start].trim()} is missing "### ${name}"`)
    }
  }
  return problems
}

function parseIndex(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue
    const link = /\]\(([^)]+\.md)\)/.exec(line)
    if (!link) continue
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter((_, i, all) => i > 0 && i < all.length - 1)
    const status = cells.find((cell) => STATUSES.includes(cell.toLowerCase()))
    rows.push({ file: basename(link[1]), status: status?.toLowerCase() })
  }
  return rows
}

export function checkSpecs(dir, { index = 'README.md' } = {}) {
  const problems = []
  const report = (file, message) => problems.push({ file, message })
  if (!existsSync(dir))
    return [{ file: dir, message: 'spec directory does not exist' }]

  const files = readdirSync(dir)
    .filter(
      (name) => name.endsWith('.md') && name !== index && !name.startsWith('_'),
    )
    .sort()
  const specs = new Map()
  for (const file of files) {
    const parsed = parseFrontmatter(readFileSync(join(dir, file), 'utf8'))
    if (!parsed) {
      report(file, 'missing YAML frontmatter')
      continue
    }
    specs.set(file, parsed)
  }

  for (const [file, { data, body }] of specs) {
    const { status } = data
    if (!STATUSES.includes(status))
      report(
        file,
        `invalid status "${status ?? ''}" (expected ${STATUSES.join(' | ')})`,
      )
    if (!data.title) report(file, 'missing title')
    if (!DATE.test(data.created ?? ''))
      report(file, 'created must be YYYY-MM-DD')
    if (
      (status === 'approved' || status === 'implemented') &&
      !DATE.test(data.approved ?? '')
    ) {
      report(file, `status ${status} requires approved: YYYY-MM-DD`)
    }
    if (status === 'implemented') {
      if (!DATE.test(data.implemented ?? ''))
        report(file, 'status implemented requires implemented: YYYY-MM-DD')
      for (const message of recordProblems(body)) report(file, message)
    }
    if (status === 'superseded') {
      const next = data['superseded-by']
      if (!next) report(file, 'status superseded requires superseded-by')
      else if (!specs.has(next))
        report(file, `superseded-by points to missing spec "${next}"`)
      else if (specs.get(next).data.supersedes !== file)
        report(file, `"${next}" does not declare supersedes: ${file}`)
    } else if (data['superseded-by']) {
      report(file, 'superseded-by is set but status is not superseded')
    }
    if (data.supersedes) {
      const prev = specs.get(data.supersedes)
      if (!prev)
        report(file, `supersedes points to missing spec "${data.supersedes}"`)
      else if (
        prev.data.status !== 'superseded' ||
        prev.data['superseded-by'] !== file
      ) {
        report(
          file,
          `"${data.supersedes}" must have status superseded and superseded-by: ${file}`,
        )
      }
    }
  }

  const indexPath = join(dir, index)
  if (!existsSync(indexPath)) {
    report(index, 'index file is missing')
    return problems
  }
  const rows = parseIndex(readFileSync(indexPath, 'utf8'))
  const counts = new Map()
  for (const row of rows) counts.set(row.file, (counts.get(row.file) ?? 0) + 1)
  for (const file of files) {
    const count = counts.get(file) ?? 0
    if (count === 0) report(index, `no index row for ${file}`)
    if (count > 1) report(index, `${file} is listed ${count} times`)
  }
  for (const row of rows) {
    if (!files.includes(row.file)) {
      report(index, `row links to missing spec "${row.file}"`)
      continue
    }
    const actual = specs.get(row.file)?.data.status
    if (actual && row.status !== actual)
      report(
        index,
        `status for ${row.file} is "${row.status ?? ''}" in the index but "${actual}" in the file`,
      )
  }
  return problems
}

function main(argv) {
  const args = { dir: 'docs/specs', index: 'README.md' }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dir') args.dir = argv[++i]
    else if (argv[i] === '--index') args.index = argv[++i]
    else if (argv[i] === '--help') {
      console.log(
        'Usage: check-specs.mjs [--dir docs/specs] [--index README.md]',
      )
      return 0
    }
  }
  const dir = resolve(args.dir)
  const problems = checkSpecs(dir, { index: args.index })
  for (const { file, message } of problems)
    console.error(`${join(args.dir, file)}: ${message}`)
  if (problems.length) {
    console.error(`\n${problems.length} problem(s) in ${args.dir}`)
    return 1
  }
  console.log(`${args.dir}: ok`)
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href)
  process.exitCode = main(process.argv.slice(2))
