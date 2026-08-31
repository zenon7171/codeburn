#if CAPACITY_DOCK_ONLY
import AppKit
import SwiftUI

@main
struct CapacityDockOnlyApp {
    @MainActor static func main() {
        let app = NSApplication.shared
        let delegate = DockOnlyAppDelegate()
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}

@MainActor
final class DockOnlyAppDelegate: NSObject, NSApplicationDelegate {
    private let defaults: UserDefaults
    private let store: DockOnlyStore
    private var dock: CapacityDockController?
    private var statusItem: NSStatusItem?
    private var settingsWindow: NSWindow?
    private var refreshTask: Task<Void, Never>?
    private var settingsObserver: NSObjectProtocol?

    override init() {
        let demo = ProcessInfo.processInfo.arguments.contains("--demo")
        defaults = demo ? UserDefaults(suiteName: "io.github.zenon7171.capacity-dock.demo")! : .standard
        defaults.register(defaults: [
            CapacityDockPreferences.enabledKey: true,
            CapacityDockPreferences.alwaysShowProvidersKey: true,
            CapacityDockPreferences.selectedProvidersKey: ["claude", "codex"],
            CapacityDockPreferences.preferredProviderKey: "claude",
            CapacityDockPreferences.dockEdgeKey: "right",
            CapacityDockPreferences.scaleKey: 1.0,
        ])
        store = DockOnlyStore(defaults: defaults, demo: demo)
        super.init()
    }

    func applicationWillFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        dock = CapacityDockController(store: store, defaults: defaults)
        store.didChange = { [weak self] in self?.dock?.refreshQuotaPresentation() }
        dock?.start()
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.image = NSImage(systemSymbolName: "chart.pie", accessibilityDescription: "Capacity Dock 日本語版")
        item.button?.toolTip = store.demo ? "Capacity Dock（サンプル表示）" : "Capacity Dock 日本語版"
        let menu = NSMenu()
        if store.demo {
            let sample = NSMenuItem(title: "サンプル表示・実データではありません", action: nil, keyEquivalent: "")
            sample.isEnabled = false
            menu.addItem(sample)
        }
        addItem("接続・表示設定…", action: #selector(openSettings), key: ",", menu: menu)
        addItem("Dockの表示を切り替え", action: #selector(toggleDock), menu: menu)
        addItem("今すぐ更新", action: #selector(refreshNow), key: "r", menu: menu)
        menu.addItem(.separator())
        addItem("Capacity Dockを終了", action: #selector(quit), key: "q", menu: menu)
        item.menu = menu
        statusItem = item
        settingsObserver = NotificationCenter.default.addObserver(forName: .capacityDockOpenProviderSettings, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in self?.openSettings() }
        }
        // A single quota-only loop. No CLI daemon, cost reports, telemetry,
        // updater, login-item registration, or legacy-process cleanup.
        refreshTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                await self.store.refreshAll()
                self.dock?.refreshQuotaPresentation()
                do { try await Task.sleep(for: .seconds(60)) } catch { return }
            }
        }
        if store.monitoring.isEmpty && !store.demo { openSettings() }
    }

    private func addItem(_ title: String, action: Selector, key: String = "", menu: NSMenu) {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
        item.target = self
        menu.addItem(item)
    }

    @objc private func openSettings() {
        if settingsWindow == nil {
            let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 510, height: 600),
                styleMask: [.titled, .closable, .miniaturizable], backing: .buffered, defer: false)
            window.title = "Capacity Dock — 接続・表示設定"
            window.contentViewController = NSHostingController(rootView: DockOnlySettings(store: store, defaults: defaults))
            window.isReleasedWhenClosed = false
            window.center()
            settingsWindow = window
        }
        settingsWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc private func toggleDock() {
        CapacityDockPreferences.setEnabled(!CapacityDockPreferences.load(defaults: defaults).isEnabled, defaults: defaults)
    }

    @objc private func refreshNow() {
        Task { [weak self] in await self?.store.refreshAll() }
    }

    @objc private func quit() { NSApp.terminate(nil) }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        openSettings()
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        refreshTask?.cancel()
        dock?.stop()
        if let settingsObserver { NotificationCenter.default.removeObserver(settingsObserver) }
        // Intentionally no global process registry or CLI shutdown.
    }
}

private struct DockOnlySettings: View {
    let store: DockOnlyStore
    let defaults: UserDefaults
    @State private var snapshot: CapacityDockPreferences.Snapshot

    init(store: DockOnlyStore, defaults: UserDefaults) {
        self.store = store
        self.defaults = defaults
        _snapshot = State(initialValue: CapacityDockPreferences.load(defaults: defaults))
    }

    var body: some View {
        Form {
            Section {
                Text("画面の端で、ClaudeとCodexの使用率を確認できます。")
                Text("数値は使用済みの割合です。公式画面の「残り90%」は、ここでは「使用率10%」になります。")
                    .font(.caption).foregroundStyle(.secondary)
                Text("費用ダッシュボードやログ集計は起動しません。CodeBurn CLIも不要です。")
                    .font(.caption).foregroundStyle(.secondary)
                if store.demo { Text("サンプル表示です。認証情報の読み取りや通信は行いません。").foregroundStyle(.orange) }
            }
            Section("アカウント接続") {
                ForEach(DockOnlyStore.providers) { provider in
                    VStack(alignment: .leading, spacing: 7) {
                        HStack {
                            Text(provider.displayName).fontWeight(.semibold)
                            Spacer()
                            if store.busy.contains(provider.id) { ProgressView().controlSize(.small) }
                            Button(store.monitoring.contains(provider.id) ? "再接続" : "接続") {
                                Task { await store.connectCapacityDockProvider(provider) }
                            }.disabled(store.busy.contains(provider.id) || store.demo)
                            if store.monitoring.contains(provider.id) {
                                Button("監視を停止") { store.pause(provider) }.disabled(store.demo)
                            }
                        }
                        if let error = store.errors[provider.id] {
                            Text(error).font(.caption).foregroundStyle(.orange)
                        } else if let updated = store.lastUpdated[provider.id] {
                            Text("更新: \(updated.formatted(date: .omitted, time: .shortened))").font(.caption).foregroundStyle(.secondary)
                        } else {
                            Text(store.monitoring.contains(provider.id) ? "接続済みのアカウントを確認中" : "未接続").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                Text("ログイン済みのClaude Code／Codexの認証情報を使って、それぞれの提供元から使用枠を取得します。Claudeはキーチェーンの確認が出る場合があります。初回は「接続」を押すまで読み取りません。")
                    .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            Section("Dockの表示") {
                Toggle("Capacity Dockを表示", isOn: Binding(get: { snapshot.isEnabled }, set: {
                    CapacityDockPreferences.setEnabled($0, defaults: defaults)
                }))
                Toggle("選択したアイコンを常に表示", isOn: Binding(get: { snapshot.alwaysShowProviders }, set: {
                    CapacityDockPreferences.setAlwaysShowProviders($0, defaults: defaults)
                }))
                ForEach(DockOnlyStore.providers) { provider in
                    Toggle(provider.displayName, isOn: Binding(get: { snapshot.selectedProviders.contains(provider) }, set: { selected in
                        var providers = snapshot.selectedProviders
                        if selected { providers.append(provider) } else { providers.removeAll { $0 == provider } }
                        guard !providers.isEmpty else { return }
                        CapacityDockPreferences.setSelectedProviders(providers, defaults: defaults)
                    }))
                    .disabled(snapshot.selectedProviders.count == 1 && snapshot.selectedProviders.contains(provider))
                }
                Picker("通常表示するプロバイダー", selection: Binding(get: { snapshot.preferredProvider }, set: {
                    CapacityDockPreferences.setPreferredProvider($0, defaults: defaults)
                })) {
                    ForEach(snapshot.selectedProviders) { Text($0.displayName).tag($0) }
                }
                HStack {
                    Text("サイズ")
                    Slider(value: Binding(get: { snapshot.scale }, set: { CapacityDockPreferences.setScale($0, defaults: defaults) }), in: CapacityDockPreferences.scaleRange)
                }
                Text("アイコンにカーソルを合わせると詳細を表示します。ドラッグで位置を変え、右クリックから左右・上下の端に配置できます。")
                    .font(.caption).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
        }
        .formStyle(.grouped)
        .frame(width: 510, height: 600)
        .environment(\.locale, Locale(identifier: "ja_JP"))
        .onReceive(NotificationCenter.default.publisher(for: .capacityDockPreferencesDidChange)) { _ in
            snapshot = CapacityDockPreferences.load(defaults: defaults)
        }
    }
}
#endif
