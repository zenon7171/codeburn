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
