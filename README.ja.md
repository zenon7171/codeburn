# CodeBurn — 日本語ガイド

[English / upstream README](README.md) · [日本語フォークのビルド・対応状況](README-JA-FORK.md)

> **画像にある画面端のCapacity Dockだけが必要な方は、[Capacity Dock専用・日本語版](README-CAPACITY-DOCK.ja.md)を使ってください。** Claude／Codexの使用率を表示するSwift製アプリで、Electron DesktopやCodeBurn CLIは不要です。以下はCodeBurn全体の機能を説明するガイドです。

**AIコーディングに使った費用とトークンを、タスク・モデル・ツール・プロジェクトごとに把握するための、無料のオープンソースツールです。** Claude Code、Codex、Cursorなどのツールが端末に保存したセッションを読み取り、支出の内訳、再試行のコスト、キャッシュ利用、成果との関係を表示します。

この文書は、このフォークに取り込まれたv0.9.23の英語READMEをもとに整理した日本語ガイドです。コマンド名、オプション名、ファイルパスはそのまま使用できます。リンク先の個別ドキュメントは英語の場合があります。

> **日本語の説明書と、アプリの日本語対応範囲は異なります。** このフォークではCapacity Dock専用版、およびElectron Desktopの画面とアプリメニューを日本語化しています。CLI/TUI、`codeburn web`、通常のSwiftメニューバー版のその他の画面などは未翻訳です。以下に掲載するnpm・Homebrew・公式リリースからの導入は、公式版の導入手順であり、日本語版をインストールする手順ではありません。

<p align="center">
  <img src="assets/providers.png" alt="CodeBurnの対応プロバイダー" width="420" />
</p>

## 目次

- [日本語デスクトップ版を使う](#japanese-desktop)
- [クイックスタート](#quick-start)
- [月間の利用状況を確認する](#overview)
- [無駄を見つけて改善する](#optimize)
- [修正を適用・取り消す](#apply-fixes)
- [予算を守る](#guard)
- [モデルを比較する](#compare)
- [支出が成果につながったか確認する](#yield)
- [ブラウザーダッシュボードとデバイス連携](#web)
- [メニューバー・トレイアプリ](#menubar)
- [MCPでエージェントから利用する](#mcp)
- [対応ツール](#providers)
- [コマンドとキーボード操作](#commands)
- [料金・分類・プラン・通貨などの機能](#features)
- [ダッシュボードの読み方](#signals)
- [データの読み取り元](#data)
- [環境変数](#environment)
- [開発支援・ライセンス・謝辞](#credits)

<a id="japanese-desktop"></a>
## 日本語デスクトップ版を使う

ローカルで作成したmacOS用の成果物は次の場所にあります。Git管理外の生成物なので、リポジトリを新しく取得した場合は再ビルドしてください。

| 環境 | ローカルの成果物 |
| --- | --- |
| Apple Silicon | `app/release/CodeBurn-0.9.23-arm64.dmg` |
| Intel Mac | `app/release/CodeBurn-0.9.23.dmg` |
| 展開済みのApple Siliconアプリ | `app/release/mac-arm64/CodeBurn.app` |

CLIはアプリに同梱されています。利用時にNode.jsやグローバルの`codeburn`を別途インストールする必要はありません。アプリはアドホック署名で、Appleの公証は受けていません。また公式版とアプリ名・アプリIDが同じなので、既存アプリの置き換えや同時起動には注意してください。

ソースから作成する場合はNode.js 22を使用します。

```bash
npm ci --no-audit --no-fund
npm ci --prefix app --no-audit --no-fund
npm --prefix app run package:arm64
```

既存のビルド設定により、このスクリプトでもarm64とx64の両方が生成される場合があります。検証済み環境、未翻訳の範囲、自動追従の仕組みは[日本語フォークの説明](README-JA-FORK.md)を参照してください。

> アプリ内の更新確認先は公式版のままです。公式バイナリに更新すると日本語化が失われるため、日本語版はこのフォークから再ビルドしてください。

<a id="quick-start"></a>
## クイックスタート

公式CLIは、インストールせずに実行できます。

```bash
npx codeburn
```

対話型ダッシュボードが開きます。通常は当日の利用を表示し、当日に利用がない場合は過去7日間を表示します。左右の矢印キーで期間を切り替え、`q`で終了します。

常設の`codeburn`コマンドとして使う場合:

```bash
npm install -g codeburn
```

`bunx codeburn`、`pnpm dlx codeburn`でも実行できます。macOSでは`brew install codeburn`も利用できます。

CLIには**Node.js 22.13以上**と、少なくとも1つの対応ツールのセッションデータが必要です。ZedやDeepSeek HarnessのzstdデータにはNode.js 22.15以上が必要です。CursorやOpenCode向けに`better-sqlite3`が自動インストールされる場合があります。

基本の集計はローカルのログを読み取ります。ただし、料金・為替・更新情報の取得、利用者が有効化した同期・テレメトリー、クラウド連携などは外部通信を伴います。すべての機能が完全オフラインという意味ではありません。

<a id="overview"></a>
## 月間の利用状況を確認する

```bash
codeburn overview                                    # 今月の概要を表形式で表示
codeburn overview --no-color                         # 色なしのテキスト
codeburn overview --from 2026-06-01 --to 2026-06-15    # 任意の期間
codeburn overview -p all                             # 過去6か月
codeburn overview -p lifetime                        # 全履歴
codeburn overview --provider claude                  # Claudeのみ
```

費用、トークン、キャッシュヒット率、ツール別・モデル別内訳、主要プロジェクト、日別集計、アクティビティを、コピーしやすいテキストで表示します。端末以外に出力すると色は自動で無効になります。`--no-color`でも明示できます。

API単価で計算した費用と、実際のサブスクリプション請求額は必ずしも一致しません。プランやプロキシ経由の利用は、後述の設定も確認してください。

<a id="optimize"></a>
## 無駄を見つけて改善する

```bash
codeburn optimize                       # 過去30日間を分析
codeburn optimize -p today              # 今日だけ
codeburn optimize -p week               # 過去7日間
codeburn optimize --provider claude     # Claudeに限定
codeburn optimize --format json         # 設定の健全性と検出結果をJSONで出力
```

セッションと`~/.claude/`の設定を調べ、次のような傾向を検出します。

- 同じ内容のファイルを複数セッションで繰り返し読み込む
- 読み取りに比べて編集が多く、確認不足による再試行が発生する
- `BASH_MAX_OUTPUT_LENGTH`が未制限で、不要なコマンド出力が増える
- 使用していないMCPサーバーのツール定義を毎回読み込む
- 定義済みなのに呼ばれないエージェント、スキル、スラッシュコマンド
- 大きすぎる`CLAUDE.md`（`@-import`で展開される内容も含む）
- キャッシュ作成の負担、不要なディレクトリの読み取り
- 出力に比べて入力・キャッシュトークンが極端に多いセッション
- 編集がなく再試行が続き、`git`や`gh`による成果の記録も見られない高額セッション

Claude Codeのセッション数、セッション単位の検出、改善提案、既定モデルの提案は、利用者が開始したメインセッションを対象にします。委任されたサブエージェントは文脈が異なるため、この母集団や再読み取りの検出から除外します。一方、ツールの使い方、支出、MCP、設定の読み込み負担にはサブエージェントも含まれます。

| 分類 | 意味 |
| --- | --- |
| Fix now | CodeBurnから適用できる設定の修正 |
| Habits | 次のセッションで利用者が操作や指示を変える改善 |
| FYI | 費用に理由がある可能性も含めた参考情報 |

削減額がプロバイダーの使用量に基づく実測値（`measured`）なのか、モデルによる推定値（`estimated`）なのかも表示します。検出結果には修正案が付き、影響度と観測された無駄に応じて優先順位を付けます。設定の健全性はA〜Fで表示し、繰り返し実行すると直近48時間との比較で新規・改善中・解決済みを分類します。

ダッシュボードの状態欄に検出数が出ているときは`o`で開き、`b`で戻れます。詳細と書き込み対象は[最適化の説明](docs/optimize.md)を参照してください。

<a id="apply-fixes"></a>
## 修正を適用・取り消す

```bash
codeburn optimize --apply             # 内容を確認しながら修正を適用
codeburn optimize --apply --dry-run   # 変更せず、適用予定だけ表示
codeburn optimize --apply --yes       # 確認なしで適用可能な修正をすべて適用
codeburn act list                     # CodeBurnが行った変更の履歴
codeburn act undo --last              # 直前の変更を取り消す
codeburn act report                   # 推定と実際の削減効果を比較
codeburn optimize --auto-revert       # 削減効果がなかった修正を取り消す
```

**`--apply`は設定ファイルなどを書き換えます。** 設定値、環境変数、未使用エージェントやスキルのアーカイブなどが対象です。適用前にバックアップと履歴を保存します。最初は`--dry-run`で内容を確認できます。

`codeburn act undo <id>`で元のファイルへ戻せます。適用後にファイルが変更されている場合は、`--force`を付けない限り復元を拒否します。

適用から3日以上経つと、`act report`で推定削減額と実際のセッションを比較します。その後の`optimize`では「効果あり」「推定を下回る」「効果なし」といった評価を表示します。`--auto-revert`は効果がなかった修正を戻しますが、`CLAUDE.md`のルールは自動で戻しません。

<a id="guard"></a>
## 予算を守る

```bash
codeburn guard install            # このプロジェクトの.claude/settings.jsonにフックを追加
codeburn guard install --global   # ~/.claude/settings.jsonへ追加
codeburn guard status             # 上限・導入先・注意対象プロジェクトを表示
codeburn guard uninstall          # CodeBurnのフックを削除
```

Guardは任意で導入するClaude Code用フックです。セッションの費用を監視します。

| 機能 | 既定値と動作 |
| --- | --- |
| ソフト上限 | 5ドルを超えたときに一度警告 |
| ハード上限 | 15ドルでセッションを停止。`codeburn guard allow`でそのセッションだけ解除 |
| チェックポイント | 編集・コミットなしで3ドルを超えて終了すると、成果物を明確にしてやり直す提案 |
| 開始時の注意 | 最適化で無駄が見つかったプロジェクトを一行で通知 |

上限は`~/.config/codeburn/guard.json`で変更できます。値を`null`にすると無効です。`--statusline`を付けるとClaude Codeのステータス行にも費用を表示します。導入も変更履歴に記録されるため、`codeburn act undo`で戻せます。Guard自体が故障した場合はセッションを妨げない設計です。

<a id="compare"></a>
## モデルを比較する

```bash
codeburn compare                        # モデルを選んで比較。既定は過去6か月
codeburn compare -p week                # 過去7日間
codeburn compare -p today               # 今日
codeburn compare --provider claude      # Claude Codeに限定
```

ダッシュボードの`c`からも開けます。左右キーで期間を変更し、`b`で戻ります。

| 観点 | 指標 | 意味 |
| --- | --- | --- |
| 性能 | 一発完了率 | 再試行なしで完了した編集の割合 |
| 性能 | 再試行率 | 編集ターンあたりの平均再試行数 |
| 性能 | 自己修正 | モデルが自分の誤りを修正したターン |
| 効率 | 呼び出し単価 | API呼び出しあたりの平均費用 |
| 効率 | 編集単価 | 編集ターンあたりの平均費用 |
| 効率 | 出力トークン | 呼び出しあたりの平均出力 |
| 効率 | キャッシュヒット率 | 入力のうちキャッシュを利用した割合 |

カテゴリ別の一発完了率、委任率、計画率、ターンあたりのツール数、高速モードの使用状況も比較します。

<a id="yield"></a>
## 支出が成果につながったか確認する

```bash
codeburn yield                  # 過去7日間
codeburn yield -p today         # 今日
codeburn yield -p 30days        # 過去30日間
codeburn yield -p month         # 今月
codeburn yield --format json    # 分類別の支出をJSONで出力
```

Gitリポジトリのディレクトリで実行します。AIセッションとGitコミットを時刻で関連付けます。

| 分類 | 意味 |
| --- | --- |
| Productive | セッションに関連するコミットがmainに入った |
| Reverted | コミットが後から取り消された |
| Abandoned | 近い時刻のコミットがない、またはマージされなかった |
| Ambiguous | 並行セッションと時間帯が重なり、より短い時間枠のセッションにコミットが割り当てられた |

これは時刻に基づく推定であり、因果関係を証明するものではありません。各コミットは、それを含む最も短い時間枠のセッション1つにだけ割り当てます。JSONには`methodology: "timestamp-window"`が含まれます。

<a id="web"></a>
## ブラウザーダッシュボードとデバイス連携

```bash
codeburn web                    # http://localhost:4747をブラウザーで開く
codeburn web -p 30days          # 初期表示の期間を指定
codeburn web --port 8080        # ポートを指定。使用中なら空きポートへ切り替え
codeburn web --no-open          # ブラウザーを開かずにサーバーを起動
```

ローカルのWeb画面に、タスク・モデル・ツール・プロジェクト別の集計をグラフで表示します。期間に応じて15分・1時間・1日の単位に切り替わり、セッション別・モデル別の表示も選べます。サーバーはlocalhostで待ち受けます。**このWeb画面は日本語化対象外です。**

### 複数デバイスをまとめる

同じネットワーク上のノートPCやデスクトップの使用量を合算できます。共有元の端末で実行します。

```bash
codeburn share --pair           # ペアリング用の受付を開始し、PINを表示
```

集計先の端末でペアリングします。

```bash
codeburn devices add            # 近くの端末を検出して追加
codeburn devices                # 端末別の合計
codeburn devices rm <name>      # 登録を削除
```

ホストを指定する形式は`codeburn devices add <host> --pin <pin>`です。PINで承認し、ローカルネットワーク内で利用します。ブラウザーダッシュボードからも検出・ペアリングできます。

<a id="menubar"></a>
## メニューバー・トレイアプリ

以下はElectron Desktopとは別の公式アプリで、日本語化対象外です。

### macOS

```bash
codeburn menubar
```

最新版の`.app`をダウンロードし、`~/Applications`へインストールして起動します。`--force`で再インストールします。Swift/SwiftUIのソースとビルド手順は[mac/README.md](mac/README.md)にあります。

メニューバーには設定した期間の支出を表示します。既定は今日で、週・月・6か月も選べます。クリックすると、エージェント別タブ、期間切り替え、傾向・予測・統計・プラン、最適化の検出結果、CSV/JSONエクスポートを開けます。Capacity Dockは画面の端にプロバイダーの利用状況を表示します。

| 設定 | 設定値・動作 |
| --- | --- |
| 表示期間 | `today`、`week`、`month`、`sixMonths` |
| コンパクト表示 | 小数点以下を省略し、表示幅を縮める |
| 更新間隔 | Auto、1分、5分、15分、Manual |
| Auto | AC電源時は30秒間隔。バッテリー・低電力モード・画面スリープ時は頻度を下げる |
| Manual | ポップオーバーを開くか、更新ボタンを押したときだけ更新 |
| 使用するターミナル | `terminal`または`iterm2` |

ターミナルからの設定例:

```bash
defaults write org.agentseal.codeburn-menubar CodeBurnMenubarPeriod -string month
defaults write org.agentseal.codeburn-menubar CodeBurnMenubarCompact -bool true
defaults write org.agentseal.codeburn-menubar CodeBurnMenubarRefreshSeconds -int 300
defaults write org.agentseal.codeburn-menubar CodeBurnPreferredTerminal -string iterm2
```

期間・コンパクト表示の変更後はアプリを再起動します。更新間隔は`60`・`300`・`900`秒、`0`がManual、`-1`がAutoで、次回の更新時に反映されます。ターミナル指定は次のコマンド起動から反映されます。選択先がない場合はTerminal.appへ、さらに失敗した場合はバックグラウンド実行へ切り替え、Console.appに記録します。

コンパクト表示を元に戻す場合:

```bash
defaults delete org.agentseal.codeburn-menubar CodeBurnMenubarCompact
```

### Windows

```powershell
codeburn menubar
```

CLIと同じバージョンの`.msi`を取得し、SHA-256を検証してから`msiexec /passive`でインストール・起動します。同じ版が導入済みなら起動だけ行います。再導入は`--force`です。[v0.9.23の公式リリース](https://github.com/getagentseal/codeburn/releases/tag/windows-v0.9.23)から手動取得もできます。

トレイに今日の支出を表示し、クリックで詳細を開きます。テーマ、通貨、ログイン時の起動などを設定できます。表示中は60秒、閉じている間は2分ごとに更新します。

トレイ版には`codeburn 0.9.9`以上のCLIが必要です。この版の`.msi`は未署名なので初回にSmartScreenの警告が出る場合があります。[開発手順](windows/DEVELOPMENT.md)も参照してください。

### Linux（GNOME）

GNOME 45以上では、[GNOME Shell拡張](gnome/README.md)で上部パネルへの費用表示、期間切り替え、コンパクト表示、日次予算通知を利用できます。

```bash
git clone https://github.com/getagentseal/codeburn
cd codeburn/gnome
./install.sh
gnome-extensions enable codeburn@codeburn.dev
```

`windows/`のTauriトレイアプリもLinuxでビルドできますが、この版では実験的で未リリースです。

### Omarchy

[@erzz](https://github.com/erzz)が管理する[コミュニティープラグイン](https://github.com/erzz/omarchy-codeburn)があります。問い合わせはそのリポジトリへお願いします。

```bash
omarchy plugin add https://github.com/erzz/omarchy-codeburn.git --enable
```

<a id="mcp"></a>
## MCPでエージェントから利用する

```bash
claude mcp add codeburn -- npx -y codeburn mcp
```

`codeburn mcp`は標準入出力で動くローカルMCPサーバーです。Claude CodeやCursorなどのMCPクライアントから、使用量や削減候補を質問できます。

| ツール | 返す内容 |
| --- | --- |
| `get_usage` | ツール・モデル・プロジェクト・タスク別の費用と使用量。比較的高速 |
| `get_savings` | 無駄、再試行コスト、モデル選択による削減候補。詳細分析のため時間がかかる |

プロジェクト名は既定で仮名化します。`include_project_names: true`を指定したときだけ実名を返します。ほかのクライアントでは、コマンドを`npx`、引数を`-y codeburn mcp`としてstdioサーバーを登録します。

MCPが読むのはローカルデータですが、返された情報は利用するエージェントの処理対象になります。接続先と公開する情報の範囲を確認してください。

<a id="providers"></a>
## 対応ツール

この版の英語READMEでは、41のツール・エージェントへの対応を案内しています。代表的な連携と個別ドキュメントは以下のとおりです。

| ツール | ツール | ツール |
| --- | --- | --- |
| [Claude Code / Desktop](docs/providers/claude.md) | [Codex](docs/providers/codex.md) | [Cursor](docs/providers/cursor.md) |
| [cursor-agent](docs/providers/cursor-agent.md) | [Gemini CLI](docs/providers/gemini.md) | [Antigravity](docs/providers/antigravity.md) |
| [GitHub Copilot](docs/providers/copilot.md) | [Cline](docs/providers/cline.md) | [Roo Code](docs/providers/roo-code.md) |
| [KiloCode](docs/providers/kilo-code.md) | [Kiro](docs/providers/kiro.md) | [IBM Bob](docs/providers/ibm-bob.md) |
| [OpenCode](docs/providers/opencode.md) | [OpenClaw](docs/providers/openclaw.md) | [Mistral Vibe](docs/providers/mistral-vibe.md) |
| [Pi](docs/providers/pi.md) | [OMP](docs/providers/omp.md) | [Droid](docs/providers/droid.md) |
| [Qwen](docs/providers/qwen.md) | [Kimi Code CLI](docs/providers/kimi.md) | [LingTai TUI](docs/providers/lingtai-tui.md) |
| [Goose](docs/providers/goose.md) | [Crush](docs/providers/crush.md) | [Warp](docs/providers/warp.md) |
| [Mux](docs/providers/mux.md) | [Vercel AI Gateway](docs/providers/vercel-gateway.md) | [Zerostack](docs/providers/zerostack.md) |
| [Grok Build](docs/providers/grok.md) | [ZCode](docs/providers/zcode.md) | [Zed](docs/providers/zed.md) |
| [Hermes Agent](docs/providers/hermes.md) | [Devin](docs/providers/devin.md) | [Forge](docs/providers/forge.md) |
| [CodeWhale](docs/providers/codewhale.md) | | |

セッションが存在するツールを自動検出します。ダッシュボードでは`p`で切り替えられます。各ドキュメントには保存場所、形式、制約が記載されています。Linux・Windowsのパスも自動検出します。

```bash
codeburn report --provider claude
codeburn today --provider codex
codeburn export --provider cursor
```

`--provider`は`report`、`today`、`month`、`overview`、`status`、`export`、`web`、`optimize`、`compare`、`yield`などに使えます。新しいプロバイダーを実装する際は`src/providers/codex.ts`を例として参照できます。

<a id="commands"></a>
## コマンドとキーボード操作

多くのコマンドで`--provider`、`--project`、`--exclude`、期間指定を併用できます。期間指定は主に`-p today|week|30days|month|all|lifetime`です。対話型ダッシュボードと`overview`では`all`は過去6か月、`lifetime`は全履歴です。個別コマンドの対応は`--help`でも確認してください。

### 集計・出力

| コマンド | 内容 |
| --- | --- |
| `codeburn` | 対話型ダッシュボード |
| `codeburn today` | 今日の使用量 |
| `codeburn month` | 今月の使用量 |
| `codeburn overview` | コピーしやすい月間概要 |
| `codeburn report -p 30days` | 過去30日間のレポート |
| `codeburn report --from 2026-04-01 --to 2026-04-10` | 指定期間のレポート |
| `codeburn report --format json` | ダッシュボード全体をJSONで標準出力へ |
| `codeburn report --refresh 60` | 60秒ごとの更新。`--refresh 0`で無効化 |
| `codeburn status` | 今日と今月の合計を短く表示 |
| `codeburn status --format json` | 合計をJSONで表示 |
| `codeburn export` | 今日・7日・30日のCSVを書き出す |
| `codeburn export -f json` | JSONで書き出す |

### 分析・モデル

| コマンド | 内容 |
| --- | --- |
| `codeburn doctor` | 検出パス・セッション数・解析の状態を診断 |
| `codeburn audit` | プロバイダー・モデルごとにトークンの数値の出所を表示 |
| `codeburn context` | Claude Code / Codexのコンテキスト内訳を対話形式で表示 |
| `codeburn context <id> --json` | 指定セッションのコンテキストをJSONで表示 |
| `codeburn optimize` | 無駄と修正案を表示 |
| `codeburn compare` | モデルを比較 |
| `codeburn yield` | Gitと関連付けた成果別の支出 |
| `codeburn models` | 過去30日間のモデル別トークン・費用 |
| `codeburn models --by-task` | モデルごとにタスク種類で分割 |
| `codeburn models --by-agent` | モデルごとにエージェントで分割。`(main)`は非エージェントセッション |
| `codeburn models --top 10` | 費用が大きい10モデル |
| `codeburn models --unpriced` | 使用量があるのに単価を解決できないモデルのID |
| `codeburn models --format markdown` | Markdownの表で出力 |
| `codeburn models --task feature` | 機能開発タスクだけ |
| `codeburn models --provider claude` | プロバイダーを限定 |

`--by-agent`で1セント未満も表示する場合は`--min-cost 0`を指定します。未価格モデルがトークン課金なら`model-alias`、定額製品のIDなら`model-flat-rate`を使い分けます。JSONのモデルIDは表示用の名前に置き換えません。

### チームへの同期（プレビュー）

| コマンド | 内容 |
| --- | --- |
| `codeburn sync setup <url>` | ブラウザーでOIDCログインし、接続先を設定 |
| `codeburn sync push` | 未送信の利用情報を接続先に送信。既定は過去7日間 |
| `codeburn sync push --since 30d` | 過去30日間を対象に送信 |
| `codeburn sync status` | 接続先・認証状態・最終同期を確認 |
| `codeburn sync logout` | トークンを失効させ、認証情報を削除 |
| `codeburn sync reset --confirm` | 送信済み記録を消去。次のpushで再送信される |

**同期は外部への送信を伴います。** トークン数、費用、モデル、プロジェクトを送信し、プロンプトやコードは送信しません。プレビュー機能のためプロトコルが変わる場合があります。[同期ドキュメント](docs/sync/)を確認してください。

### キーボード操作

| キー | 操作 |
| --- | --- |
| 左右の矢印 / `1`〜`6` | 今日・7日・30日・今月・6か月・全履歴を切り替え |
| 上下の矢印 | ダッシュボード全体を1行スクロール |
| Page Up / Page Down | 1画面スクロール |
| Home / End | ダッシュボードの先頭・末尾へ |
| `j` / `k` | Daily Activityの日付を移動 |
| Shift+Space / Space | Daily Activityをページ単位で移動 |
| `g` / `G` | Daily Activityの先頭・末尾へ |
| `p` | プロバイダー切り替え |
| `c` | モデル比較 |
| `o` | 最適化 |
| `b` | 前の画面に戻る |
| `q` | 終了 |

端末幅に応じて1〜3列に並びます。今日・7日・特定日の表示は既定で最大1分に1回更新し、表示位置を維持します。重い集計画面は利用者が移動するまで自動更新しません。平均セッション費用や高額なセッション上位5件も確認できます。

<a id="features"></a>
## 料金・分類・プラン・通貨などの機能

### 料金の計算

入力、出力、キャッシュ読み取り・書き込み、Web検索などの使用量からAPI呼び出しごとの費用を計算します。Claudeの高速モードの倍率も考慮します。[LiteLLM](https://github.com/BerriAI/litellm)から料金を取得し、`~/.cache/codeburn/`に24時間キャッシュします。既知のClaude/GPT-5モデルにはフォールバック料金もあります。

ゲートウェイ経由のモデルIDは、分かる範囲で実際の接続先モデルに対応付けます。例えばOrcaRouterのfusion経路や入れ子のモデル名を解決します。一方、接続先が変動する`orcarouter/auto`は、接続先が判明するまで未価格のままにします。推定値や未価格表示を実際の請求額と同一視しないでください。

### タスク分類

ツールの使用パターンと利用者メッセージのキーワードから13種類に分類します。分類のためのLLM呼び出しは行いません。

| カテゴリ | 主な判定材料 |
| --- | --- |
| Coding（コーディング） | Edit、Write |
| Debugging（デバッグ） | エラー・修正のキーワードとツール使用 |
| Feature Dev（機能開発） | `add`、`create`、`implement` |
| Refactoring（リファクタリング） | `refactor`、`rename`、`simplify` |
| Testing（テスト） | Bash内のpytest、vitest、jest |
| Exploration（調査） | 編集を伴わないRead、Grep、WebSearch |
| Planning（計画） | EnterPlanMode、TaskCreate |
| Delegation（委任） | Agentによる起動 |
| Git Ops（Git操作） | Bash内のgit push / commit / merge |
| Build/Deploy（ビルド・デプロイ） | npm build、docker、pm2 |
| Brainstorming（アイデア検討） | `brainstorm`、`what if`、`design` |
| Conversation（会話） | ツールなしのテキストのやり取り |
| General（その他） | Skillや分類できない操作 |

日別、プロジェクト別、モデル別、アクティビティ別、主要ツール、シェルコマンド、MCPサーバー別の内訳を表示します。

### 一発完了率

同じファイルを、間にシェルコマンドを挟んで再編集した場合を再試行として扱います。例は`Edit foo.ts → Bash → Edit foo.ts`です。別ファイルの編集は再試行にしません。

一発完了率90%は、この判定方法で編集ターンの9割が再試行なしだったことを意味します。Claude、Codex、Gooseはファイル単位で追跡し、ほかのプロバイダーはツール名を使う判定へ切り替えます。

### サブスクリプション・予算プラン

```bash
codeburn plan set claude-max
codeburn plan set claude-pro
codeburn plan set cursor-pro
codeburn plan set copilot-pro
codeburn plan set custom --monthly-usd 200 --provider codex
codeburn plan set custom --credits 20000 --provider copilot
codeburn plan reset --provider codex
codeburn plan set none
codeburn plan
codeburn plan reset
```

プロバイダー別に保存するため、ClaudeとCodex/Cursorなどを並行して追跡できます。古い集約プラン`all`は、プロバイダー別プランを追加したときに置き換え、超過額を二重に表示しないようにします。

この版のUSDプリセットは原文が参照した2026年4月時点の公表価格、Copilotのクレジット枠は2026年8月23日取得の情報に基づきます。最新の契約額を保証するものではありません。Copilotは月額料金をトークン単価に置き換えず、AIクレジットの使用量を基に扱います。

### 通貨

```bash
codeburn currency JPY          # 日本円
codeburn currency GBP          # 英ポンド
codeburn currency AUD          # 豪ドル
codeburn currency CNY          # 中国元
codeburn currency RON          # ルーマニア・レウ
codeburn currency              # 現在の設定
codeburn currency --reset      # 米ドルへ戻す
```

ISO 4217の通貨コードを指定します。この版は162通貨に対応すると案内されています。[Frankfurter](https://www.frankfurter.app/)から為替を取得し、24時間キャッシュします。設定は`~/.config/codeburn/config.json`に保存され、ダッシュボード、メニューバー、CSV/JSON出力などに適用されます。

### モデル名の別名

プロキシなどがモデル名を書き換えると、料金表に一致せず`$0.00`になる場合があります。

```bash
codeburn model-alias "my-proxy-model" "claude-opus-4-6"
codeburn model-alias --list
codeburn model-alias --remove "my-proxy-model"
```

別名は料金検索の前に適用します。接続先にはLiteLLMのモデル名かフォールバック表の正式名を指定します。利用者の設定は組み込みの別名より優先されます。

### ローカルモデル・独自単価・定額プロキシ

```bash
codeburn price-override my-model --input 0.27 --output 1.10   # 100万トークンあたりの米ドル単価
codeburn model-savings "llama3.1:8b" gpt-4o                   # 有料モデルとの差を削減額として比較
codeburn model-flat-rate auto-genius                        # 定額製品として指定
codeburn proxy-path ~/work/copilot-repo                      # 定額契約でカバーされるプロジェクト
```

| 設定 | 意味 |
| --- | --- |
| `price-override` | 入出力・キャッシュなどの独自単価を指定 |
| `model-savings` | 無料ローカルモデルの費用は0のまま、有料モデルを使った場合との差を表示 |
| `model-flat-rate` | 定額製品のIDを指定し、不要な未価格警告や別名の提案を抑える |
| `proxy-path` | API換算額が定額契約でカバーされるプロジェクトを指定 |

いずれも`--list`と`--remove`に対応します。定額製品を通常のAPIモデルの別名にすると、実際には発生していない従量課金を計上するおそれがあります。

### 絞り込み

```bash
codeburn report --project myapp
codeburn report --exclude myapp
codeburn report --exclude myapp --exclude tests
codeburn month --project api --project web
codeburn export --project inventory
codeburn report --from 2026-04-01 --to 2026-04-10
codeburn report --from 2026-04-01
codeburn report --to 2026-04-10
```

プロジェクト名は大文字・小文字を区別しない部分一致です。`--provider`とも組み合わせられます。開始日だけ・終了日だけの指定も可能です。開始と終了が逆、または日付が不正ならエラーを表示します。TUIの指定期間は初期表示に適用され、`1`〜`6`を押すと定義済み期間に戻ります。

### ツールを検出できないとき

```bash
codeburn doctor
codeburn doctor --provider opencode
codeburn doctor --json
```

完全オフライン・読み取り専用で診断し、キャッシュや設定には書き込みません。調べたパス、環境変数の上書き、パスの有無、発見したファイル数、一部サンプルの解析結果、キャッシュ件数を表示します。

`OK`、`NOTHING FOUND`、`ERRORS`と原因の手掛かりを確認できます。特定プロバイダーで例外が起きても、その行のエラーとして扱い、残りの診断を続けます。

### JSONで取り出す

```bash
codeburn report --format json
codeburn today --format json
codeburn month --format json
codeburn report -p 30days --format json
codeburn report --format json | jq '.projects'
codeburn today --format json | jq '.overview.cost'
```

概要、日別内訳、プロジェクト（`avgCostPerSession`を含む）、モデル別トークン、アクティビティ別一発完了率、ツール、MCP、シェルコマンドなどを含みます。

軽量な合計だけなら`status --format json`、最適化なら`optimize --format json`、成果との関連なら`yield --format json`、ファイルへの保存なら`export -f json`を使います。

<a id="signals"></a>
## ダッシュボードの読み方

以下は調査の手掛かりであり、それだけで問題と断定するものではありません。

| 表示される傾向 | 考えられる理由 |
| --- | --- |
| キャッシュヒット率が80%未満 | プロンプトや文脈が安定しない、またはキャッシュが無効 |
| Readが多い | 同じファイルを再読している、必要な文脈が足りない |
| 一発完了率が低い | 編集に苦戦し、再試行が繰り返されている |
| 小さな作業でも高額モデルが費用を占める | 作業に対してモデルが過剰かもしれない |
| `dispatch_agent`や`task`が多い | サブエージェントへの展開が多い。必要な場合もある |
| MCP使用がない | MCPを使っていない、または設定に問題がある |
| Bashが`git status`や`ls`中心 | 実装より状況確認に時間を使っている |
| Conversationが多い | 実作業より会話が多い |

実験的な1セッションだけキャッシュヒット率が60%でも問題とは限りません。数週間ずっと同じ傾向なら、設定や作業の進め方を調べる材料になります。

<a id="data"></a>
## データの読み取り元

保存場所と解析方法の概要です。詳細やOSごとのパスは[プロバイダー別ドキュメント](docs/providers/)も参照してください。

| ツール | 主な保存場所・取得元 | 読み取りの特徴 |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/<sanitized-path>/<session-id>.jsonl` | モデル、入出力・キャッシュ使用量、`tool_use`、時刻 |
| Claudeの複数設定 | `CLAUDE_CONFIG_DIRS` | 複数ディレクトリをまとめ、プロジェクトごとに集計。読めない場所はスキップ |
| Codex | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`、`~/.codex/archived_sessions/rollout-*.jsonl` | `token_count`と`function_call`を読み、作業ディレクトリで費用を分類 |
| Cursor | macOS: `~/Library/Application Support/Cursor/User/globalStorage/`、Linux: `~/.config/Cursor/User/globalStorage/`、Windows: `%APPDATA%/Cursor/User/globalStorage/`内の`state.vscdb` | 入力は会話のコンテキスト計測値、ツールは`agentKv`。出力は推定で、サーバー側キャッシュは取得できないため管理画面より少なくなる場合がある |
| OpenCode | `~/.local/share/opencode/opencode*.db`または`storage/` | SQLiteを読み取り専用で参照。LiteLLMで再計算し、未価格なら元の費用を利用。子セッションの二重計上を避ける |
| Gemini CLI | `~/.gemini/tmp/<project>/chats/session-*.json` | メッセージごとの実トークンを利用。キャッシュ分を入力から差し引いて二重課金を防ぐ |
| Antigravity | `.gemini/`配下のセッションと実行中の言語サーバー | 詳細な実行履歴と料金を取得。CLI向けに`codeburn antigravity-hook install`で記録用フックを導入可能 |
| GitHub Copilot | `~/.copilot/session-state/`、VS Code/VSCodiumの会話・transcripts・`agent-traces.db`、JetBrainsの`~/.config/github-copilot/`配下 | 実トークンのあるOTelストアを優先。ほかの形式は文字数などから推定。JetBrainsはNitrite DBを参照 |
| Kiro | `.chat` JSON | 文字数からトークンを推定。モデルは`kiro-auto`、費用はSonnet単価で推定 |
| Mistral Vibe | `~/.vibe/logs/session/`または`$VIBE_HOME/logs/session/` | `meta.json`の累積使用量と`messages.jsonl`を使用。セッションごとに1レコード、子エージェントは別計上 |
| OpenClaw | `~/.openclaw/agents/*.jsonl`。旧`.clawdbot`・`.moltbot`・`.moldbot`も対象 | assistantメッセージの`usage`とモデルID |
| OpenClaude | `~/.openclaude/projects/<slug>/*.jsonl`または`$CODEBURN_OPENCLAUDE_DIR/projects/` | Claude Code形式。使用量のあるassistant行を単価表で費用推定。サブエージェントも支出に含める |
| Warp | `~/Library/Group Containers/2BBY89MBSN.dev.warp/Library/Application Support/dev.warp.Warp-Stable/warp.sqlite` | 完了したやり取り単位で集計。会話合計に合わせてトークンを推定配分し、コマンドを時刻で関連付ける |
| Zed | macOS: `~/Library/Application Support/Zed/threads/threads.db`、Linux: `~/.local/share/zed/threads/` | zstd圧縮JSON内の使用量を読み、累積値と整合させる。Node.js 22.15以上 |
| Forge | `~/.forge/.forge.db` | `conversations`と`context.messages`から使用量・ツール・コマンドを抽出 |
| Pi / OMP | `~/.pi/agent/sessions/<sanitized-cwd>/*.jsonl`、`~/.omp/agent/sessions/<sanitized-cwd>/*.jsonl` | assistantの使用量と`toolCall`。ツール名を共通名へ正規化 |
| Codebuff（旧Manicode） | `~/.config/manicode/projects/<project>/chats/<chatId>/chat-messages.json` | 通常はクレジットから費用算出。元プロバイダーの使用量が残っていれば実トークンとLiteLLM料金を優先 |
| Cline / Roo Code / KiloCode | VS Code系の`globalStorage`、Clineは`~/.cline/data`も対象 | 各タスクの`ui_messages.json`からAPI要求の使用量を抽出 |
| Cline CLI | `~/.cline/data/sessions/<session-id>/` | 拡張機能とは別形式。セッションJSONとメッセージJSONの`metrics`を使用 |
| CodeWhale | `~/.codewhale/sessions/*.json`、旧`~/.deepseek/sessions/*.json` | 累積値をセッション単位で計上。総トークンしかない場合は入出力を捏造せず入力欄に保持。保存済み費用を優先 |
| DeepSeek Harness（dsh） | `~/.dsh/sessions/--<slug>--/<session-id>/session.jsonl.zstd`または`session.jsonl` | 連結zstdフレームを読み、ターン・ステップ単位で集計。CodeWhaleとは別製品。zstdにはNode.js 22.15以上 |
| IBM Bob | `User/globalStorage/ibm.bob-code/tasks/<task-id>/` | `ui_messages.json`の使用量・費用と`api_conversation_history.json`のモデル |
| Kimi Code CLI | `$KIMI_SHARE_DIR/sessions/<workdir-hash>/<session-id>/`または`~/.kimi/sessions/` | `wire.jsonl`の`StatusUpdate.token_usage`。サブエージェントも含む |
| LingTai TUI | `~/.lingtai/<agent>/logs/token_ledger.jsonl`と`~/.lingtai-tui/registry.jsonl`が示すプロジェクト | 追記型台帳の入力・キャッシュ・出力・推論を使用。親に複製済みのdaemon台帳は重複計上しない |
| Vercel AI Gateway | クラウドのCustom Reporting API | ローカルログではない。`AI_GATEWAY_API_KEY`または`VERCEL_OIDC_TOKEN`と対応プランが必要。認証情報がなければ合算からスキップ |

APIメッセージID、累積使用量、セッションIDなど、各形式に合う方法で重複を取り除き、日付で絞り込み、ターンを分類します。Cursorの結果キャッシュは`~/.cache/codeburn/cursor-results.v<n>.json`に保存され、DBの変更で無効化されます。大きいDBの初回解析は時間がかかる場合があります。

<a id="environment"></a>
## 環境変数

| 変数 | 内容 |
| --- | --- |
| `CLAUDE_CONFIG_DIR` | Claudeのデータディレクトリ。既定`~/.claude` |
| `CLAUDE_CONFIG_DIRS` | 複数のClaudeディレクトリ。POSIXは`:`、Windowsは`;`区切り。設定時は`CLAUDE_CONFIG_DIR`より優先 |
| `CODEX_HOME` | Codexのデータディレクトリ。既定`~/.codex` |
| `CODEBUFF_DATA_DIR` | Codebuffのデータディレクトリ。既定`~/.config/manicode` |
| `CODEWHALE_HOME` | CodeWhaleのホームを指定。`<指定先>/sessions`を読む |
| `FACTORY_DIR` | Droidのデータディレクトリ。既定`~/.factory` |
| `KIMI_SHARE_DIR` | Kimi Code CLIの共有ディレクトリ。既定`~/.kimi` |
| `KIMI_MODEL_NAME` | セッションにモデル名がない場合の補完 |
| `LINGTAI_HOME` | LingTaiのデータディレクトリ。既定`~/.lingtai` |
| `LINGTAI_TUI_HOME` | LingTaiの代替指定。`LINGTAI_HOME`が優先 |
| `LINGTAI_TUI_GLOBAL_DIR` | プロジェクト登録簿の場所。既定`~/.lingtai-tui` |
| `OPENCODE_DATA_DIR` | OpenCode互換データの場所。既定`$XDG_DATA_HOME/opencode`または`~/.local/share/opencode`。指定先に`opencode`を自動追加しない |
| `OPENCODE_DB_PREFIX` | SQLite名の接頭辞。既定`opencode`で`opencode*.db`を探す。フォーク用に変更可能 |
| `QWEN_DATA_DIR` | Qwenのデータディレクトリ。既定`~/.qwen/projects` |
| `VIBE_HOME` | Mistral Vibeのホーム。既定`~/.vibe` |
| `WARP_DB_PATH` | Warp DBのパス。既定はStable、次にPreview |

<a id="credits"></a>
## 開発支援・ライセンス・謝辞

CodeBurnは[AgentSeal](https://agentseal.org)のオープンソースプロジェクトです。役に立った場合は、[公式リポジトリへのスター](https://github.com/getagentseal/codeburn)や[開発者へのスポンサー支援](https://github.com/sponsors/iamtoruk)で、料金更新、プロバイダー追加、互換性修正を支援できます。

- ライセンス: [MIT](LICENSE)
- 料金データ: [LiteLLM](https://github.com/BerriAI/litellm)
- 為替データ: [Frankfurter](https://www.frankfurter.app/)
- macOS Capacity Dockの利用状況追跡は、Peter Steinberger氏のMITライセンスの[CodexBar](https://github.com/steipete/CodexBar)を参考にしています。

CodeBurn Bt.およびcodeburn.huとは関係ありません。このリポジトリは非公式の日本語フォークであり、上記の開発元・クレジットを変更するものではありません。
