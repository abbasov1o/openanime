import Foundation
import Security
import Combine

/// Account state for anizium.co: session token and selected profile live in the
/// Keychain, the profile summary is mirrored into `@Published` state for the UI.
///
/// Anizium's login is a plain credential POST (nick or e-mail plus password)
/// answered with an opaque `session` string — the same scheme the website stores
/// in localStorage. The session string is sent as the `user-session` header on
/// every account-scoped request, and the chosen profile's id as `user-profile`.
@MainActor
final class AniziumAuthManager: ObservableObject {
    static let shared = AniziumAuthManager()

    @Published private(set) var isLoggedIn: Bool
    @Published private(set) var user: AniziumUser?
    @Published private(set) var profiles: [AniziumProfile] = []
    @Published private(set) var selectedProfileID: String?
    @Published private(set) var isPremium: Bool = false

    /// Set when a stored session turned out to be rejected, so Settings can say
    /// "sign in again" instead of a confident "Signed in".
    @Published private(set) var needsReauthentication = false

    private let userCacheKey = "anizium_cached_user"

    private init() {
        let hasSession = Self.readToken() != nil
        isLoggedIn = hasSession
        selectedProfileID = Self.readProfileID()
        if let data = UserDefaults.standard.data(forKey: userCacheKey),
           let cached = try? JSONDecoder().decode(AniziumUser.self, from: data) {
            user = cached
            profiles = cached.profiles ?? []
        }
    }

    // MARK: - Session storage (Keychain)

    /// Keychain reads are safe from any isolation context, so the HTTP layer can
    /// pick the session headers up without hopping to the main actor.
    nonisolated private static let keychainService = "com.shirox.app.anizium"
    nonisolated private static let sessionAccount = "anizium_user_session"
    nonisolated private static let profileAccount = "anizium_profile_id"

    nonisolated var sessionToken: String? { AniziumAuthManager.readToken() }
    nonisolated var storedProfileID: String? { AniziumAuthManager.readProfileID() }

    nonisolated private static func keychainRead(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    nonisolated private static func keychainWrite(account: String, value: String) {
        keychainDelete(account: account)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked,
            kSecValueData as String: Data(value.utf8)
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    nonisolated private static func keychainDelete(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }

    nonisolated private static func readToken() -> String? { keychainRead(account: sessionAccount) }
    nonisolated private static func readProfileID() -> String? { keychainRead(account: profileAccount) }

    // MARK: - Sign in / register

    /// Logs in with a nick or e-mail plus password. On success the session is
    /// stored and the account summary is fetched immediately.
    func login(value: String, password: String) async throws {
        let envelope = try await AniziumClient.post(
            AniziumLoginEnvelope.self,
            path: "/user/login",
            body: ["value": value, "password": password],
            encrypted: true,
            session: .anonymous
        )
        guard envelope.success == true, let session = envelope.session else {
            throw AniziumError.api(envelope.msg ?? "Anizium login failed.")
        }
        AniziumAuthManager.keychainWrite(account: Self.sessionAccount, value: session)
        isLoggedIn = true
        needsReauthentication = false
        try await fetchUser()
    }

    /// Creates an account. Anizium answers with the new account's id; the caller
    /// decides whether to sign straight in (the site drops the user into a
    /// second login step) — here the session is requested right away.
    func register(nick: String, name: String?, surname: String?, email: String,
                  phone: String?, password: String) async throws {
        let body: [String: Any] = [
            "nick": nick,
            "name": name ?? "",
            "surname": surname ?? "",
            "email": email,
            "phone": phone ?? "",
            "password": password,
            "confirm_password": password,
            "reference": "",
            "login": true
        ]
        let envelope = try await AniziumClient.post(
            AniziumLoginEnvelope.self,
            path: "/user/register",
            body: body,
            encrypted: true,
            session: .anonymous
        )
        guard envelope.success == true else {
            throw AniziumError.api(envelope.msg ?? "Anizium registration failed.")
        }
    }

    /// Validates a stored session and refreshes the published account state.
    /// Returns false when the session was rejected.
    @discardableResult
    func fetchUser() async throws -> Bool {
        let envelope = try await AniziumClient.get(
            AniziumUserEnvelope.self,
            path: "/user/get",
            session: .current
        )
        guard envelope.success == true, let account = envelope.data else {
            return false
        }
        user = account
        profiles = account.profiles ?? []
        isPremium = (account.subscription == true) || (account.infinity == true)
        if let data = try? JSONEncoder().encode(account) {
            UserDefaults.standard.set(data, forKey: userCacheKey)
        }
        if selectedProfileID == nil || !profiles.contains(where: { $0.ID == selectedProfileID }) {
            selectProfile(profiles.first?.ID)
        }
        return true
    }

    /// Called on launch: if a session exists, validate it quietly. A rejected
    /// session keeps the token (transient failures are indistinguishable from
    /// revoked sessions) but flags the account for re-authentication.
    func restoreSession() async {
        guard sessionToken != nil else { return }
        do {
            if try await fetchUser() {
                needsReauthentication = false
            } else {
                needsReauthentication = true
            }
        } catch {
            needsReauthentication = true
        }
    }

    func selectProfile(_ id: String?) {
        selectedProfileID = id
        if let id {
            AniziumAuthManager.keychainWrite(account: Self.profileAccount, value: id)
        } else {
            AniziumAuthManager.keychainDelete(account: Self.profileAccount)
        }
    }

    func logout() {
        let context = AniziumClient.SessionContext.current
        Task.detached {
            _ = try? await AniziumClient.request(path: "/user/exit", session: context)
        }
        AniziumAuthManager.keychainDelete(account: Self.sessionAccount)
        AniziumAuthManager.keychainDelete(account: Self.profileAccount)
        UserDefaults.standard.removeObject(forKey: userCacheKey)
        isLoggedIn = false
        user = nil
        profiles = []
        selectedProfileID = nil
        isPremium = false
        needsReauthentication = false
    }
}
