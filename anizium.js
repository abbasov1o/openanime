var API_HOST = "https://api.anizium.co";
var TOKEN_KEY = "hlxjl1c2w281ax473rt1ofgrvhyjvi";
var CLIENT_KEY = "16ghkdz5qnwinkyebwopbd94b49xhs";
var DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
var ANIME_CACHE = {};

function xorHex(data, key) {
    var out = "";
    for (var i = 0; i < data.length; i++) {
        var x = (data.charCodeAt(i) ^ key.charCodeAt(i % key.length)).toString(16);
        if (x.length < 2) x = "0" + x;
        out += x;
    }
    return out;
}

function makeToken() {
    var dayIdx = new Date(Date.now() + 3 * 3600000).getUTCDay();
    var key = TOKEN_KEY + "_" + DAY_NAMES[dayIdx];
    var rnd = "";
    for (var i = 0; i < 6; i++) rnd += (Math.random() + 1).toString(36)[2];
    var payload = {};
    for (var j = 0; j < rnd.length; j++) payload[String(j)] = rnd.charAt(j);
    return xorHex(JSON.stringify(payload), key);
}

function apiHeaders() {
    return {
        "Accept": "application/json",
        "Cf-Control": makeToken(),
        "User-Agent": "Mozilla/5.0",
        "device": "browser",
        "language": "tr",
        "site": "main"
    };
}

function apiGet(url) {
    return Promise.resolve(fetchv2(url, apiHeaders())).then(function(resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
    });
}

function parseAnimeId(url) {
    var m = (url || "").match(/\/(?:anime|watch)\/(\d+)/);
    return m ? m[1] : (url || "").replace(/^\/+|\/+$/g, "");
}

function parseWatchParams(url) {
    var ms = (url || "").match(/[?&]season=(\d+)/);
    var me = (url || "").match(/[?&]episode=(\d+)/);
    return {
        season: ms ? parseInt(ms[1], 10) : null,
        episode: me ? parseInt(me[1], 10) : null
    };
}

function loadAnime(id) {
    if (ANIME_CACHE[id]) return Promise.resolve(ANIME_CACHE[id]);
    return apiGet(API_HOST + "/anime/get?id=" + encodeURIComponent(id)).then(function(j) {
        if (!j || !j.success || !j.data) throw new Error("anime not found");
        ANIME_CACHE[id] = j.data;
        return j.data;
    });
}

function searchResults(keyword) {
    var kw = (keyword || "").toString().trim();
    var urls;
    if (kw) {
        urls = [
            API_HOST + "/page/search?value=" + encodeURIComponent(kw) + "&page=1",
            API_HOST + "/page/search?value=" + encodeURIComponent(kw) + "&page=2"
        ];
    } else {
        urls = [
            API_HOST + "/page/top?platform=favorite&page=1",
            API_HOST + "/page/top?platform=favorite&page=2",
            API_HOST + "/page/top?platform=favorite&page=3"
        ];
    }
    return Promise.all(urls.map(function(u) {
        return apiGet(u).catch(function() { return null; });
    })).then(function(results) {
        var items = [];
        var seen = {};
        for (var r = 0; r < results.length; r++) {
            var j = results[r];
            if (!j || !j.success || !j.page || !j.page.data) continue;
            var list = j.page.data;
            for (var i = 0; i < list.length; i++) {
                var a = list[i];
                if (!a || !a.ID || seen[a.ID]) continue;
                seen[a.ID] = true;
                items.push({
                    title: a.name || a.ID,
                    image: a.poster || a.banner || "",
                    href: "https://anizium.co/anime/" + a.ID
                });
            }
        }
        return JSON.stringify(items);
    }).catch(function() { return JSON.stringify([]); });
}

function extractDetails(url) {
    var id = parseAnimeId(url);
    return loadAnime(id).then(function(a) {
        var aliases = [];
        if (a.name_tr && a.name_tr !== a.name) aliases.push(a.name_tr);
        if (a.name_jp) aliases.push(a.name_jp);
        return JSON.stringify([{
            description: a.overview || a.overview_short || "",
            aliases: aliases.join(", "),
            airdate: a.release_year ? String(a.release_year) : ""
        }]);
    }).catch(function() { return JSON.stringify([{ description: "", aliases: "", airdate: "" }]); });
}

function extractEpisodes(url) {
    var id = parseAnimeId(url);
    return loadAnime(id).then(function(a) {
        var episodes = [];
        var seasons = a.seasons || [];
        for (var s = 0; s < seasons.length; s++) {
            var season = seasons[s];
            var sn = season.number || (s + 1);
            var eps = season.episodes || [];
            for (var e = 0; e < eps.length; e++) {
                var en = eps[e].number || (e + 1);
                episodes.push({
                    href: "https://anizium.co/watch/" + id + "?season=" + sn + "&episode=" + en,
                    number: sn > 1 ? (sn - 1) * 1000 + en : en
                });
            }
        }
        if (episodes.length === 0) {
            episodes.push({ href: "https://anizium.co/watch/" + id, number: 1 });
        }
        return JSON.stringify(episodes);
    }).catch(function() { return JSON.stringify([]); });
}

function extractStreamUrl(episodeUrl) {
    if (!episodeUrl) return Promise.resolve(JSON.stringify({ streams: [], subtitle: "" }));
    var id = parseAnimeId(episodeUrl);
    var wp = parseWatchParams(episodeUrl);
    var srcUrl = API_HOST + "/anime/source?id=" + encodeURIComponent(id) +
        "&site=main&plan=&server=1";
    if (wp.season !== null && wp.episode !== null) {
        srcUrl += "&season=" + wp.season + "&episode=" + wp.episode;
    }
    return apiGet(srcUrl).then(function(j) {
        if (!j || !j.success) return { streams: [], subtitle: "" };
        var streams = [];
        var groups = j.groups || [];
        for (var g = 0; g < groups.length; g++) {
            var group = groups[g];
            var items = group.items || [];
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (!item.link) continue;
                streams.push({
                    streamUrl: item.link,
                    title: (group.name ? group.name + " - " : "") + (item.quality ? item.quality + "p" : "Video"),
                    headers: {}
                });
            }
        }
        var subtitle = "";
        var subs = j.subtitles || [];
        for (var t = 0; t < subs.length; t++) {
            if (subs[t].link && subs[t].group === "tr") {
                subtitle = subs[t].link;
                break;
            }
        }
        if (!subtitle && subs.length > 0 && subs[0].link) subtitle = subs[0].link;
        if (streams.length === 0) {
            streams.push({ streamUrl: episodeUrl, title: "Anizium", headers: {} });
        }
        return { streams: streams, subtitle: subtitle };
    }).catch(function() {
        return { streams: [], subtitle: "" };
    }).then(function(result) {
        return JSON.stringify(result);
    });
}
