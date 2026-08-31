#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const ROOT = process.cwd()
const RENDERER = path.join(ROOT, 'app', 'renderer')
const DICTIONARY = path.join(RENDERER, 'i18n', 'ja.ts')

const { values } = parseArgs({
  options: {
    base: { type: 'string' },
    head: { type: 'string' },
    output: { type: 'string', default: 'artifacts/i18n-missing-ja.json' },
  },
  strict: true,
})

if ((values.base && !values.head) || (!values.base && values.head)) {
  throw new Error('--base and --head must be supplied together')
}

const dictionarySource = fs.readFileSync(DICTIONARY, 'utf8')
const translated = new Set()
for (const match of dictionarySource.matchAll(/^\s*(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)")\s*:/gm)) {
  const raw = match[1] ?? match[2]
  translated.add(raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n'))
}

const candidates = new Map()
const removedCandidates = new Map()
const scannedFiles = new Set()
const MACHINE_TEXT = [
  /^(https?:\/\/|github\.com\/)/i,
  /^[-a-z0-9_.@/:#]+$/i,
  /^(GET|POST|PUT|PATCH|DELETE)$/,
  /^(true|false|null|undefined)$/,
  /^(light|dark|system|local|combined)$/,
  /^(var\(|rgb\(|hsl\(|calc\()/,
  /^(npm|npx|pnpm|bunx|codeburn|git|gh)\s/i,
  /^[a-z0-9_-]+(?:\s+[a-z0-9_-]+)+$/,
]

function normalize(value) {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function add(file, line, raw, target = candidates) {
  const value = normalize(raw)
  if (value.length < 2 || value.length > 260) return
  if (!/[A-Za-z]/.test(value) || MACHINE_TEXT.some(pattern => pattern.test(value))) return
  if (translated.has(value)) return
  if (!target.has(value)) target.set(value, new Set())
  target.get(value).add(`${file}:${line}`)
}

function shouldScanFile(file) {
  return /^app\/renderer\/.+\.(?:tsx?|jsx?)$/.test(file)
    && !/\.test\.[tj]sx?$/.test(file)
    && !file.includes('/i18n/')
}

function scanLine(file, lineNumber, line, target = candidates, markScanned = true) {
  if (line.includes('i18n-ignore')) return
  if (markScanned) scannedFiles.add(file)

  // Literal JSX children and human-facing attributes.
  for (const match of line.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) add(file, lineNumber, match[1], target)
  for (const match of line.matchAll(/(?:aria-label|ariaLabel|placeholder|title|alt)\s*=\s*["']([^"']*[A-Za-z][^"']*)["']/g)) add(file, lineNumber, match[1], target)

  // Common object/prop names used for visible strings.
  for (const match of line.matchAll(/(?:label|body|description|subtitle|caption|footer|prompt|message|note|hint|delta|empty|subject|text)\s*[:=]\s*(['"])([^'"\n]*[A-Za-z][^'"\n]*)\1/g)) add(file, lineNumber, match[2], target)

  // Remaining sentence-like literals catch ternaries and status/error copy,
  // while MACHINE_TEXT excludes class names, identifiers, paths and commands.
  for (const match of line.matchAll(/(['"])([^'"\n]*[A-Za-z][^'"\n]*)\1/g)) {
    if (/\s|[,.!?;:]/.test(match[2])) add(file, lineNumber, match[2], target)
  }
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['i18n', 'test', 'assets', 'styles'].includes(entry.name)) walk(full, files)
      continue
    }
    const relative = path.relative(ROOT, full).split(path.sep).join('/')
    if (shouldScanFile(relative)) files.push({ full, relative })
  }
  return files
}

function scanAllFiles() {
  for (const { full, relative } of walk(RENDERER)) {
    fs.readFileSync(full, 'utf8').split('\n').forEach((line, index) => scanLine(relative, index + 1, line))
  }
}

/** Scan only added lines from an upstream diff, avoiding legacy fallback text. */
function scanAddedDiffLines(base, head) {
  const diff = execFileSync(
    'git',
    ['diff', '--unified=0', '--no-color', '--diff-filter=AM', base, head, '--', 'app/renderer'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )

  let file = null
  let oldLine = 0
  let newLine = 0
  for (const rawLine of diff.split('\n')) {
    if (rawLine.startsWith('+++ b/')) {
      file = rawLine.slice(6)
      continue
    }
    const hunk = rawLine.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/)
    if (hunk) {
      oldLine = Number(hunk[1])
      newLine = Number(hunk[2])
      continue
    }
    if (!file || rawLine.startsWith('diff --git ') || rawLine.startsWith('index ')) continue
    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      if (shouldScanFile(file)) scanLine(file, newLine, rawLine.slice(1))
      newLine += 1
    } else if (rawLine.startsWith('-') && !rawLine.startsWith('---')) {
      if (shouldScanFile(file)) scanLine(file, oldLine, rawLine.slice(1), removedCandidates, false)
      oldLine += 1
    } else if (rawLine.startsWith(' ')) {
      oldLine += 1
      newLine += 1
    }
  }
}

if (values.base && values.head) {
  scanAddedDiffLines(values.base, values.head)
  // A modified source line may repeat legacy fallback text alongside a genuinely
  // new label. Remove exact candidates that were already present in deleted lines.
  for (const text of removedCandidates.keys()) candidates.delete(text)
} else {
  scanAllFiles()
}

const rows = [...candidates.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([text, locations]) => ({ text, locations: [...locations].slice(0, 8) }))

const reportPath = path.resolve(ROOT, values.output)
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  base: values.base ?? null,
  head: values.head ?? null,
  scannedFiles: [...scannedFiles].sort(),
  count: rows.length,
  rows,
}, null, 2) + '\n')

console.log(`Japanese i18n audit: ${rows.length} candidate string(s) are not covered`)
console.log(`Scanned files: ${scannedFiles.size}`)
console.log(`Report: ${path.relative(ROOT, reportPath)}`)
if (rows.length) process.exitCode = 2
