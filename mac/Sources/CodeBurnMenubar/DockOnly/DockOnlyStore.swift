import Foundation
import Observation

/// Quota-only model. No AppStore, CodeburnCLI, ServeConnection or session scans.
@MainActor @Observable
final class DockOnlyStore: CapacityDockQuotaSource {
    static let providers: [CapacityDockProvider] = [.claude, .codex]
    typealias Fetch = @MainActor (CapacityDockProvider, Bool) async throws -> QuotaSummary?
    private(set) var summaries: [String: QuotaSummary] = [:]
    private(set) var busy: Set<String> = []
    private(set) var errors: [String: String] = [:]
    private(set) var lastUpdated: [String: Date] = [:]
    private(set) var monitoring: Set<String>
    let demo: Bool
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let fetch: Fetch
    @ObservationIgnored private var generations: [String: Int] = [:]
    @ObservationIgnored var didChange: (() -> Void)?

    init(defaults: UserDefaults = .standard, demo: Bool = false, fetch: Fetch? = nil) {
        self.defaults = defaults
        self.demo = demo
        self.fetch = fetch ?? Self.liveFetch
        monitoring = Set(Self.providers.filter { defaults.bool(forKey: "CapacityDockMonitor.\($0.id)") }.map(\.id))
        if demo {
            monitoring = Set(Self.providers.map(\.id))
            let now = Date()
            summaries["claude"] = QuotaSummary(providerFilter: .claude, connection: .connected,
                primary: .init(label: "Weekly", percent: 0.17, resetsAt: now.addingTimeInterval(482400)),
                details: [
                    .init(label: "5-hour", percent: 0.06, resetsAt: now.addingTimeInterval(1560)),
                    .init(label: "Weekly", percent: 0.17, resetsAt: now.addingTimeInterval(482400)),
                    .init(label: "Weekly · Fable", percent: 0.15, resetsAt: now.addingTimeInterval(482400)),
                ], planLabel: "サンプル · Max 20x", footerLines: [])
            summaries["codex"] = QuotaSummary(providerFilter: .codex, connection: .connected,
                primary: .init(label: "Weekly", percent: 0.04, resetsAt: now.addingTimeInterval(3600)),
                details: [.init(label: "Weekly", percent: 0.04, resetsAt: now.addingTimeInterval(3600))],
                planLabel: "サンプル · Pro", footerLines: [])
        }
    }

    func capacityDockQuotaSummary(for provider: CapacityDockProvider) -> QuotaSummary? {
        summaries[provider.id]
    }

    func capacityDockCredential(for provider: CapacityDockProvider) async -> CapacityDockProviderCredential {
        // Claude/Codex use their existing native login services, never an API-key form.
        CapacityDockProviderCredential()
    }

    func connectCapacityDockProvider(_ provider: CapacityDockProvider) async {
        guard Self.providers.contains(provider), !demo else { return }
        monitoring.insert(provider.id)
        defaults.set(true, forKey: "CapacityDockMonitor.\(provider.id)")
        await refresh(provider, userInitiated: true)
    }

    func pause(_ provider: CapacityDockProvider) {
        guard !demo else { return }
        monitoring.remove(provider.id)
        defaults.set(false, forKey: "CapacityDockMonitor.\(provider.id)")
        generations[provider.id, default: 0] += 1
        summaries[provider.id] = nil
        errors[provider.id] = nil
        didChange?()
        // Do not sign out, delete shared provider credentials, or stop any CLI.
    }

    func refreshAll() async {
        guard !demo else { return }
        for provider in Self.providers where monitoring.contains(provider.id) {
            await refresh(provider, userInitiated: false)
        }
    }

    private func refresh(_ provider: CapacityDockProvider, userInitiated: Bool) async {
        guard !busy.contains(provider.id), monitoring.contains(provider.id) else { return }
        busy.insert(provider.id)
        defer { busy.remove(provider.id); didChange?() }
        let generation = generations[provider.id, default: 0]
        let previous = summaries[provider.id]
        summaries[provider.id] = snapshot(provider, previous, connection: previous?.headlineWindow == nil ? .loading : .stale)
        do {
            let result = try await fetch(provider, userInitiated)
            guard generation == generations[provider.id, default: 0], monitoring.contains(provider.id) else { return }
            summaries[provider.id] = result
            errors[provider.id] = result == nil ? "ログイン後に「接続」を押してください。" : nil
            if result != nil { lastUpdated[provider.id] = Date() }
        } catch {
            guard generation == generations[provider.id, default: 0], monitoring.contains(provider.id) else { return }
            let failure = Self.failure(error)
            errors[provider.id] = failure.message
            summaries[provider.id] = snapshot(provider, previous, connection: failure.terminal
                ? .terminalFailure(reason: failure.message) : .transientFailure)
        }
    }

    private func snapshot(_ provider: CapacityDockProvider, _ old: QuotaSummary?, connection: QuotaSummary.Connection) -> QuotaSummary {
        QuotaSummary(providerFilter: provider == .claude ? .claude : .codex,
            connection: connection, primary: old?.primary, details: old?.details ?? [],
            planLabel: old?.planLabel, footerLines: [])
    }

    static func failure(_ error: Error) -> (message: String, terminal: Bool) {
        if let error = error as? ClaudeSubscriptionService.FetchError {
            switch error {
            case .notBootstrapped, .bootstrapFailed: return ("Claudeにログイン後、再接続してください。", true)
            case .rateLimited: return ("取得回数の制限中です。時間を置いて自動で再試行します。", false)
            default: if error.isTerminal { return ("Claudeへの再接続が必要です。", true) }
            }
        }
        if let error = error as? CodexSubscriptionService.FetchError {
            switch error {
            case .notBootstrapped, .bootstrapFailed: return ("Codexにログイン後、再接続してください。", true)
            case .rateLimited: return ("取得回数の制限中です。時間を置いて自動で再試行します。", false)
            default: if error.isTerminal { return ("Codexへの再接続が必要です。", true) }
            }
        }
        // Do not render raw upstream response bodies or credential errors.
        return ("使用量を取得できませんでした。通信状態を確認してください。", false)
    }

    private static func liveFetch(_ provider: CapacityDockProvider, _ userInitiated: Bool) async throws -> QuotaSummary? {
        if provider == .claude {
            let usage: SubscriptionUsage?
            if userInitiated { usage = try await ClaudeSubscriptionService.bootstrap() }
            else { usage = try await ClaudeSubscriptionService.refreshIfBootstrapped() }
            return usage.map(DockOnlyQuota.claude)
        }
        if provider == .codex {
            let usage: CodexUsage?
            if userInitiated { usage = try await CodexSubscriptionService.bootstrap() }
            else { usage = try await CodexSubscriptionService.refreshIfBootstrapped() }
            return usage.map(DockOnlyQuota.codex)
        }
        return nil
    }
}

enum DockOnlyQuota {
    static func claude(_ usage: SubscriptionUsage) -> QuotaSummary {
        var rows: [QuotaSummary.Window] = []
        if let percent = usage.fiveHourPercent { rows.append(.init(label: "5-hour", percent: percent / 100, resetsAt: usage.fiveHourResetsAt)) }
        if let percent = usage.sevenDayPercent { rows.append(.init(label: "Weekly", percent: percent / 100, resetsAt: usage.sevenDayResetsAt)) }
        if let percent = usage.sevenDayOpusPercent { rows.append(.init(label: "Weekly · Opus", percent: percent / 100, resetsAt: usage.sevenDayOpusResetsAt)) }
        if let percent = usage.sevenDaySonnetPercent { rows.append(.init(label: "Weekly · Sonnet", percent: percent / 100, resetsAt: usage.sevenDaySonnetResetsAt)) }
        rows += usage.scopedWeekly.map { .init(label: "Weekly · \($0.label)", percent: $0.percent / 100, resetsAt: $0.resetsAt) }
        return QuotaSummary(providerFilter: .claude, connection: .connected,
            primary: rows.first { $0.label == "Weekly" } ?? rows.first, details: rows,
            planLabel: usage.tier.displayName, footerLines: [])
    }

    static func codex(_ usage: CodexUsage) -> QuotaSummary {
        var rows = [usage.primary, usage.secondary].compactMap { $0 }.map {
            QuotaSummary.Window(label: $0.windowLabel, percent: $0.usedPercent / 100, resetsAt: $0.resetsAt)
        }
        for extra in usage.additionalLimits {
            rows += [extra.primary, extra.secondary].compactMap { $0 }.filter { $0.usedPercent > 0 }.map {
                .init(label: "\(extra.name) · \($0.windowLabel)", percent: $0.usedPercent / 100, resetsAt: $0.resetsAt)
            }
        }
        if let credit = usage.creditLimit {
            rows.append(.init(label: "Monthly credits", percent: credit.usedPercent / 100, resetsAt: credit.resetsAt))
        }
        return QuotaSummary(providerFilter: .codex, connection: .connected,
            primary: rows.first, details: rows, planLabel: usage.plan.displayName, footerLines: [])
    }
}
