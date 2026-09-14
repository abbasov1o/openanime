var TR_BASE = "https://www.tranimeizle.io";
var TR_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function trHeaders(extra) {
    var h = {
        "User-Agent": TR_UA,
        "Referer": TR_BASE + "/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
    };
    if (extra) {
        for (var k in extra) {
            if (extra.hasOwnProperty(k)) h[k] = extra[k];
        }
    }
    return h;
}

function trGet(url, extra) {
    return Promise.resolve(fetchv2(url, trHeaders(extra))).then(function(resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status + " " + url);
        return resp.text();
    });
}

function trPost(url, body, extra) {
    return Promise.resolve(fetchv2(url, trHeaders(extra), "POST", body)).then(function(resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status + " " + url);
        return resp.text();
    });
}

function trPostJson(url, extra) {
    return Promise.resolve(fetchv2(url, trHeaders(extra), "POST", null)).then(function(resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status + " " + url);
        return resp.json();
    });
}

function decodeEntities(s) {
    return (s || "")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&#(\d+);/g, function(m, d) {
            return String.fromCharCode(parseInt(d, 10));
        });
}

function stripTags(s) {
    return (s || "").replace(/<[^>]*>/g, " ");
}

function cleanText(s) {
    return decodeEntities(stripTags(s)).replace(/\s+/g, " ").trim();
}

function trimIzle(t) {
    t = (t || "").trim();
    if (t.toLowerCase().slice(-3) === "zle") t = t.slice(0, -4).trim();
    return t;
}

function absUrl(h) {
    h = decodeEntities((h || "").trim());
    if (!h) return "";
    if (h.indexOf("//") === 0) return "https:" + h;
    if (h.indexOf("http:") === 0 || h.indexOf("https:") === 0) return h;
    if (h.charAt(0) === "/") return TR_BASE + h;
    return TR_BASE + "/" + h;
}

function eachTag(html, classWord, cb) {
    var re = /<([a-z0-9]+)\b([^>]*)>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var attrs = m[2] || "";
        var cls = attrs.match(/class\s*=\s*"([^"]*)"/i);
        if (!cls) cls = attrs.match(/class\s*=\s*'([^']*)'/i);
        if (cls && (" " + cls[1] + " ").indexOf(" " + classWord + " ") !== -1) {
            cb(attrs, m.index + m[0].length);
        }
    }
}

function attrOf(attrs, name) {
    var m = attrs.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', "i"));
    if (!m) m = attrs.match(new RegExp(name + "\\s*=\\s*'([^']*)'", "i"));
    return m ? m[1] : null;
}

function diagnose(html, errText) {
    var h = html || "";
    var low = h.toLowerCase();
    function flag(w) { return low.indexOf(w) !== -1 ? "1" : "0"; }
    var cards = [];
    function add(t) {
        cards.push({ title: t, image: "", href: TR_BASE + "/" });
    }
    if (errText) {
        add("D1 ERR " + String(errText).slice(0, 70));
        add("D2 len=" + h.length);
        return cards;
    }
    add("D1 len=" + h.length);
    add("D2 news=" + flag("news-image") + " flx=" + flag("flx-block"));
    add("D3 jm=" + flag("just a moment") + " cf=" + flag("challenge-platform"));
    add("D4 empty=" + flag("bulunamad") + " form=" + flag("<form"));
    add("D5: " + cleanText(h.slice(0, 300)).slice(0, 60));
    return cards;
}

function errText(e) {
    if (e && e.message) return e.message;
    if (typeof e === "string") return e;
    return "fetch failed";
}

function parseCards(html) {
    var items = [];
    var seen = {};
    eachTag(html, "news-image", function(attrs, pos) {
        var href = absUrl(attrOf(attrs, "href"));
        if (!href || seen[href]) return;
        var inner = html.slice(pos, pos + 1500);
        var endA = inner.toLowerCase().indexOf("</a>");
        if (endA !== -1) inner = inner.slice(0, endA);
        var img = "";
        var imgM = inner.match(/<img[^>]*\ssrc\s*=\s*"([^"]*)"/i);
        if (!imgM) imgM = inner.match(/<img[^>]*\sdata-src\s*=\s*"([^"]*)"/i);
        if (imgM) img = absUrl(imgM[1]);
        var after = html.slice(pos, pos + 900);
        var h4M = after.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
        var title = h4M ? cleanText(h4M[1]) : "";
        if (!title) {
            var parts = href.split("/").filter(Boolean);
            var slug = parts.length ? parts[parts.length - 1] : "";
            slug = slug.replace(/-bolum-izle.*$/i, "").replace(/-izle.*$/i, "");
            title = slug.replace(/-/g, " ");
        }
        title = trimIzle(title);
        if (!title) title = "Bilinmeyen";
        seen[href] = true;
        items.push({ title: title, image: img, href: href });
    });
    return items;
}

function buildQueryCandidates(kw) {
    var list = [];
    function add(q) {
        q = (q || "").replace(/\s+/g, " ").trim();
        if (q && list.indexOf(q) === -1) list.push(q);
    }
    add(kw);
    if (!kw) return list;
    var noise = new RegExp("\\b(season|sezon|b[o\\u00f6]l[u\\u00fc]m|bolum|episode|part|cour|izle|watch|t[u\\u00fc]rk[c\\u00e7]e|dublaj|altyaz|hd|4k|1080p|720p|online|full|anime|tv|movie|film)\\b", "gi");
    var cleaned = kw.replace(noise, " ").replace(/[^\w\s\u00c0-\u024f]/g, " ").replace(/\s+/g, " ").trim();
    add(cleaned);
    var noDigits = cleaned.replace(/\s+\d+([._]?\d+)?\s*$/, "").trim();
    add(noDigits);
    var words = cleaned.split(" ");
    while (words.length > 2 && list.length < 6) {
        words.pop();
        add(words.join(" "));
    }
    return list;
}

function searchResults(keyword) {
    var kw = (keyword || "").toString().replace(/\s+/g, " ").trim();
    if (!kw) {
        return trGet(TR_BASE + "/").then(function(html) {
            var items = parseCards(html);
            if (items.length === 0) items = diagnose(html);
            return JSON.stringify(items);
        }).catch(function(e) {
            return JSON.stringify(diagnose("", errText(e)));
        });
    }
    var candidates = buildQueryCandidates(kw);
    var all = [];
    var seen = {};
    var firstHtml = "";
    var firstErr = "";
    function tryNext(i) {
        if (i >= candidates.length || all.length >= 20) return Promise.resolve(null);
        return trGet(TR_BASE + "/arama/" + encodeURIComponent(candidates[i])).then(function(html) {
            if (i === 0) firstHtml = html;
            var items = parseCards(html);
            for (var k = 0; k < items.length; k++) {
                if (seen[items[k].href]) continue;
                seen[items[k].href] = true;
                all.push(items[k]);
            }
            if (items.length > 0) return Promise.resolve(null);
            return tryNext(i + 1);
        }).catch(function(e) {
            if (i === 0) firstErr = errText(e);
            return tryNext(i + 1);
        });
    }
    return tryNext(0).then(function() {
        if (all.length > 0) return JSON.stringify(all);
        return JSON.stringify(diagnose(firstHtml, firstErr));
    });
}

function extractDetails(url) {
    if (!url) return Promise.resolve(JSON.stringify([{ description: "", aliases: "", airdate: "" }]));
    return trGet(url).then(function(html) {
        var titleM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        var title = titleM ? trimIzle(cleanText(titleM[1])) : "";
        var desc = "";
        var artM = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (artM) desc = cleanText(artM[1]);
        if (desc.toLowerCase().indexOf("anime konusu") === 0) {
            desc = desc.slice(12).replace(/^[\s:;\-]+/, "").trim();
        }
        var air = "";
        var yM = html.match(/yap\u0131m[^0-9]{0,60}((?:19|20)\d{2})/i);
        if (yM) air = yM[1];
        var aliases = "";
        var parts = (url || "").split("/").filter(Boolean);
        if (parts.length) {
            var slug = parts[parts.length - 1].split("?")[0];
            slug = slug.replace(/-bolum-izle.*$/i, "").replace(/-izle.*$/i, "");
            aliases = slug.replace(/-/g, " ");
        }
        return JSON.stringify([{
            description: desc,
            aliases: aliases,
            airdate: air
        }]);
    }).catch(function() {
        return JSON.stringify([{ description: "", aliases: "", airdate: "" }]);
    });
}

function extractEpisodes(url) {
    if (!url) return Promise.resolve(JSON.stringify([]));
    return trGet(url).then(function(html) {
        var eps = [];
        var seen = {};
        var re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            var attrs = m[1];
            var inner = m[2];
            var hrefRaw = attrOf(attrs, "href");
            if (!hrefRaw) continue;
            if (hrefRaw.toLowerCase().indexOf("-bolum-izle") === -1) continue;
            var href = absUrl(hrefRaw);
            if (!href || seen[href]) continue;
            var epText = "";
            var etM = inner.match(/class\s*=\s*"[^"]*etitle[^"]*"[^>]*>([\s\S]*?)<\//i);
            if (etM) epText = cleanText(etM[1]);
            if (!epText) epText = cleanText(inner);
            var season = 0;
            var ep = 0;
            var sM = epText.match(/(\d+)\s*\.\s*sezon/i);
            if (sM) season = parseInt(sM[1], 10);
            if (!season) {
                var hsM = href.match(/(\d+)-sezon(?:-|\/|$)/i);
                if (!hsM) hsM = href.match(/sezon-(\d+)(?:-|\/|$)/i);
                if (hsM) season = parseInt(hsM[1], 10);
            }
            if (!season) season = 1;
            var eM = epText.match(/(\d+(?:[.,]\d+)?)\s*\.\s*b\u00f6l\u00fcm/i);
            if (eM) ep = parseFloat(eM[1].replace(",", "."));
            if (!ep) {
                var heM = href.match(/(\d+)-bolum-izle/i);
                if (heM) ep = parseInt(heM[1], 10);
            }
            if (!ep) ep = 1;
            seen[href] = true;
            eps.push({
                href: href,
                number: (season - 1) * 1000 + Math.floor(ep)
            });
        }
        eps.sort(function(a, b) { return a.number - b.number; });
        return JSON.stringify(eps);
    }).catch(function() {
        return JSON.stringify([]);
    });
}

function originOf(u) {
    var m = (u || "").match(/^(https?:\/\/[^\/]+)/i);
    return m ? m[1] : "";
}

function unescapeUrl(u) {
    return (u || "")
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/")
        .replace(/&amp;/g, "&");
}

function resolveEmbed(embedUrl, watchUrl) {
    var fallback = {
        url: embedUrl,
        headers: { "Referer": watchUrl, "User-Agent": TR_UA }
    };
    return trGet(embedUrl, {
        "Referer": watchUrl,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }).then(function(eh) {
        var found = [];
        var seenU = {};
        var pats = [
            /file\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
            /source\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
            /["'](https?:\/\/[^"']*\.m3u8[^"']*)["']/gi,
            /<source[^>]*src\s*=\s*"([^"]*\.m3u8[^"]*)"/gi,
            /file\s*:\s*["']([^"']*\.mp4[^"']*)["']/gi,
            /["'](https?:\/\/[^"']*\.mp4[^"']*)["']/gi,
            /<source[^>]*src\s*=\s*"([^"]*\.mp4[^"]*)"/gi,
            /(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/gi,
            /(https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*)/gi
        ];
        for (var p = 0; p < pats.length; p++) {
            var re = pats[p];
            var mm;
            while ((mm = re.exec(eh)) !== null) {
                var u = unescapeUrl(decodeEntities(mm[1])).trim();
                if (u.indexOf("http") !== 0) {
                    var abs = absUrl(u);
                    if (!abs) continue;
                    u = abs;
                }
                if (seenU[u]) continue;
                seenU[u] = true;
                found.push(u);
                if (found.length >= 4) break;
            }
            if (found.length >= 4) break;
        }
        if (found.length === 0) return fallback;
        return {
            url: found[0],
            headers: { "Referer": originOf(embedUrl) || watchUrl, "User-Agent": TR_UA }
        };
    }).catch(function() {
        return fallback;
    });
}

function btnLabel(containerHtml, pos) {
    var seg = containerHtml.slice(pos, pos + 400);
    var pm = seg.match(/class\s*=\s*"[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/p/i);
    if (pm) {
        var lbl = cleanText(pm[1]);
        if (lbl) return lbl;
    }
    var lt = seg.indexOf("<");
    var s2 = lt !== -1 ? seg.slice(0, lt) : seg;
    return cleanText(s2);
}

function extractStreamUrl(episodeUrl) {
    if (!episodeUrl) return Promise.resolve(JSON.stringify({ streams: [], subtitle: "" }));
    return trGet(episodeUrl).then(function(html) {
        var epIdM = html.match(/name\s*=\s*"EpisodeId"[^>]*value\s*=\s*"(\d+)"/i);
        if (!epIdM) epIdM = html.match(/value\s*=\s*"(\d+)"[^>]*name\s*=\s*"EpisodeId"/i);
        if (!epIdM) epIdM = html.match(/id\s*=\s*"EpisodeId"[^>]*value\s*=\s*"(\d+)"/i);
        if (!epIdM) throw new Error("EpisodeId tapilmadi");
        var epId = epIdM[1];

        var fansubs = [];
        var seenF = {};
        eachTag(html, "fansubSelector", function(attrs) {
            var fid = (attrOf(attrs, "data-fid") || "").trim();
            if (!fid || seenF[fid]) return;
            seenF[fid] = true;
            var fad = attrOf(attrs, "data-fad");
            fansubs.push({ id: fid, name: fad ? cleanText(fad) : "" });
        });
        if (fansubs.length === 0) {
            var initM = html.match(/animeWatch\.initialize\(\s*\d+\s*,\s*\d+\s*,\s*(\d+)\s*,/);
            if (initM) fansubs.push({ id: initM[1], name: "" });
        }

        var inlineIds = [];
        var inlineLabels = {};
        eachTag(html, "sourceBtn", function(attrs, pos) {
            var did = (attrOf(attrs, "data-id") || "").trim();
            if (!did || inlineLabels[did] !== undefined) return;
            inlineLabels[did] = btnLabel(html, pos);
            inlineIds.push(did);
        });

        var streams = [];
        var seenS = {};

        function playerFor(did) {
            return trPostJson(TR_BASE + "/api/sourcePlayer/" + encodeURIComponent(did), {
                "Accept": "application/json",
                "Referer": episodeUrl
            }).then(function(j2) {
                if (!j2 || !j2.source) return null;
                var srcM = j2.source.match(/src\s*=\s*"([^"]+)"/i);
                if (!srcM) srcM = j2.source.match(/src\s*=\s*'([^']+)'/i);
                if (!srcM) return null;
                var embedUrl = absUrl(srcM[1]);
                if (!embedUrl) return null;
                if (embedUrl.indexOf("pp.userapi.com") !== -1) return null;
                return embedUrl;
            }).catch(function() {
                return null;
            });
        }

        function runIds(ids, labels, fanName) {
            function next(j) {
                if (j >= ids.length || streams.length >= 12) return Promise.resolve();
                return playerFor(ids[j]).then(function(embedUrl) {
                    if (!embedUrl) return null;
                    return resolveEmbed(embedUrl, episodeUrl).then(function(r) {
                        if (!r.url || seenS[r.url]) return null;
                        seenS[r.url] = true;
                        var t = fanName || "TrAnimeIzle";
                        if (labels[ids[j]]) t += " - " + labels[ids[j]];
                        streams.push({
                            streamUrl: r.url,
                            title: t,
                            headers: r.headers
                        });
                    }).catch(function() {
                        return null;
                    });
                }).then(function() {
                    return next(j + 1);
                });
            }
            return next(0);
        }

        function nextFansub(i) {
            if (i >= fansubs.length || streams.length >= 12) return Promise.resolve();
            var f = fansubs[i];
            var body = JSON.stringify({ EpisodeId: parseInt(epId, 10), FansubId: parseInt(f.id, 10) });
            return trPost(TR_BASE + "/api/fansubSources", body, {
                "Content-Type": "application/json",
                "Referer": episodeUrl
            }).then(function(btnHtml) {
                var ids = [];
                var labels = {};
                eachTag(btnHtml, "sourceBtn", function(attrs, pos) {
                    var did = (attrOf(attrs, "data-id") || "").trim();
                    if (!did || labels[did] !== undefined) return;
                    labels[did] = btnLabel(btnHtml, pos);
                    ids.push(did);
                });
                return runIds(ids, labels, f.name);
            }).catch(function() {
                return null;
            }).then(function() {
                return nextFansub(i + 1);
            });
        }

        return nextFansub(0).then(function() {
            if (streams.length === 0 && inlineIds.length > 0) {
                return runIds(inlineIds, inlineLabels, "");
            }
            return null;
        }).then(function() {
            if (streams.length === 0) {
                streams.push({ streamUrl: episodeUrl, title: "TrAnimeIzle", headers: {} });
            }
            return JSON.stringify({ streams: streams, subtitle: "" });
        });
    }).catch(function() {
        return JSON.stringify({ streams: [], subtitle: "" });
    });
}
