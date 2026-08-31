# CodeBurn 非公式日本語フォーク

[使い方・機能・コマンドの日本語README](README.ja.md) · [英語README](README.md)

対象 upstream: [`getagentseal/codeburn`](https://github.com/getagentseal/codeburn) の `main` ブランチ。

このフォークには **[Capacity Dock専用の日本語版](README-CAPACITY-DOCK.ja.md)** があります。画面端のClaude／Codex使用率表示だけが必要な場合はこちらを使ってください。ElectronやCodeBurn CLIは起動しません。

以下は既存の **Electron Desktopの画面とアプリメニュー**の日本語化についての説明です。こちらは完全翻訳ではありません。

## ローカルで使う

macOS用の生成物は `app/release/` にあります。

- Apple Silicon: `CodeBurn-0.9.23-arm64.dmg`
- Intel: `CodeBurn-0.9.23.dmg`
- 展開済みのApple Siliconアプリ: `app/release/mac-arm64/CodeBurn.app`

CLIはアプリに同梱されるため、利用時にNode.jsやグローバルのcodeburnインストールは不要です。アプリ名とアプリIDは公式版と同じです。公式版を利用中の場合、置き換えや同時起動に注意してください。ローカルで生成したアプリはアドホック署名で、Appleの公証は受けていません。OSの警告や権限要求は利用者が内容を確認してください。

今回の作業ではApplicationsへのインストールと実ログを使ったGUI起動は行っていません。インストーラーはローカルで生成済みですが、GitHub Releaseには公開していません。

## 開発・再ビルド

検証済み環境: macOS arm64 / Node.js 22.22.2。Node.js 25では既存テストのlocalStorage互換性問題があるため、Node.js 22を使用してください。

```sh
npm ci --no-audit --no-fund
npm ci --prefix app --no-audit --no-fund
npm test
npm --prefix app test -- --maxWorkers=2
npm --prefix app run typecheck
node --test scripts/i18n-scan.test.mjs
npm --prefix app run package:arm64
```

`package:arm64`という既存のスクリプト名ですが、現行のビルド設定には両アーキテクチャのターゲットがあるため、この環境ではarm64とx64の両方が生成されます。全体テストにはローカルサーバー・子プロセスを使うものがあり、制限されたサンドボックスでは失敗する場合があります。並列負荷でCLIテストが時間切れになる場合は、上記のように並列数を抑えてください。

## 日本語化の仕組み

- `app/renderer/i18n/ja.ts`: 日本語辞書
- `app/renderer/i18n/runtime.ts`: テキスト、aria-label、title、placeholderの翻訳
- `app/renderer/i18n/runtime*.test.*`: 翻訳・React更新・翻訳除外の回帰テスト
- `app/electron/menu-ja.ts`: メニューの役割とショートカットを維持して日本語化
- `scripts/i18n-scan.mjs`: TypeScript構文解析でUI候補を抽出
- `scripts/i18n-audit.mjs`: 全体・upstream差分の監査

React描画後にDOMのテキストを置換する方式を維持しています。クォータは文全体を一つの文字列として描画し、残り時間まで翻訳します。コードの子要素、編集欄、`translate="no"`、`data-no-i18n="true"`配下は翻訳しません。

プロジェクト名・モデル名などを意味で自動識別して保護する仕組みではありません。翻訳辞書に一致するユーザーデータを表示する箇所には明示的な翻訳除外が必要です。複数要素に分かれた文章やCLI由来の長文などは英語が残る場合があります。

## 自動追跡と監査

`.github/workflows/sync-upstream-ja.yml` は毎日03:17 JSTにupstreamを専用ブランチへマージし、翻訳監査・テスト・ビルドを行います。新しい未翻訳候補がなければ同期PRを自動マージし、候補があればDraft PRとIssueを作成する設計です。翻訳レポートはActionsのartifactに保存します。GitHub側でActionsが有効になっていることが必要です。日本語READMEの内容更新は、このUI文言監査の対象外です。

```sh
# npm ci後に実行。候補があれば終了コード2（監査結果）
node scripts/i18n-audit.mjs
node scripts/i18n-audit.mjs --base <old-upstream-sha> --head <new-upstream-sha>
```

監査は変更ファイル全体を解析し、旧版にない文言を抽出するため、複数行JSX、単語だけのラベル、テンプレート文字列も確認できます。ただし完全な翻訳率の測定ではありません。テンプレートの`${…}`や動的翻訳がある文字列も候補に出る場合があり、UIかどうかの最終判断にはレビューが必要です。外部から届く文字列や複雑な間接参照は静的解析だけでは把握できません。

## 未対応・注意点

- `codeburn web`が使う別実装の`dash/`は日本語化対象外です。Desktop rendererをブラウザーで開くには検証用データなどが必要で、ViteだけではElectronの接続がありません。
- CLI/TUI、通常のSwiftメニューバー版、Windowsネイティブ版は未翻訳です。別ビルドのCapacity Dock専用版は日本語に対応しています。
- 全文言の正式なi18n化、新規文言のAI自動翻訳、日本語版の自動リリースは未実装です。
- アプリ内の更新確認先は依然として公式upstreamです。更新先から公式バイナリを導入すると日本語化が失われます。日本語版はこのフォークから再ビルドしてください。
- サンプル画面の表示確認と同梱CLIの起動検査は実施しましたが、実際のアカウントや全プロバイダーでの接続確認は行っていません。
