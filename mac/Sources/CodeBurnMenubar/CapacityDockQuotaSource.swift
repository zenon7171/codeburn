import Foundation

/// The dock needs live quota only, not CodeBurn's session parser or dashboard.
@MainActor
protocol CapacityDockQuotaSource: AnyObject {
    func capacityDockQuotaSummary(for provider: CapacityDockProvider) -> QuotaSummary?
    func capacityDockCredential(for provider: CapacityDockProvider) async -> CapacityDockProviderCredential
    func connectCapacityDockProvider(_ provider: CapacityDockProvider) async
}

extension AppStore: CapacityDockQuotaSource {}
