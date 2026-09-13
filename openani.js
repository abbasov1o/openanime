var CACHE = {};
var HOME_ANIMES = null;
var DETAIL_CACHE = {};

function fetchHTML(url) {
    return Promise.resolve(fetchv2(url)).then(function(resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.text();
    });
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

function resolveRef(nodes, ref) {
    if (typeof ref === "number" && ref >= 0 && ref < nodes.length) {
        var val = nodes[ref];
        if (typeof val === "string") return val;
        if (typeof val === "number" && val >= 0 && val < nodes.length) return nodes[val];
    }
    return ref;
}

function loadFullAnimeList() {
    if (HOME_ANIMES) return Promise.resolve(HOME_ANIMES);
    return fetchHTML("https://openani.me/__data.json").then(function(text) {
        var data = JSON.parse(text);
        var flat = data.nodes[0].data;
        var root = flat[0];
        var animeRefs = flat[root.popularAnimes] || flat[root.animes];
        if (!animeRefs || !animeRefs.length) throw new Error("No animes in data");
        var result = [];
        for (var i = 0; i < animeRefs.length; i++) {
            var ref = animeRefs[i];
            var anime = flat[ref];
            if (!anime || typeof anime !== "object") continue;
            var slug = resolveRef(flat, anime.slug);
            if (!slug || typeof slug !== "string") continue;
            var title = resolveRef(flat, anime.turkish);
            var avatar = "";
            if (anime.pictures !== undefined && typeof anime.pictures === "number" && anime.pictures >= 0) {
                var pics = flat[anime.pictures];
                if (pics && typeof pics === "object") {
                    var poster = resolveRef(flat, pics.poster);
                    var banner = resolveRef(flat, pics.banner);
                    var av = resolveRef(flat, pics.avatar);
                    avatar = (typeof poster === "string" ? poster : "") || (typeof av === "string" ? av : "") || (typeof banner === "string" ? banner : "");
                }
            }
            if (typeof title !== "string") title = slug;
            if (typeof avatar !== "string") avatar = "";
            result.push({ slug: slug, title: title, avatar: avatar });
        }
        var cdnHostRef = root.random_cdn_host;
        if (typeof cdnHostRef === "number" && cdnHostRef >= 0) {
            CACHE.cdnHost = flat[cdnHostRef];
        }
        HOME_ANIMES = result;
        return result;
    }).catch(function() {
        return loadHomeAnimes();
    });
}

function loadHomeAnimes() {
    if (HOME_ANIMES) return Promise.resolve(HOME_ANIMES);
    return fetchHTML("https://openani.me").then(function(html) {
        var result = [];
        var slugRegex = /slug:"([^"]+)"/g;
        var slugMatch;
        var slugs = [];
        while ((slugMatch = slugRegex.exec(html)) !== null) {
            var s = slugMatch[1];
            if (s && slugs.indexOf(s) === -1) slugs.push(s);
        }
        var turkishRegex = /turkish:"([^"]*)"/g;
        var turkishMatch;
        var turkishList = [];
        while ((turkishMatch = turkishRegex.exec(html)) !== null) {
            turkishList.push(turkishMatch[1] || "");
        }
        var avatarRegex = /avatar:"(https:\/\/image\.tmdb\.org\/[^"]+)"/g;
        var avatarMatch;
        var avatarList = [];
        while ((avatarMatch = avatarRegex.exec(html)) !== null) {
            avatarList.push(avatarMatch[1]);
        }
        for (var i = 0; i < slugs.length; i++) {
            result.push({
                slug: slugs[i],
                title: turkishList[i] || slugs[i],
                avatar: avatarList[i] || ""
            });
        }
        var cdnMatch = /random_cdn_host:"([^"]+)"/.exec(html);
        if (cdnMatch) CACHE.cdnHost = cdnMatch[1];
        HOME_ANIMES = result;
        return result;
    });
}

function searchResults(keyword) {
    return loadFullAnimeList().then(function(animes) {
        var q = (keyword || "").toString().toLowerCase().trim();
        var results = q ? [] : animes;
        if (q) {
            for (var i = 0; i < animes.length; i++) {
                var a = animes[i];
                var t = (a.title || a.slug || "").toLowerCase();
                var s = (a.slug || "").toLowerCase();
                if (t.indexOf(q) !== -1 || s.indexOf(q) !== -1) results.push(a);
            }
        }
        var items = [];
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            items.push({ title: r.title || r.slug, image: r.avatar || "", href: r.slug });
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
                        return JSON.stringify([{
                            description: "",
                            aliases: "",
                            airdate: ""
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
            return loadHomeAnimes().then(function() {
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
        var cdnMatch = /CDN_LINK:"([^"]+)"/.exec(html);
        if (!cdnMatch) return JSON.stringify({ streams: [], subtitle: "" });
        var cdnBase = cdnMatch[1].replace(/\/+$/, "");
        var filesRegex = /files:\[([^\]]+)\]/g;
        var fm = filesRegex.exec(html);
        var files = [];
        if (fm) {
            var fileMatch = /file:"([^"]+)"/g;
            var resMatch = /resolution:(\d+)/g;
            var fms, rms;
            while ((fms = fileMatch.exec(fm[1])) !== null && (rms = resMatch.exec(fm[1])) !== null) {
                files.push({ file: fms[1], resolution: parseInt(rms[1], 10) });
            }
        }
        if (files.length === 0) {
            var fSingle = /file:"([^"]+)"/.exec(html);
            var rSingle = /resolution:(\d+)/.exec(html);
            if (fSingle) {
                files.push({ file: fSingle[1], resolution: rSingle ? parseInt(rSingle[1], 10) : 720 });
            }
        }
        var fansubsRegex = /fansubs:\[([\s\S]*?)\],"/;
        var fansubMatch = fansubsRegex.exec(html);
        var fansubs = [];
        if (fansubMatch) {
            var fnRegex = /name:"([^"]+)"/g;
            var fiRegex = /id:"(\d+)"/g;
            var fnm, fim;
            while ((fnm = fnRegex.exec(fansubMatch[1])) !== null && (fim = fiRegex.exec(fansubMatch[1])) !== null) {
                fansubs.push({ name: fnm[1], id: fim[1] });
            }
        }
        var streams = [];
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var title = f.resolution + "p";
            for (var j = 0; j < fansubs.length; j++) {
                if (fansubs[j].id && f.file.indexOf(fansubs[j].id) !== -1) {
                    title = fansubs[j].name + " - " + title;
                    break;
                }
            }
            var url = cdnBase + "/" + slug + "/" + seasonNum + "/" + f.file + "?big=1";
            streams.push({ streamUrl: url, title: title, headers: {} });
        }
        if (streams.length === 0) {
            streams.push({ streamUrl: pageUrl, title: "OpenAnime", headers: {} });
        }
        return JSON.stringify({ streams: streams, subtitle: "" });
    }).catch(function() {
        return JSON.stringify({ streams: [], subtitle: "" });
    });
}