import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanSource } from './i18n-scan.mjs'

const texts = source => scanSource('example.tsx', source).map(row => row.text)
test('finds multiline JSX, single-word labels and lowercase UI copy', () => {
  const found = texts(`<section>
    New account
    settings
    <button title="Refresh">retry now</button>
    <button>{ok ? 'Connected' : 'Disconnected'}</button>
  </section>`)
  for (const text of ['New account settings', 'Refresh', 'retry now', 'Connected', 'Disconnected']) assert.ok(found.includes(text), text)
})
test('preserves escaped apostrophes and dynamic template candidates', () => {
  const found = texts('const message = "You\\\'re offline"; const label = `Showing ${count} sessions`;')
  assert.ok(found.includes("You're offline"))
  assert.ok(found.includes('Showing ${…} sessions'))
})
test('ignores machine strings and comments without ignoring display properties', () => {
  const found = texts(`import x from 'some-package';
    // "Not a visible sentence"
    const item = { className: 'row panel', label: 'Widgets', title: 'try again' };
    const el = <div className="dashboard" data-testid="main-panel" />;`)
  assert.deepEqual(found, ['Widgets', 'try again'])
})
test('reports source positions for strings crossing line boundaries', () => {
  const rows = scanSource('example.tsx', 'const view = <p>\n  A long message\n  continues here\n</p>')
  assert.deepEqual(rows, [{ text: 'A long message continues here', line: 2 }])
})
