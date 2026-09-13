var CACHE = {};
var HOME_ANIMES = null;
var DETAIL_CACHE = {};

function fetchHTML(url) {
    return Promise.resolve(fetchv2(url)).then(function(resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.text();
    });
}

function balancedExtract(html, startMarker) {
    var pos = html.indexOf(startMarker);
    if (pos === -1) return null;
    pos += startMarker.length;
    var depth = 0, start = -1, end = -1;
    for (var i = pos; i < html.length; i++) {
        if (html[i] === '[' || html[i] === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (html[i] === ']' || html[i] === '}') {
            depth--;
            if (depth === 0) { end = i + 1; break; }
        }
    }
    if (start === -1 || end === -1) return null;
    var str = html.substring(start, end).replace(/void 0/g, "null");
    try { return JSON.parse(str); } catch (e) { return null; }
}

function loadHomeAnimes() {
    if (HOME_ANIMES) return Promise.resolve(HOME_ANIMES);
    return fetchHTML("https://openani.me").then(function(html) {
        var dataArray = balancedExtract(html, "const data = ");
        var animes = [];
        if (dataArray && dataArray[0] && dataArray[0].data) {
            if (dataArray[0].data.animes) animes = animes.concat(dataArray[0].data.animes);
            if (dataArray[0].data.popularAnimes) animes = animes.concat(dataArray[0].data.popularAnimes);
            if (dataArray[0].data.random_cdn_host) CACHE.cdnHost = dataArray[0].data.random_cdn_host;
        }
        var seen = {}, unique = [];
        for (var i = 0; i < animes.length; i++) {
            var a = animes[i], key = a.slug || a._id || a.id || "";
            if (!seen[key]) { seen[key] = true; unique.push(a); }
        }
        HOME_ANIMES = unique;
        return unique;
    });
}

function getDisplayTitle(a) {
    return a.turkish || a.romaji || a.english || "";
}

function getImage(a) {
    if (a.pictures && a.pictures.avatar) return a.pictures.avatar;
    if (a.avatar) return a.avatar;
    return "";
}

function parseSlug(url) {
    if (url.indexOf("openani.me/anime/") !== -1) {
        var parts = url.split("/anime/");
        var after = parts[parts.length - 1];
        return after.split("/")[0].split("?")[0].split("#")[0];
    }
    return url.replace(/^\/+/, "").split("/")[0];
}

function parseSeasonEpisode(url) {
    var match = url.match(/\/anime\/[^/]+\/(\d+)\/(\d+)/);
    if (match) return { season: parseInt(match[1], 10), episode: parseInt(match[2], 10) };
    match = url.match(/bolum-(\d+)/);
    if (match) return { season: 1, episode: parseInt(match[1], 10) };
    return { season: 1, episode: 1 };
}

function searchResults(keyword) {
    return loadHomeAnimes().then(function(animes) {
        var q = (keyword || "").toString().toLowerCase().trim();
        var results = q ? [] : animes;
        if (q) {
            for (var i = 0; i < animes.length; i++) {
                var a = animes[i];
                var title = (a.turkish || a.romaji || a.english || "").toLowerCase();
                var s = (a.slug || "").toLowerCase();
                var orig = (a.originalName || "").toLowerCase();
                var jp = (a.japanese || "").toLowerCase();
                if (title.indexOf(q) !== -1 || s.indexOf(q) !== -1 || orig.indexOf(q) !== -1 || jp.indexOf(q) !== -1) {
                    results.push(a);
                }
            }
        }
        var items = [];
        for (var i = 0; i < results.length; i++) {
            var a = results[i], s = a.slug || "";
            if (!s) continue;
            items.push({ title: getDisplayTitle(a), image: getImage(a), href: s });
        }
        return JSON.stringify(items);
    }).catch(function() { return JSON.stringify([]); });
}

function extractDetails(url) {
    var slug = parseSlug(url);
    if (DETAIL_CACHE[slug]) {
        var c = DETAIL_CACHE[slug];
        return Promise.resolve(JSON.stringify([{
            description: c.summary || "",
            aliases: [c.romaji, c.english, c.japanese].filter(Boolean).join(", "),
            airdate: c.firstAirDate || ""
        }]));
    }
    return fetchHTML("https://openani.me/anime/" + slug).then(function(html) {
        var m = html.match(/<script\s+type="application\/json"[^>]*data-url="https:\/\/api\.openani\.me\/anime\/[^"]*"[^>]*>([\s\S]*?)<\/script>/);
        if (!m) {
            return loadHomeAnimes().then(function(animes) {
                for (var i = 0; i < animes.length; i++) {
                    if (animes[i].slug === slug) {
                        var a = animes[i];
                        return JSON.stringify([{
                            description: a.summary || "",
                            aliases: [a.romaji, a.english, a.japanese].filter(Boolean).join(", "),
                            airdate: a.firstAirDate || ""
                        }]);
                    }
                }
                return JSON.stringify([{ description: "", aliases: "", airdate: "" }]);
            });
        }
        var body = JSON.parse(JSON.parse(m[1]).body);
        DETAIL_CACHE[slug] = body;
        return JSON.stringify([{
            description: body.summary || "",
            aliases: [body.romaji, body.english, body.japanese].filter(Boolean).join(", "),
            airdate: body.firstAirDate || ""
        }]);
    }).catch(function() { return JSON.stringify([{ description: "", aliases: "", airdate: "" }]); });
}

function extractEpisodes(url) {
    var slug = parseSlug(url);
    function buildEpisodes(animeData) {
        var episodes = [], s = animeData.slug || slug;
        if (animeData.seasons) {
            animeData.seasons.forEach(function(season) {
                if (season.hasEpisode && season.episode_count && season.episode_count > 0) {
                    var count = season.episode_count, sn = season.season_number || 1;
                    for (var i = 1; i <= count; i++) {
                        episodes.push({
                            href: "https://openani.me/anime/" + s + "/" + sn + "/" + i,
                            number: sn > 1 ? (sn - 1) * 1000 + i : i
                        });
                    }
                }
            });
        }
        if (episodes.length === 0 && animeData.numberOfEpisodes && animeData.numberOfEpisodes > 0) {
            for (var j = 1; j <= animeData.numberOfEpisodes; j++) {
                episodes.push({
                    href: "https://openani.me/anime/" + s + "/1/" + j,
                    number: j
                });
            }
        }
        return episodes;
    }
    if (DETAIL_CACHE[slug]) return Promise.resolve(JSON.stringify(buildEpisodes(DETAIL_CACHE[slug])));
    return fetchHTML("https://openani.me/anime/" + slug).then(function(html) {
        var m = html.match(/<script\s+type="application\/json"[^>]*data-url="https:\/\/api\.openani\.me\/anime\/[^"]*"[^>]*>([\s\S]*?)<\/script>/);
        if (!m) {
            return loadHomeAnimes().then(function(animes) {
                for (var i = 0; i < animes.length; i++) {
                    if (animes[i].slug === slug) return JSON.stringify(buildEpisodes(animes[i]));
                }
                return JSON.stringify([]);
            });
        }
        var body = JSON.parse(JSON.parse(m[1]).body);
        DETAIL_CACHE[slug] = body;
        return JSON.stringify(buildEpisodes(body));
    }).catch(function() { return JSON.stringify([]); });
}

function extractStreamUrl(episodeUrl) {
    if (!episodeUrl) return Promise.resolve(JSON.stringify({ streams: [], subtitle: "" }));
    var slug = parseSlug(episodeUrl);
    var se = parseSeasonEpisode(episodeUrl);
    var seasonNum = se.season;
    var epNum = se.episode;
    var pageUrl = "https://openani.me/anime/" + slug + "/" + seasonNum + "/" + epNum;
    return fetchHTML(pageUrl).then(function(html) {
        var dataArray = balancedExtract(html, "const data = ");
        if (!dataArray || dataArray.length < 2) return JSON.stringify({ streams: [], subtitle: "" });
        var d = dataArray[1];
        if (!d || !d.data || !d.data.requestResponse) return JSON.stringify({ streams: [], subtitle: "" });
        var rr = d.data.requestResponse;
        var cdnBase = rr.CDN_LINK || rr.DOWNLOAD_LINK || "";
        if (!cdnBase) return JSON.stringify({ streams: [], subtitle: "" });
        cdnBase = cdnBase.replace(/\/+$/, "");
        var files = (rr.episodeData && rr.episodeData.files) ? rr.episodeData.files : [];
        var fansubs = (rr.episodeData && rr.episodeData.fansubs) ? rr.episodeData.fansubs : [];
        var streams = [];
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var res = f.resolution || "720";
            var fanName = "";
            for (var j = 0; j < fansubs.length; j++) {
                if (fansubs[j].id && f.file.indexOf(fansubs[j].id) !== -1) {
                    fanName = fansubs[j].name;
                    break;
                }
            }
            var title = res + "p";
            if (fanName) title = fanName + " - " + title;
            var url = cdnBase + "/" + slug + "/" + seasonNum + "/" + f.file + "?big=1";
            streams.push({ streamUrl: url, title: title, headers: {} });
        }
        if (streams.length === 0) {
            streams.push({
                streamUrl: pageUrl,
                title: "OpenAnime",
                headers: {}
            });
        }
        var sub = "";
        if (rr.episodeData && rr.episodeData.fansub) {
            sub = rr.episodeData.fansub.website || rr.episodeData.fansub.name || "";
        }
        return JSON.stringify({ streams: streams, subtitle: sub });
    }).catch(function(e) {
        return JSON.stringify({ streams: [], subtitle: "" });
    });
}