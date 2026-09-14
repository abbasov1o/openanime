import Foundation

// MARK: - Errors

enum AniziumError: Error, LocalizedError {
    /// The API answered with its own `isError` flag and a human-readable message.
    case api(String)
    case http(Int)
    case network(Error)
    case decoding(Error)
    case notFound

    var errorDescription: String? {
        switch self {
        case .api(let message): return message
        case .http(let code): return "Anizium server error (\(code))."
        case .network(let error): return error.localizedDescription
        case .decoding(let error): return "Anizium data error: \(error.localizedDescription)"
        case .notFound: return "Content not found on Anizium."
        }
    }
}

// MARK: - Page envelope

/// The API's standard paged payload: `{ page: { …, data: [T] } }`.
struct AniziumPage<T: Decodable>: Decodable {
    let page: Int?
    let perPageItems: Int?
    let nextPage: Int?
    let totalPages: Int?
    let data: [T]?

    enum CodingKeys: String, CodingKey {
        case page
        case perPageItems = "per_page_items"
        case nextPage = "next_page"
        case totalPages = "total_pages"
        case data
    }
}

/// Envelope shared by most endpoints. Every field is optional so the same type
/// covers `{ success, data }`, `{ success, page }` and `{ isError, msg }` shapes.
struct AniziumEnvelope<T: Decodable>: Decodable {
    let success: Bool?
    let isError: Bool?
    let msg: String?
    let data: T?
    let page: AniziumPage<T>?
}

// MARK: - Anime

/// An anime as Anizium returns it in home rows, search results and catalogs.
/// Field spellings follow the API (`ID`, `imdb_point`, `total_season`, …).
struct AniziumAnime: Decodable {
    let ID: String
    let type: String?
    let name: String
    let nameTr: String?
    let nameJp: String?
    let logo: String?
    let banner: String?
    let detailsBanner: String?
    let poster: String?
    let overview: String?
    let overviewShort: String?
    let status: String?
    let quality: String?
    let age: Int?
    let genre: [String]?
    let tag: [String]?
    let soundGroup: [String]?
    let subtitleGroup: [String]?
    let category: [String]?
    let country: [String]?
    let language: [String]?
    let imdbPoint: Double?
    let favorite: Int?
    let like: Int?
    let dislike: Int?
    let totalSeason: Int?
    let releaseYear: Int?
    let created: Double?
    let seasons: [AniziumSeason]?
    let series: String?

    enum CodingKeys: String, CodingKey {
        case ID, type, name, logo, banner, poster, overview, status, quality, age
        case genre, tag, category, country, language, favorite, like, dislike, seasons, series
        case nameTr = "name_tr"
        case nameJp = "name_jp"
        case detailsBanner = "details_banner"
        case overviewShort = "overview_short"
        case soundGroup = "sound_group"
        case subtitleGroup = "subtitle_group"
        case imdbPoint = "imdb_point"
        case totalSeason = "total_season"
        case releaseYear = "release_year"
        case created
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        ID = try c.decode(String.self, forKey: .ID)
        type = try c.decodeIfPresent(String.self, forKey: .type)
        name = try c.decode(String.self, forKey: .name)
        nameTr = try c.decodeIfPresent(String.self, forKey: .nameTr)
        nameJp = try c.decodeIfPresent(String.self, forKey: .nameJp)
        logo = try c.decodeIfPresent(String.self, forKey: .logo)
        banner = try c.decodeIfPresent(String.self, forKey: .banner)
        detailsBanner = try c.decodeIfPresent(String.self, forKey: .detailsBanner)
        poster = try c.decodeIfPresent(String.self, forKey: .poster)
        overview = try c.decodeIfPresent(String.self, forKey: .overview)
        overviewShort = try c.decodeIfPresent(String.self, forKey: .overviewShort)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        quality = try c.decodeIfPresent(String.self, forKey: .quality)
        age = try c.decodeIfPresent(Int.self, forKey: .age)
        genre = try c.decodeIfPresent([String].self, forKey: .genre)
        tag = try c.decodeIfPresent([String].self, forKey: .tag)
        soundGroup = try c.decodeIfPresent([String].self, forKey: .soundGroup)
        subtitleGroup = try c.decodeIfPresent([String].self, forKey: .subtitleGroup)
        category = try c.decodeIfPresent([String].self, forKey: .category)
        country = try c.decodeIfPresent([String].self, forKey: .country)
        language = try c.decodeIfPresent([String].self, forKey: .language)
        imdbPoint = try c.decodeIfPresent(Double.self, forKey: .imdbPoint)
        favorite = try c.decodeIfPresent(Int.self, forKey: .favorite)
        like = try c.decodeIfPresent(Int.self, forKey: .like)
        dislike = try c.decodeIfPresent(Int.self, forKey: .dislike)
        totalSeason = try c.decodeIfPresent(Int.self, forKey: .totalSeason)
        releaseYear = try c.decodeIfPresent(Int.self, forKey: .releaseYear)
        created = try c.decodeIfPresent(Double.self, forKey: .created)
        seasons = try c.decodeIfPresent([AniziumSeason].self, forKey: .seasons)
        series = try c.decodeIfPresent(String.self, forKey: .series)
    }
}

struct AniziumSeason: Decodable {
    let number: Int?
    let name: String?
    let episodes: [AniziumSeasonEpisode]?
}

struct AniziumSeasonEpisode: Decodable {
    let number: Int?
    let name: String?
}

// MARK: - Recently added episodes

/// One row of `/page/last-added-episodes`: the episode that was added, plus the
/// show it belongs to.
struct AniziumEpisode: Decodable {
    let ID: String
    let name: String
    let logo: String?
    let banner: String?
    let detailsBanner: String?
    let poster: String?
    let season: Int?
    let episode: Int?
    let runTime: Int?
    let overview: String?
    let created: Double?

    enum CodingKeys: String, CodingKey {
        case ID, name, logo, banner, poster, season, episode, overview, created
        case detailsBanner = "details_banner"
        case runTime = "run_time"
    }
}

// MARK: - Home

struct AniziumHomeEnvelope: Decodable {
    let success: Bool?
    let settlementTop: [AniziumAnime]?
    let settlementMiddle: [AniziumAnime]?
    let settlementLower: [AniziumAnime]?
    let specialList: [AniziumSpecialSection]?

    enum CodingKeys: String, CodingKey {
        case success
        case settlementTop = "settlement_top"
        case settlementMiddle = "settlement_middle"
        case settlementLower = "settlement_lower"
        case specialList = "special_list"
    }
}

/// One curated row of the site's home page ("Öne Çıkanlar", "Romantik", …).
/// `valueType` is `"tag"`, `"genre"` or `"sound_group"`; `value` is the catalog id.
struct AniziumSpecialSection: Decodable {
    let id: String?
    let value: String?
    let valueType: String?
    let name: String?
    let data: [AniziumAnime]?

    enum CodingKeys: String, CodingKey {
        case id, value, name, data
        case valueType = "value_type"
    }
}

// MARK: - Calendar

struct AniziumCalendarDay: Decodable {
    let id: String?
    let title: String?
    let monthName: String?
    let dayName: String?
    let contents: [AniziumCalendarEntry]?

    enum CodingKeys: String, CodingKey {
        case id, title, contents
        case monthName = "month_name"
        case dayName = "day_name"
    }
}

struct AniziumCalendarEntry: Decodable {
    let ID: String?
    let contentId: String?
    let contentType: String?
    let season: Int?
    let episode: Int?
    let onAir: Bool?
    let releaseDate: Double?
    let content: AniziumAnime?

    enum CodingKeys: String, CodingKey {
        case ID, content, season, episode
        case contentId = "content_id"
        case contentType = "content_type"
        case onAir = "on_air"
        case releaseDate = "release_date"
    }
}

// MARK: - Account

struct AniziumUser: Codable {
    let ID: String
    let nick: String?
    let email: String?
    let name: String?
    let surname: String?
    let subscription: Bool?
    let infinity: Bool?
    let staff: Bool?
    let profiles: [AniziumProfile]?
}

struct AniziumProfile: Codable, Identifiable {
    let ID: String
    let name: String?
    let avatarLink: String?

    enum CodingKeys: String, CodingKey {
        case ID, name
        case avatarLink = "avatar_link"
    }

    var id: String { self.ID }
}

struct AniziumUserEnvelope: Decodable {
    let success: Bool?
    let isError: Bool?
    let msg: String?
    let data: AniziumUser?
}

struct AniziumLoginEnvelope: Decodable {
    let success: Bool?
    let isError: Bool?
    let msg: String?
    let session: String?
}

/// `/page/keep-watching` row: the show plus where the viewer left off.
struct AniziumKeepWatchingEntry: Decodable {
    let ID: String
    let name: String
    let poster: String?
    let banner: String?
    let type: String?
    let time: Double?
    let season: Int?
    let episode: Int?
    let updated: Double?
}

struct AniziumKeepWatchingEnvelope: Decodable {
    let success: Bool?
    let isError: Bool?
    let msg: String?
    let data: [AniziumKeepWatchingEntry]?
}

// MARK: - Notifications

struct AniziumNotification: Decodable {
    let ID: String
    let profile: String?
    let created: Double?
    let read: Bool?
    let value: String?
    let data: String?
}

struct AniziumNotificationEnvelope: Decodable {
    let success: Bool?
    let isError: Bool?
    let msg: String?
    let page: AniziumPage<AniziumNotification>?
    let notRead: Int?

    enum CodingKeys: String, CodingKey {
        case success, isError, msg, page
        case notRead = "not_read"
    }
}

// MARK: - Media mapping

extension AniziumAnime {
    /// Anizium ids are numeric strings well inside Int64's range ("437677985").
    var numericID: Int? { Int(ID) }

    var totalEpisodeCount: Int? {
        guard let seasons else { return nil }
        let count = seasons.reduce(0) { $0 + ($1.episodes?.count ?? 0) }
        return count > 0 ? count : nil
    }

    /// Maps an Anizium anime onto the app's shared `Media` model so every
    /// provider-driven screen (Home, Browse, Search, Detail) renders it with the
    /// existing, untouched card views.
    func toMedia() -> Media {
        let fallbackID = Media.localId(forKey: "anizium|\(ID)")
        return Media(
            id: numericID ?? fallbackID,
            idMal: nil,
            provider: .anizium,
            title: MediaTitle(romaji: nameJp, english: name, native: nameJp),
            coverImage: MediaCoverImage(large: poster ?? banner, extraLarge: poster ?? banner),
            bannerImage: banner ?? detailsBanner,
            description: overview ?? overviewShort,
            episodes: totalEpisodeCount,
            status: status,
            averageScore: imdbPoint.map { Int(($0 * 10).rounded()) },
            genres: genre,
            season: nil,
            seasonYear: releaseYear,
            nextAiringEpisode: nil,
            relations: nil,
            type: "ANIME",
            format: (type == "movie") ? "MOVIE" : "TV"
        )
    }
}

extension AniziumEpisode {
    var numericID: Int? { Int(ID) }

    /// A recently added episode becomes a `Media` pointing at its parent show,
    /// so tapping the card opens the same detail page as everywhere else.
    func toMedia() -> Media {
        let fallbackID = Media.localId(forKey: "anizium|\(ID)")
        return Media(
            id: numericID ?? fallbackID,
            idMal: nil,
            provider: .anizium,
            title: MediaTitle(romaji: nil, english: name, native: nil),
            coverImage: MediaCoverImage(large: poster ?? banner, extraLarge: poster ?? banner),
            bannerImage: banner,
            description: overview,
            episodes: nil,
            status: nil,
            averageScore: nil,
            genres: nil,
            season: nil,
            seasonYear: nil,
            nextAiringEpisode: nil,
            relations: nil,
            type: "ANIME",
            format: nil
        )
    }
}
