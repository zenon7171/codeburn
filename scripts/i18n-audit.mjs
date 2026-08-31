#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import ts from 'typescript'
import { normalize, scanSource } from './i18n-scan.mjs'

const ROOT = process.cwd()
const { values } = parseArgs({
  options: {
    base: { type: 'string' }, head: { type: 'string' },
    output: { type: 'string', default: 'artifacts/i18n-missing-ja.json' },
  }, strict: true,
})
if (Boolean(values.base) !== Boolean(values.head)) throw new Error('--base and --head must be supplied together')

const dictionaryPath = 'app/renderer/i18n/ja.ts'
const dictionary = ts.createSourceFile(dictionaryPath, fs.readFileSync(path.join(ROOT, dictionaryPath), 'utf8'), ts.ScriptTarget.Latest, true)
const translated = new Set()
function readKeys(node) {
  if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) translated.add(normalize(node.name.text))
  ts.forEachChild(node, readKeys)
}
readKeys(dictionary)
const candidates = new Map()
const scannedFiles = new Set()
const shouldScan = file => /^app\/renderer\/.+\.[tj]sx?$/.test(file)
  && !/\.test\.[tj]sx?$/.test(file) && !/\/(i18n|test|assets|styles)\//.test(file)
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
function collect(file, source, previous = new Set()) {
  scannedFiles.add(file)
  for (const { text, line } of scanSource(file, source)) {
    if (translated.has(text) || previous.has(text)) continue
    if (!candidates.has(text)) candidates.set(text, new Set())
    candidates.get(text).add(`${file}:${line}`)
  }
}
if (values.base && values.head) {
  // Resolve revisions first so user arguments cannot be interpreted as git options.
  const base = git(['rev-parse', '--verify', '--end-of-options', `${values.base}^{commit}`]).trim()
  const head = git(['rev-parse', '--verify', '--end-of-options', `${values.head}^{commit}`]).trim()
  const files = git(['diff', '--name-only', '-z', '--no-renames', '--diff-filter=AM', base, head, '--', 'app/renderer']).split('\0').filter(shouldScan)
  const oldFiles = new Set(git(['ls-tree', '-r', '--name-only', '-z', base, '--', 'app/renderer']).split('\0'))
  for (const file of files) {
    const previous = oldFiles.has(file) ? new Set(scanSource(file, git(['show', `${base}:${file}`])).map(row => row.text)) : new Set()
    collect(file, git(['show', `${head}:${file}`]), previous)
  }
} else {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else {
        const file = path.relative(ROOT, full).split(path.sep).join('/')
        if (shouldScan(file)) collect(file, fs.readFileSync(full, 'utf8'))
      }
    }
  }
  walk(path.join(ROOT, 'app/renderer'))
}
const rows = [...candidates].sort((a, b) => a[0].localeCompare(b[0]))
  .map(([text, locations]) => ({ text, locations: [...locations].slice(0, 8) }))
const reportPath = path.resolve(ROOT, values.output)
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(), base: values.base ?? null, head: values.head ?? null,
  scannedFiles: [...scannedFiles].sort(), count: rows.length, rows,
}, null, 2) + '\n')
console.log(`Japanese i18n audit: ${rows.length} candidate string(s) need review`)
console.log(`Scanned files: ${scannedFiles.size}`)
console.log(`Report: ${path.relative(ROOT, reportPath)}`)
if (rows.length) process.exitCode = 2
