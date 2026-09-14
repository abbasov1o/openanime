import Foundation

/// Endpoints of api.anizium.co behind the native provider: home rows, recently
/// added episodes, search, catalogs, anime detail, calendar and the
/// account-scoped lists (keep-watching, notifications).
@MainActor
final class AniziumService {
    static let shared = AniziumService()
    private init() {}

    // MARK: - Discovery

    /// The site's own home page: three curated rows plus the special sections.
    func home() async throws -> AniziumHomeEnvelope {
        try await AniziumClient.get(AniziumHomeEnvelope.self, path: "/page/home", session: .anonymous)
    }

    /// "Son Eklenen Bölümler" — the episodes most recently added to the site.
    func lastAddedEpisodes(page: Int) async throws -> [AniziumEpisode] {
        let envelope = try await AniziumClient.get(
            AniziumEnvelope<AniziumEpisode>.self,
            path: "/page/last-added-episodes",
            query: ["page": String(page)],
            session: .anonymous
        )
        return envelope.page?.data ?? []
    }

    /// The site's "favorite" ranking, ten per page.
    func top(page: Int) async throws -> [AniziumAnime] {
        let envelope = try await AniziumClient.get(
            AniziumEnvelope<AniziumAnime>.self,
            path: "/page/top",
            query: ["platform": "favorite", "page": String(page)],
            session: .anonymous
        )
        return envelope.page?.data ?? []
    }

    func search(keyword: String, page: Int) async throws -> [AniziumAnime] {
        let envelope = try await AniziumClient.get(
            AniziumEnvelope<AniziumAnime>.self,
            path: "/page/search",
            query: ["value": keyword, "page": String(page)],
            session: .anonymous
        )
        return envelope.page?.data ?? []
    }

    /// Search results are ten to a page; the module merges the first two pages
    /// and the native search does the same so both surfaces agree.
    func searchAll(keyword: String) async throws -> [AniziumAnime] {
        async let first = search(keyword: keyword, page: 1)
        async let second = search(keyword: keyword, page: 2)
        let (pageOne, pageTwo) = try await (first, second)
        var seen = Set<String>()
        return (pageOne + pageTwo).filter { seen.insert($0.ID).inserted }
    }

    /// Browses by catalog id: content types (`movie`, `series` under
    /// `type=type`) or genre ids (under `type=genre`).
    func catalog(id: String, type: String, page: Int) async throws -> [AniziumAnime] {
        let envelope = try await AniziumClient.get(
            AniziumEnvelope<AniziumAnime>.self,
            path: "/page/catalog",
            query: ["id": id, "type": type, "page": String(page)],
            session: .anonymous
        )
        return envelope.page?.data ?? []
    }

    /// Full detail for one anime, seasons and episodes included.
    func anime(id: String) async throws -> AniziumAnime {
        let envelope = try await AniziumClient.get(
            AniziumEnvelope<AniziumAnime>.self,
            path: "/anime/get",
            query: ["id": id],
            session: .anonymous
        )
        guard envelope.success == true, let anime = envelope.data else {
            throw AniziumError.api(envelope.msg ?? "Anime bulunamadı.")
        }
        return anime
    }

    /// The site's release calendar: upcoming and freshly added 4K content,
    /// grouped by day.
    func calendar() async throws -> [AniziumCalendarDay] {
        let envelope = try await AniziumClient.get(
            AniziumEnvelope<[AniziumCalendarDay]>.self,
            path: "/page/calendar",
            session: .anonymous
        )
        return envelope.data ?? []
    }

    // MARK: - Account-scoped

    /// The signed-in profile's continue-watching entries (server-side).
    func keepWatching() async throws -> [AniziumKeepWatchingEntry] {
        let envelope = try await AniziumClient.get(
            AniziumKeepWatchingEnvelope.self,
            path: "/page/keep-watching",
            session: .current
        )
        return envelope.data ?? []
    }

    func saveKeepWatching(id: String, season: Int, episode: Int, time: Double) async throws {
        _ = try await AniziumClient.request(
            path: "/anime/keep-watching/save",
            method: "POST",
            body: ["id": id, "season": season, "episode": episode, "time": Int(time)],
            encrypted: true,
            session: .current
        )
    }

    func deleteKeepWatching(id: String, season: Int, episode: Int) async throws {
        _ = try await AniziumClient.request(
            path: "/anime/keep-watching/delete",
            method: "POST",
            body: ["id": id, "season": season, "episode": episode],
            encrypted: true,
            session: .current
        )
    }

    func notifications(page: Int) async throws -> (items: [AniziumNotification], unread: Int) {
        let envelope = try await AniziumClient.get(
            AniziumNotificationEnvelope.self,
            path: "/user/notification/list",
            query: ["page": String(page)],
            session: .current
        )
        return (envelope.page?.data ?? [], envelope.notRead ?? 0)
    }

    func markNotificationRead(id: String) async throws {
        _ = try await AniziumClient.request(
            path: "/user/notification/read",
            method: "POST",
            body: ["id": id],
            encrypted: true,
            session: .current
        )
    }

    // MARK: - Genre vocabulary

    /// Anizium publishes Turkish genre names under numeric ids. The browse grid
    /// offers AniList's English names, so the two are bridged here; a genre with
    /// no Anizium equivalent (`Music`) simply returns no catalog filter.
    static let genreIDsByEnglishName: [String: String] = [
        "Action": "62263",
        "Adventure": "5263",
        "Comedy": "47450",
        "Drama": "57282",
        "Ecchi": "17263",
        "Fantasy": "43261",
        "Horror": "7628",
        "Mahou Shoujo": "82742",
        "Mecha": "21846",
        "Mystery": "78746",
        "Psychological": "29049",
        "Romance": "59624",
        "Sci-Fi": "90158",
        "Slice of Life": "47202",
        "Sports": "25731",
        "Supernatural": "11860",
        "Thriller": "57593"
    ]
}
