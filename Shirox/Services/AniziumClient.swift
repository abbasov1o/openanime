import Foundation

/// Thin HTTP layer for api.anizium.co. Adds the headers every request needs
/// (`Cf-Control` day-token, device/language/site, account session headers) and
/// turns the API's `{ isError, msg }` failures into `AniziumError.api`.
enum AniziumClient {
    static let baseURL = URL(string: "https://api.anizium.co")!

    /// Account headers supplied by `AniziumAuthManager` for endpoints that
    /// require a session, a profile, or both.
    struct SessionContext: Sendable {
        var session: String?
        var profileId: String?

        /// Reads the stored session/profile. MainActor because it consults the
        /// auth manager; build it from a signed-in context (providers, views).
        @MainActor static var current: SessionContext {
            SessionContext(
                session: AniziumAuthManager.shared.sessionToken,
                profileId: AniziumAuthManager.shared.storedProfileID
            )
        }

        static var anonymous: SessionContext {
            SessionContext(session: nil, profileId: nil)
        }
    }

    // MARK: - Request core

    private static func makeRequest(path: String,
                                    query: [String: String],
                                    method: String,
                                    body: Data?,
                                    session: SessionContext) -> URLRequest? {
        guard var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false) else {
            return nil
        }
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.httpBody = body

        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(AniziumCrypto.controlToken(), forHTTPHeaderField: "Cf-Control")
        request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", forHTTPHeaderField: "User-Agent")
        request.setValue("browser", forHTTPHeaderField: "device")
        request.setValue("tr", forHTTPHeaderField: "language")
        request.setValue("main", forHTTPHeaderField: "site")
        request.setValue(session.session ?? "", forHTTPHeaderField: "user-session")
        request.setValue(session.profileId ?? "", forHTTPHeaderField: "user-profile")
        if body != nil {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return request
    }

    static func request(path: String,
                        query: [String: String] = [:],
                        method: String = "GET",
                        body: [String: Any]? = nil,
                        encrypted: Bool = false,
                        session: SessionContext) async throws -> Data {
        let payload: Data?
        if let body {
            let json: [String: Any] = encrypted ? ["d": AniziumCrypto.encryptedBody(body)] : body
            payload = try? JSONSerialization.data(withJSONObject: json)
        } else {
            payload = nil
        }
        guard let request = makeRequest(path: path, query: query, method: method, body: payload, session: session) else {
            throw AniziumError.notFound
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw AniziumError.network(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw AniziumError.network(URLError(.badServerResponse))
        }
        guard (200..<300).contains(http.statusCode) else {
            if let message = decodeErrorMessage(from: data) {
                throw AniziumError.api(message)
            }
            throw AniziumError.http(http.statusCode)
        }
        return data
    }

    // MARK: - Typed helpers

    static func get<T: Decodable>(_ type: T.Type,
                                 path: String,
                                 query: [String: String] = [:],
                                 session: SessionContext) async throws -> T {
        let data = try await request(path: path, query: query, session: session)
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw AniziumError.decoding(error)
        }
    }

    static func post<T: Decodable>(_ type: T.Type,
                                   path: String,
                                   query: [String: String] = [:],
                                   body: [String: Any],
                                   encrypted: Bool = false,
                                   session: SessionContext) async throws -> T {
        let data = try await request(path: path, query: query, method: "POST", body: body, encrypted: encrypted, session: session)
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw AniziumError.decoding(error)
        }
    }

    // MARK: - Error extraction

    /// The API reports failures as `{"isError": true, "msg": "…"}` with a 4xx
    /// status; surface that message instead of a bare status code.
    private static func decodeErrorMessage(from data: Data) -> String? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        if let isError = object["isError"] as? Bool, isError, let message = object["msg"] as? String {
            return message
        }
        if let success = object["success"] as? Bool, !success, let message = object["msg"] as? String {
            return message
        }
        return nil
    }
}
