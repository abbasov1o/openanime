import Foundation

/// The native Anizium provider: feeds the provider-driven screens (Home,
/// Browse, Search, Detail, Notifications) from api.anizium.co and maps responses
/// onto the app's shared `Media` model, so the existing card views render
/// Anizium content unchanged.
///
/// AniList and MyAnimeList are currently disabled; while this provider is the
/// only one registered, every `ProviderManager.call` route lands here.
@MainActor
final class AniziumProvider: MediaProvider {
    static let shared = AniziumProvider()
    private init() {}

    let providerType: ProviderType = .anizium
    let displayName = "Anizium"

    var isAuthenticated: Bool { AniziumAuthManager.shared.isLoggedIn }

    // MARK: - Auth

    /// Anizium signs in with a nick/e-mail and password form rather than a web
    /// OAuth sheet, so the login UI presents `AniziumLoginView` directly from
    /// Onboarding and Settings instead of going through this method.
    func login(presentationAnchor: AnyObject) async throws {
        throw ProviderError.unsupported
    }

    func logout() {
        AniziumAuthManager.shared.logout()
    }

    // MARK: - Discovery

    /// One request round covers the whole home screen: the site's own home
    /// page (hero + curated rows), its favorite ranking for the popular row,
    /// and its most recently added episodes for the "Son Eklenen Bölümler" row.
    func homeFeed() async throws -> HomeFeed {
        async let home = AniziumService.shared.home()
        async let popularPage = AniziumService.shared.top(page: 1)
        async let latest = AniziumService.shared.lastAddedEpisodes(page: 1)
        let (home, popular, latestEpisodes) = try await (home, popularPage, latest)

        let featured = featuredShows(from: home)
        return HomeFeed(
            trending: (home.settlementTop ?? []).map { $0.toMedia() },
            seasonal: (home.settlementMiddle ?? []).map { $0.toMedia() },
            lastSeason: [],
            popular: popular.map { $0.toMedia() },
            topRated: featured.map { $0.toMedia() },
            latestEpisodes: latestEpisodes.map { episode in
                LatestEpisode(
                    media: episode.toMedia(),
                    season: episode.season,
                    episode: episode.episode,
                    addedAt: episode.created
                )
            }
        )
    }

    /// The site's curated "Öne Çıkanlar" row, used for the Top Rated section.
    private func featuredShows(from home: AniziumHomeEnvelope) -> [AniziumAnime] {
        for section in home.specialList ?? [] where section.name == "Öne Çıkanlar" {
            return section.data ?? []
        }
        return (home.settlementLower ?? [])
    }

    func trending() async throws -> [Media] {
        let home = try await AniziumService.shared.home()
        return (home.settlementTop ?? []).map { $0.toMedia() }
    }

    func seasonal() async throws -> [Media] {
        let home = try await AniziumService.shared.home()
        return (home.settlementMiddle ?? []).map { $0.toMedia() }
    }

    func lastSeasonCompleted() async throws -> [Media] { [] }

    func popular() async throws -> [Media] {
        try await AniziumService.shared.top(page: 1).map { $0.toMedia() }
    }

    func topRated() async throws -> [Media] {
        let home = try await AniziumService.shared.home()
        return featuredShows(from: home).map { $0.toMedia() }
    }

    func discover(genre: String?, sort: DiscoverSort, page: Int) async throws -> [Media] {
        if let genre, let genreID = AniziumService.genreIDsByEnglishName[genre] {
            return try await AniziumService.shared
                .catalog(id: genreID, type: "genre", page: page)
                .map { $0.toMedia() }
        }
        switch sort {
        case .newest:
            return try await AniziumService.shared
                .catalog(id: "series", type: "type", page: page)
                .map { $0.toMedia() }
        case .popular, .trending, .topRated:
            return try await AniziumService.shared.top(page: page).map { $0.toMedia() }
        }
    }

    func search(_ query: String) async throws -> [Media] {
        try await AniziumService.shared.searchAll(keyword: query).map { $0.toMedia() }
    }

    func detail(id: Int) async throws -> Media {
        try await AniziumService.shared.anime(id: String(id)).toMedia()
    }

    func browse(category: BrowseCategory, page: Int) async throws -> [Media] {
        switch category {
        case .trending, .popular:
            return try await AniziumService.shared.top(page: page).map { $0.toMedia() }
        case .seasonal:
            guard page == 1 else { return [] }
            return try await seasonal()
        case .lastSeason:
            return []
        case .topRated:
            guard page == 1 else { return [] }
            return try await topRated()
        }
    }

    // MARK: - Library

    /// Anizium's watch lists are premium-gated on the service side, so the
    /// cloud library stays unavailable; the on-device library continues to work
    /// regardless of the provider.
    func fetchLibrary() async throws -> [LibraryEntry] {
        guard isAuthenticated else { throw ProviderError.unauthenticated }
        throw ProviderError.unsupported
    }

    func fetchEntry(mediaId: Int) async throws -> LibraryEntry? {
        guard isAuthenticated else { throw ProviderError.unauthenticated }
        throw ProviderError.unsupported
    }

    func updateEntry(mediaId: Int, status: MediaListStatus, progress: Int, score: Double) async throws {
        throw ProviderError.unsupported
    }

    func deleteEntry(entryId: Int) async throws {
        throw ProviderError.unsupported
    }

    // MARK: - Profile

    func fetchCurrentUser() async throws -> UserProfile {
        guard isAuthenticated else { throw ProviderError.unauthenticated }
        _ = try await AniziumAuthManager.shared.fetchUser()
        return currentUserProfile() ?? throwNotSignedIn()
    }

    func fetchProfile(userId: Int) async throws -> UserProfile {
        guard let user = AniziumAuthManager.shared.user, Int(user.ID) == userId else {
            throw ProviderError.notFound
        }
        return currentUserProfile() ?? throwNotSignedIn()
    }

    private func currentUserProfile() -> UserProfile? {
        guard let user = AniziumAuthManager.shared.user else { return nil }
        let avatar = (user.profiles ?? []).first?.avatarLink
        return UserProfile(
            id: Int(user.ID) ?? 0,
            provider: .anizium,
            name: user.nick ?? "Anizium user",
            about: user.email,
            avatarURL: avatar,
            bannerImage: nil,
            isFollowing: nil,
            statistics: nil,
            favourites: nil
        )
    }

    private func throwNotSignedIn() -> UserProfile {
        // Unreachable when `currentUserProfile()` had a user; keeps the
        // `??` chain above compact without force-unwrapping.
        return UserProfile(id: 0, provider: .anizium, name: "Anizium user",
                           avatarURL: nil, bannerImage: nil, isFollowing: nil,
                           statistics: nil)
    }

    // MARK: - Social

    func fetchActivity(filter: ActivityFeed, userId: Int, page: Int) async throws -> [UserActivity] {
        throw ProviderError.unsupported
    }

    var supportsNotifications: Bool { isAuthenticated }

    func fetchNotifications() async throws -> [ProviderNotification] {
        guard isAuthenticated else { throw ProviderError.unauthenticated }
        let (items, _) = try await AniziumService.shared.notifications(page: 1)
        return items.map { notification in
            let id = Int(notification.ID) ?? notification.ID.hashValue
            return ProviderNotification(id: id, kind: Self.kind(for: notification), createdAt: Int(notification.created ?? 0) / 1000)
        }
    }

    private static func kind(for notification: AniziumNotification) -> NotificationKind {
        switch notification.value {
        case "anime_notification":
            return .mediaChange(title: nil, context: "New episode added", coverURL: nil, mediaId: nil)
        case "user_welcome":
            return .unknown(context: "Welcome to Anizium")
        case "anime_request_added":
            return .unknown(context: "Your anime request was added")
        case "ticket_answer":
            return .unknown(context: "Support answered your ticket")
        default:
            return .unknown(context: notification.value)
        }
    }

    func postStatus(_ text: String) async throws {
        throw ProviderError.unsupported
    }

    func toggleLike(id: Int, type: LikeableType) async throws -> Bool {
        throw ProviderError.unsupported
    }

    func toggleFollow(userId: Int) async throws -> Bool {
        throw ProviderError.unsupported
    }

    func postReply(activityId: Int, text: String) async throws {
        throw ProviderError.unsupported
    }

    func deleteActivity(id: Int) async throws {
        throw ProviderError.unsupported
    }

    func fetchFollowers(userId: Int, page: Int) async throws -> [UserProfile] {
        throw ProviderError.unsupported
    }

    func fetchFollowing(userId: Int, page: Int) async throws -> [UserProfile] {
        throw ProviderError.unsupported
    }
}
