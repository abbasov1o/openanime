import Foundation

/// The request-signing scheme Anizium's API expects, reverse-engineered from the
/// site's own bundle:
///
/// - `Cf-Control` header: the XOR-hex of a six-random-character payload, keyed
///   with `TOKEN_KEY_<weekday>` where the weekday is Istanbul local time.
/// - Encrypted request bodies: the JSON body plus a `date` timestamp, XOR-hexed
///   with the static `CLIENT_KEY`, and sent as `{"d": "<hex>"}`.
enum AniziumCrypto {
    static let tokenKey = "hlxjl1c2w281ax473rt1ofgrvhyjvi"
    static let clientKey = "16ghkdz5qnwinkyebwopbd94b49xhs"

    private static let dayNames = [
        "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
    ]

    /// XOR-hex encoding over UTF-8 bytes, the encoding both the token and the
    /// encrypted bodies use.
    static func xorHex(_ string: String, key: String) -> String {
        let bytes = Array(string.utf8)
        let keyBytes = Array(key.utf8)
        var hex = ""
        hex.reserveCapacity(bytes.count * 2)
        for (index, byte) in bytes.enumerated() {
            let xored = byte ^ keyBytes[index % keyBytes.count]
            hex += String(format: "%02x", xored)
        }
        return hex
    }

    /// The site resolves the weekday in Europe/Istanbul; the API's token check
    /// does the same, so an offset from UTC+3 keeps both sides in agreement.
    private static func istanbulWeekday() -> String {
        let shifted = Date(timeIntervalSinceNow: 3 * 3600)
        let day = Calendar(identifier: .gregorian).component(.weekday, from: shifted)
        return dayNames[day - 1]
    }

    /// The `Cf-Control` header value: `xorHex({"0":"x","1":"y",…}, tokenKey_day)`.
    /// The characters are random; the server only validates the day-keyed encoding.
    static func controlToken() -> String {
        let key = "\(tokenKey)_\(istanbulWeekday())"
        let alphabet = Array("abcdefghijklmnopqrstuvwxyz0123456789")
        var payload = "{"
        for index in 0..<6 {
            let char = alphabet[Int.random(in: 0..<alphabet.count)]
            if index > 0 { payload += "," }
            payload += "\"\(index)\":\"\(char)\""
        }
        payload += "}"
        return xorHex(payload, key: key)
    }

    /// The body of an encrypted request: the payload plus a `date` timestamp,
    /// XOR-hexed with the client key.
    static func encryptedBody(_ payload: [String: Any]) -> String {
        var body = payload
        body["date"] = Int(Date().timeIntervalSince1970 * 1000)
        let data = (try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys]))
            ?? Data("{}".utf8)
        return xorHex(String(data: data, encoding: .utf8) ?? "{}", key: clientKey)
    }
}
