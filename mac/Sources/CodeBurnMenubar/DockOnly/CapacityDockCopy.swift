import Foundation

/// Translate presentation only. Raw quota labels stay English for horizon selection.
enum CapacityDockCopy {
    static let japanese: Bool = {
        #if CAPACITY_DOCK_ONLY
        true
        #else
        false
        #endif
    }()

    static func text(_ value: String) -> String {
        japanese ? japaneseText(value) : value
    }

    static func japaneseText(_ value: String) -> String {
        let labels = [
            "Dock to Edge": "画面の端に配置", "Left": "左", "Right": "右", "Top": "上", "Bottom": "下",
            "Hide Capacity Dock": "Capacity Dockを隠す", "Refreshing…": "更新中…",
            "Last known usage · refreshing": "前回の使用量 · 更新中", "Last known usage · retrying": "前回の使用量 · 再試行中",
            "Not connected": "未接続", "Reconnect required": "再接続が必要です",
            "Connect": "接続", "Reconnect": "再接続", "Add API Key": "APIキーを追加",
            "5-hour": "5時間", "Five-hour": "5時間", "Weekly": "週間", "Daily": "日次", "Monthly": "月間",
            "Monthly credits": "月間クレジット", "Subscription": "サブスクリプション",
            "Unknown": "不明", "Click to keep Capacity Dock expanded": "クリックするとDockを展開したままにできます",
        ]
        if let label = labels[value] { return label }
        if value.hasPrefix("Weekly · ") { return "週間 · " + value.dropFirst("Weekly · ".count) }
        return value
    }

    static func usage(_ provider: String) -> String {
        japanese ? "\(provider) 使用状況" : "\(provider) Usage"
    }

    static func usedPercent(_ label: String) -> String {
        japanese ? "使用率 \(label)" : label
    }

    static func guidance(_ provider: CapacityDockProvider) -> String {
        guard japanese else { return ProviderConnectionGuidance.dockInstruction(for: provider) }
        return "\(provider.displayName)にログイン済みの状態で「接続」を押してください。"
    }

    static func reset(_ window: QuotaSummary.Window, now: Date = Date()) -> String {
        guard japanese else { return "Resets in \(window.resetsInLabel)" }
        return japaneseReset(at: window.resetsAt, now: now)
    }

    static func japaneseReset(at date: Date?, now: Date) -> String {
        guard let date else { return "" }
        let minutes = max(0, Int(date.timeIntervalSince(now) / 60))
        if minutes == 0 { return "まもなくリセット" }
        let days = minutes / 1440
        let hours = minutes / 60 % 24
        let rest = minutes % 60
        if days > 0 { return "\(days)日\(hours > 0 ? "\(hours)時間" : "")後にリセット" }
        if hours > 0 { return "\(hours)時間\(rest > 0 ? "\(rest)分" : "")後にリセット" }
        return "\(rest)分後にリセット"
    }
}
