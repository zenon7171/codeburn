import Foundation
import Testing
@testable import CodeBurnMenubar

@Suite("Dock-only quota and Japanese presentation")
@MainActor
struct DockOnlyTests {
    private func isolatedDefaults() -> UserDefaults {
        UserDefaults(suiteName: "CapacityDockJA.Tests.\(UUID().uuidString)")!
    }

    private func quota(_ percent: Double = 0.17) -> QuotaSummary {
        QuotaSummary(providerFilter: .claude, connection: .connected,
            primary: .init(label: "Weekly", percent: percent, resetsAt: nil),
            details: [.init(label: "Weekly", percent: percent, resetsAt: nil)], planLabel: "Max 20x", footerLines: [])
    }

    @Test("first launch performs no credential read or request")
    func noImplicitConnection() async {
        var calls = 0
        let store = DockOnlyStore(defaults: isolatedDefaults(), fetch: { _, _ in calls += 1; return nil })
        await store.refreshAll()
        #expect(calls == 0)
        #expect(store.monitoring.isEmpty)
        #expect(store.capacityDockQuotaSummary(for: .claude) == nil)
    }

    @Test("connect opts in only the selected provider, pause prevents later refreshes")
    func optInAndPause() async {
        var calls: [(String, Bool)] = []
        let sample = quota()
        let store = DockOnlyStore(defaults: isolatedDefaults(), fetch: { provider, interactive in
            calls.append((provider.id, interactive)); return sample
        })
        await store.connectCapacityDockProvider(.claude)
        await store.refreshAll()
        #expect(calls.map(\.0) == ["claude", "claude"])
        #expect(calls.map(\.1) == [true, false])
        store.pause(.claude)
        await store.refreshAll()
        #expect(calls.count == 2)
        #expect(store.capacityDockQuotaSummary(for: .claude) == nil)
    }

    @Test("late responses do not resurrect a paused provider")
    func pauseDuringFetch() async {
        var continuation: CheckedContinuation<QuotaSummary?, Never>?
        let store = DockOnlyStore(defaults: isolatedDefaults(), fetch: { _, _ in
            await withCheckedContinuation { continuation = $0 }
        })
        let connection = Task { await store.connectCapacityDockProvider(.claude) }
        while continuation == nil { await Task.yield() }
        store.pause(.claude)
        continuation?.resume(returning: quota())
        await connection.value
        #expect(store.capacityDockQuotaSummary(for: .claude) == nil)
        #expect(store.monitoring.isEmpty)
    }

    @Test("a failed refresh retains last known usage without marking it fresh")
    func lastKnownUsage() async {
        var calls = 0
        let sample = quota()
        let store = DockOnlyStore(defaults: isolatedDefaults(), fetch: { _, _ in
            calls += 1
            if calls == 2 { throw URLError(.notConnectedToInternet) }
            return sample
        })
        await store.connectCapacityDockProvider(.claude)
        let updated = store.lastUpdated["claude"]
        await store.refreshAll()
        let summary = store.capacityDockQuotaSummary(for: .claude)
        #expect(summary?.headlineWindow?.percent == 0.17)
        #expect(summary?.connection == .transientFailure)
        #expect(store.lastUpdated["claude"] == updated)
    }

    @Test("demo cannot request credentials even when clicked or refreshed")
    func demoIsOffline() async {
        var calls = 0
        let store = DockOnlyStore(defaults: isolatedDefaults(), demo: true, fetch: { _, _ in calls += 1; return nil })
        await store.connectCapacityDockProvider(.claude)
        await store.refreshAll()
        #expect(calls == 0)
        #expect(store.capacityDockQuotaSummary(for: .claude)?.planLabel?.contains("サンプル") == true)
    }

    @Test("Japanese display keeps model names and raw horizon labels intact")
    func labels() {
        #expect(CapacityDockCopy.japaneseText("Weekly · Fable") == "週間 · Fable")
        #expect(CapacityDockCopy.japaneseText("5-hour") == "5時間")
        #expect(CapacityDockCopy.japaneseText("GPT-5.3-Codex-Spark") == "GPT-5.3-Codex-Spark")
        #expect(quota().headlineWindow?.label == "Weekly")
        let now = Date(timeIntervalSince1970: 1000)
        #expect(CapacityDockCopy.japaneseReset(at: now.addingTimeInterval(1560), now: now) == "26分後にリセット")
        #expect(CapacityDockCopy.japaneseReset(at: now.addingTimeInterval(482400), now: now) == "5日14時間後にリセット")
        #expect(CapacityDockCopy.japaneseReset(at: now.addingTimeInterval(-1), now: now) == "まもなくリセット")
        #expect(CapacityDockCopy.japaneseReset(at: nil, now: now) == "")
    }

    @Test("Claude scoped windows retain their percentages and weekly headline")
    func scopedClaude() {
        let usage = SubscriptionUsage(tier: .max20x, rawTier: nil,
            fiveHourPercent: 6, fiveHourResetsAt: nil,
            sevenDayPercent: 17, sevenDayResetsAt: nil,
            sevenDayOpusPercent: nil, sevenDayOpusResetsAt: nil,
            sevenDaySonnetPercent: nil, sevenDaySonnetResetsAt: nil,
            scopedWeekly: [.init(label: "Fable", percent: 15, resetsAt: nil)], fetchedAt: Date())
        let summary = DockOnlyQuota.claude(usage)
        #expect(summary.details.map(\.label) == ["5-hour", "Weekly", "Weekly · Fable"])
        #expect(summary.details.map(\.percent) == [0.06, 0.17, 0.15])
        #expect(summary.headlineWindow?.percent == 0.17)
    }

    @Test("Codex weekly-only response preserves used percentage and server reset date")
    func codexWeekly() throws {
        let data = Data(#"{"plan_type":"pro","rate_limit":{"primary_window":null,"secondary_window":{"used_percent":10,"limit_window_seconds":604800,"reset_at":1788748140}}}"#.utf8)
        let usage = try CodexSubscriptionService.decodeUsage(data: data)
        let summary = DockOnlyQuota.codex(usage)
        #expect(summary.details.count == 1)
        #expect(summary.headlineWindow?.label == "Weekly")
        #expect(summary.headlineWindow?.percentLabel == "10%")
        #expect(summary.headlineWindow?.resetsAt == Date(timeIntervalSince1970: 1788748140))
        #expect(summary.planLabel == "Pro")
        #expect(summary.planLabel?.contains("サンプル") == false)
    }

    @Test("always-visible icons survive hover exit and dismissal, and persist across reload")
    func alwaysVisibleProviders() {
        let defaults = isolatedDefaults()
        CapacityDockPreferences.setSelectedProviders([.claude, .codex], defaults: defaults)
        CapacityDockPreferences.setAlwaysShowProviders(true, defaults: defaults)
        let model = CapacityDockViewModel(preferences: CapacityDockPreferences.load(defaults: defaults))
        #expect(Set(model.displayedProviders) == Set([CapacityDockProvider.claude, .codex]))
        #expect(model.bodyLength == model.expandedBodyLength)
        model.interaction.setRailHovered(true)
        model.interaction.beginRailExitGrace()
        model.interaction.completeCollapseGrace()
        model.interaction.dismiss()
        #expect(model.isRailExpanded)
        #expect(model.targetBodyLength == model.expandedBodyLength)
        #expect(!model.interaction.isPinned)
        let reloaded = CapacityDockViewModel(preferences: CapacityDockPreferences.load(defaults: defaults))
        #expect(reloaded.displayedProviders.count == 2)
        CapacityDockPreferences.setAlwaysShowProviders(false, defaults: defaults)
        model.preferences = CapacityDockPreferences.load(defaults: defaults)
        #expect(!model.isRailExpanded)
        #expect(model.targetBodyLength == model.restingBodyLength)
    }
}
