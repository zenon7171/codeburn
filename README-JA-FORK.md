# CodeBurn 非公式日本語フォーク

対象 upstream: [`getagentseal/codeburn`](https://github.com/getagentseal/codeburn) の `main` ブランチ。

このフォークは、CodeBurn の **Desktop / Web レンダラー**を日本語化し、公式更新を自動追跡します。CLI/TUI が生成する文章と、上流から新規追加された未翻訳文言は英語へ安全にフォールバックします。

## 日本語化の仕組み

- `app/renderer/i18n/ja.ts` — 日本語辞書
- `app/renderer/i18n/runtime.ts` — React が描画するテキスト、`aria-label`、`title`、`placeholder` を日本語化
- `app/renderer/i18n/runtime.test.ts` — 静的表示、動的描画、アクセシビリティ属性のテスト
- `scripts/i18n-audit.mjs` — upstream の差分に増えた未翻訳UI候補を検出
- `.github/workflows/sync-upstream-ja.yml` — 毎日03:17 JSTに upstream を検証付きで同期
- `app/renderer/main.tsx` — 日本語ランタイムを起動する単一の統合ポイント

## 自動追跡

定期ワークフローは upstream の更新を専用ブランチへマージし、次を実行します。

1. 新規UI文言の日本語監査
2. ルートのテストとCLIビルド
3. Desktopのテスト、型チェック、ビルド
4. 同期PRの作成または更新

新しい未翻訳候補がなく検証が成功した更新は、自動的に `main` へマージされます。未翻訳候補がある場合は英語フォールバックを維持したままDraft PRとIssueを作成します。競合またはテスト失敗時は `main` を更新しません。

> GitHubのForkでは、最初にリポジトリの **Actions** を有効化する必要がある場合があります。

## ローカル監査

全Rendererを監査:

```bash
node scripts/i18n-audit.mjs
```

特定のupstream差分だけを監査:

```bash
node scripts/i18n-audit.mjs --base <old-upstream-sha> --head <new-upstream-sha>
```

## 設計方針

通常のi18nリファクタリングは多数のTSXファイルを変更するため、upstreamとの競合が継続的に発生します。このフォークでは日本語固有差分をほぼ `app/renderer/i18n/` に閉じ込め、未翻訳時は英語表示を維持することで、追従性と可用性を優先しています。
