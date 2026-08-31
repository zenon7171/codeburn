import type { MenuItemConstructorOptions } from 'electron'

const LABELS: Readonly<Record<string, string>> = {
  File: 'ファイル', Edit: '編集', View: '表示', Window: 'ウインドウ',
  about: 'CodeBurnについて', services: 'サービス', hide: 'CodeBurnを隠す',
  hideOthers: 'ほかを隠す', unhide: 'すべて表示', quit: 'CodeBurnを終了',
  undo: '取り消す', redo: 'やり直す', cut: 'カット', copy: 'コピー', paste: 'ペースト',
  pasteAndMatchStyle: 'ペーストしてスタイルを合わせる', delete: '削除', selectAll: 'すべてを選択',
  resetZoom: '実際のサイズ', zoomIn: '拡大', zoomOut: '縮小',
  togglefullscreen: 'フルスクリーン切り替え', toggleDevTools: '開発者ツールを切り替え',
  minimize: 'しまう', close: '閉じる', front: 'すべてを手前に移動', window: 'ウインドウ',
}

/** Keep Electron's roles/shortcuts intact; translate only their display labels. */
export function localizeMenuJa(items: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] {
  return items.map(item => ({
    ...item,
    ...(LABELS[item.label ?? item.role ?? ''] ? { label: LABELS[item.label ?? item.role ?? ''] } : {}),
    ...(Array.isArray(item.submenu) ? { submenu: localizeMenuJa(item.submenu) } : {}),
  }))
}
