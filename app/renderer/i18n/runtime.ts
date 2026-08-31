import { JA_TRANSLATIONS } from './ja'

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA'])
const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'title', 'placeholder'] as const

const MONTHS: Readonly<Record<string, number>> = Object.freeze({
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  January: 1, February: 2, March: 3, April: 4, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
})

const COUNT_NOUNS: Readonly<Record<string, string>> = Object.freeze({
  session: 'セッション', sessions: 'セッション',
  call: '回の呼び出し', calls: '回の呼び出し',
  turn: 'ターン', turns: 'ターン',
  token: 'トークン', tokens: 'トークン',
  finding: '件', findings: '件',
  correction: '回の修正', corrections: '回の修正',
  edit: '回の編集', edits: '回の編集',
  device: '台のデバイス', devices: '台のデバイス',
})

function translateCount(text: string): string | null {
  const match = text.match(/^([\d,.]+)\s+(sessions?|calls?|turns?|tokens?|findings?|corrections?|edits?|devices?)$/i)
  if (!match) return null
  const noun = COUNT_NOUNS[match[2].toLowerCase()]
  return noun ? `${match[1]} ${noun}` : null
}

function translateEnglishDate(text: string): string | null {
  // Aug 31 / August 31 / Aug 31, 2026
  let match = text.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,\s*(\d{4}))?$/)
  if (match) {
    const month = MONTHS[match[1]]
    return match[3] ? `${match[3]}年${month}月${Number(match[2])}日` : `${month}月${Number(match[2])}日`
  }

  // Aug 1 – 31 / Aug 1 – Sep 2 / Aug 1, 2025 – Jan 2, 2026
  match = text.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,\s*(\d{4}))?\s+[–-]\s+(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(\d{1,2})(?:,\s*(\d{4}))?$/)
  if (!match) return null
  const leftMonth = MONTHS[match[1]]
  const rightMonth = match[4] ? MONTHS[match[4]] : leftMonth
  const left = match[3] ? `${match[3]}年${leftMonth}月${Number(match[2])}日` : `${leftMonth}月${Number(match[2])}日`
  const right = match[6] ? `${match[6]}年${rightMonth}月${Number(match[5])}日` : `${rightMonth}月${Number(match[5])}日`
  return `${left}〜${right}`
}

function dynamicTranslation(text: string): string | null {
  const count = translateCount(text)
  if (count) return count

  const date = translateEnglishDate(text)
  if (date) return date

  let match = text.match(/^refreshed (\d+)s ago$/)
  if (match) return `${match[1]}秒前に更新`
  match = text.match(/^refreshed (\d+)m ago$/)
  if (match) return `${match[1]}分前に更新`
  match = text.match(/^refreshed (\d+)h ago$/)
  if (match) return `${match[1]}時間前に更新`
  match = text.match(/^refreshed (\d+)d ago$/)
  if (match) return `${match[1]}日前に更新`
  if (text === 'refreshed just now') return 'たった今更新'

  match = text.match(/^Update available:\s*(.+)$/)
  if (match) return `アップデートがあります: ${match[1]}`
  match = text.match(/^Showing ([\d,]+) of ([\d,]+)$/)
  if (match) return `${match[2]}件中${match[1]}件を表示`
  match = text.match(/^Show ([\d,]+) more · ([\d,]+) remaining$/)
  if (match) return `さらに${match[1]}件を表示 · 残り${match[2]}件`
  match = text.match(/^([\d,]+) of ([\d,]+) devices$/)
  if (match) return `${match[2]}台中${match[1]}台のデバイス`
  match = text.match(/^Efficiency grade (.+)$/)
  if (match) return `効率評価 ${match[1]}`
  match = text.match(/^(.+) session details$/)
  if (match) return `${match[1]}のセッション詳細`
  match = text.match(/^(.+) sessions$/)
  if (match && !/^\d/.test(match[1])) return `${match[1]}のセッション`
  match = text.match(/^(.+) details$/)
  if (match) return `${match[1]}の詳細`
  match = text.match(/^top ([\d,]+)$/i)
  if (match) return `上位${match[1]}件`
  match = text.match(/^([\d.]+)% priced$/)
  if (match) return `${match[1]}% 価格取得済み`
  match = text.match(/^([\d.]+)% used(?: · resets (.+))?$/)
  if (match) return `${match[1]}%使用${match[2] ? ` · ${match[2]}にリセット` : ''}`
  match = text.match(/^in (\d+)d(?: (\d+)h)?$/)
  if (match) return `${match[1]}日${match[2] ? `${match[2]}時間` : ''}後`
  match = text.match(/^in (\d+)h(?: (\d+)m)?$/)
  if (match) return `${match[1]}時間${match[2] ? `${match[2]}分` : ''}後`
  match = text.match(/^in (\d+)m$/)
  if (match) return `${match[1]}分後`
  match = text.match(/^Combined · (.+)$/)
  if (match) return `統合 · ${match[1]}`
  match = text.match(/^exact (.+)$/)
  if (match) return `確定値 ${match[1]}`
  match = text.match(/^(\d+)-day streak$/)
  if (match) return `${match[1]}日連続`
  match = text.match(/^(\d+)% of spend$/)
  if (match) return `支出の${match[1]}%`
  match = text.match(/^Waste (.+)$/)
  if (match) return `無駄 ${match[1]}`
  match = text.match(/^Reverts (.+)$/)
  if (match) return `差し戻し ${match[1]}`
  match = text.match(/^Abandoned (.+)$/)
  if (match) return `放棄 ${match[1]}`
  match = text.match(/^Fixes ([\d,]+)$/)
  if (match) return `修正案 ${match[1]}件`

  return null
}

/** Translate one complete text or attribute value while preserving whitespace. */
export function translateJa(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return value

  const translated = JA_TRANSLATIONS[trimmed] ?? dynamicTranslation(trimmed)
  if (!translated || translated === trimmed) return value

  const leading = value.match(/^\s*/)?.[0] ?? ''
  const trailing = value.match(/\s*$/)?.[0] ?? ''
  return `${leading}${translated}${trailing}`
}

function shouldSkip(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
  if (!element) return false
  if (SKIP_TAGS.has(element.tagName)) return true
  return element.closest('[data-no-i18n="true"]') !== null
}

function translateTextNode(node: Text): void {
  if (shouldSkip(node)) return
  const next = translateJa(node.data)
  if (next !== node.data) node.data = next
}

function translateAttributes(element: Element): void {
  if (shouldSkip(element)) return
  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute)
    if (!current) continue
    const next = translateJa(current)
    if (next !== current) element.setAttribute(attribute, next)
  }
}

/** Translate an existing subtree. Exported for deterministic renderer tests. */
export function localizeJapaneseSubtree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text)
    return
  }

  if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root as Element)
  if (shouldSkip(root)) return

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    translateTextNode(node as Text)
    node = walker.nextNode()
  }

  if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_NODE) {
    const container = root as ParentNode
    container.querySelectorAll?.('*').forEach(translateAttributes)
  }
}

/**
 * Install Japanese localization before React mounts and keep translating nodes
 * added by later React renders. The cleanup return value is mainly for tests.
 */
export function installJapaneseLocalization(): () => void {
  document.documentElement.lang = 'ja'
  document.documentElement.dataset.locale = 'ja'

  let observer: MutationObserver | null = null
  let disposed = false

  const start = () => {
    if (disposed || observer) return
    localizeJapaneseSubtree(document.documentElement)
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') {
          translateTextNode(record.target as Text)
        } else if (record.type === 'attributes') {
          translateAttributes(record.target as Element)
        } else {
          for (const node of Array.from(record.addedNodes)) localizeJapaneseSubtree(node)
        }
      }
    })
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    queueMicrotask(start)
  }

  return () => {
    disposed = true
    document.removeEventListener('DOMContentLoaded', start)
    observer?.disconnect()
  }
}
