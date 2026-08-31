// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { installJapaneseLocalization, localizeJapaneseSubtree, translateJa } from './runtime'

let dispose: (() => void) | null = null

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
  document.documentElement.lang = 'en'
  delete document.documentElement.dataset.locale
})

describe('Japanese renderer localization', () => {
  it.each([
    ['90% used · resets in 2h', '90%使用 · 2時間後にリセット'],
    ['25% used · resets in 2h 29m', '25%使用 · 2時間29分後にリセット'],
    ['92% used · resets in 3d 14h', '92%使用 · 3日14時間後にリセット'],
    ['10% used · resets in 5m', '10%使用 · 5分後にリセット'],
    ['100% used · resets now', '100%使用 · 今すぐリセット'],
    ['10% used', '10%使用'],
  ])('translates quota countdown %s', (source, expected) => {
    expect(translateJa(source)).toBe(expected)
    expect(translateJa(expected)).toBe(expected)
  })

  it('protects nested code, editable content and explicitly excluded user data', () => {
    document.body.innerHTML = `
      <pre><code><span title="Overview">Overview</span></code></pre>
      <div contenteditable="true"><b>Settings</b></div>
      <div translate="no"><span>Overview</span></div>
      <div data-no-i18n="true"><span>Models</span></div>
      <p>Settings</p>
    `
    localizeJapaneseSubtree(document.body)
    expect(document.querySelector('pre span')).toHaveTextContent('Overview')
    expect(document.querySelector('pre span')).toHaveAttribute('title', 'Overview')
    expect(document.querySelector('[contenteditable]')).toHaveTextContent('Settings')
    expect(document.querySelector('[translate]')).toHaveTextContent('Overview')
    expect(document.querySelector('[data-no-i18n]')).toHaveTextContent('Models')
    expect(document.querySelector('p')).toHaveTextContent('設定')
  })

  it('translates exact and dynamic strings while preserving whitespace', () => {
    expect(translateJa('  Overview  ')).toBe('  概要  ')
    expect(translateJa('refreshed 12m ago')).toBe('12分前に更新')
    expect(translateJa('Showing 120 of 540')).toBe('540件中120件を表示')
    expect(translateJa('Aug 31, 2026')).toBe('2026年8月31日')
    expect(translateJa('Claude 3.7 Sonnet')).toBe('Claude 3.7 Sonnet')
  })

  it('localizes text and accessibility attributes but leaves code unchanged', () => {
    document.body.innerHTML = `
      <main aria-label="Key performance indicators">
        <h1>Overview</h1>
        <button title="Check for updates">Refresh</button>
        <code>Overview</code>
      </main>
    `

    localizeJapaneseSubtree(document.body)

    expect(document.querySelector('h1')).toHaveTextContent('概要')
    expect(document.querySelector('button')).toHaveTextContent('更新')
    expect(document.querySelector('button')).toHaveAttribute('title', 'アップデートを確認')
    expect(document.querySelector('main')).toHaveAttribute('aria-label', '主要指標')
    expect(document.querySelector('code')).toHaveTextContent('Overview')
  })

  it('localizes nodes added after installation', async () => {
    dispose = installJapaneseLocalization()
    if (document.readyState === 'loading') document.dispatchEvent(new Event('DOMContentLoaded'))
    await Promise.resolve()

    const button = document.createElement('button')
    button.textContent = 'Compare'
    button.setAttribute('aria-label', 'Choose date range')
    document.body.append(button)

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(button).toHaveTextContent('比較')
    expect(button).toHaveAttribute('aria-label', '期間を選択')
    expect(document.documentElement).toHaveAttribute('lang', 'ja')
    expect(document.documentElement.dataset.locale).toBe('ja')
  })
})
