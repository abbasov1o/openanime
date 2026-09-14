// TrAnimeIzle module harness - real markup from archivetools capture + Migurdex provider
var fs = require("fs");
var vm = require("vm");

var SEARCH_HTML = [
    '<div class="post-body"><div class="flex-wrap-layout">',
    '<div class="flx-block" data-href="/anime/naruto">',
    '<a class="news-image" href="/anime/naruto">',
    '<img alt="" class="img-responsive" src="https://static.tranimeizle.top/animes/21/medium.jpeg">',
    '</a>',
    '<div class="shadow-overlay"></div>',
    '<div class="bar"><h4>Naruto \u0130zle</h4><span class="info-chip pull-right"><a class="text-white-imp" href="/anime/naruto">Anime \u0130zle</a></span><span class="info-chip">TV</span></div>',
    '</div>',
    '<div class="flx-block" data-href="/anime/one-piece-2-sezon-izle">',
    '<a class="news-image" href="/anime/one-piece-2-sezon-izle">',
    '<img alt="" class="img-responsive" src="/animes/2/medium.jpeg">',
    '</a>',
    '<div class="bar"><h4>One Piece 2. Sezon &amp; T\u00fcrk\u00e7e \u0130zle</h4><span class="info-chip">TV</span></div>',
    '</div>',
    '</div></div>'
].join("\n");

var CHALLENGE_HTML = '<html><head><title>Just a moment...</title></head><body>Please wait while we verify... challenge-platform scripts</body></html>';

var EMPTY_SEARCH_HTML = '<html><head><title>Arama - Anime izle</title></head><body><div class="post-head"><strong>Arama Sonucu Bulunamad</strong></div><form class="searchform"><input type="text"></form></body></html>';

var ANIME_HTML = [
    '<h1 class="ptitle">Naruto \u0130zle</h1>',
    '<div class="p-10"><article>Anime Konusu: Naruto Konoha k\u00f6y\u00fcn\u00fcn en \u00e7\u0131lg\u0131n ninjas\u0131d\u0131r.</article></div>',
    '<dd>Yap\u0131m Y\u0131l\u0131</dd><dt>2002</dt>',
    '<div class="episode-li">',
    '<a href="/naruto-1-sezon-1-bolum-izle"><div class="etitle"><span>Naruto 1. B\u00f6l\u00fcm \u0130zle</span><small class="author"><br>12 Tem 2026</small></div></a>',
    '<a href="/naruto-1-sezon-2-bolum-izle"><div class="etitle"><span>Naruto 2. B\u00f6l\u00fc m \u0130zle</span></div></a>',
    '<a href="/naruto-2-sezon-1-bolum-izle"><div class="etitle"><span>Naruto 2. Sezon 1. B\u00f6l\u00fcm \u0130zle</span></div></a>',
    '</div>'
].join("\n");

var WATCH_HTML = [
    '<h1>Though I Am an Inept Villainess 10. B\u00f6l\u00fcm \u0130zle</h1>',
    '<div class="btn btn-default fansubSelector" data-fid="188" data-fad="TRanimeizle" data-furl="">TRanimeizle</div>',
    '<input type="hidden" id="AnimeId" name="AnimeId" value="5516">',
    '<input type="hidden" id="EpisodeId" name="EpisodeId" value="70801">',
    '<div class="videoSource-items" id="sourceList"><ol>',
    '<li class="sourceBtn" data-id="1129415" data-eid="70801">',
    '<p class="title">AitrVip <small class="author"><br>Sa0</small></p>',
    '</li>',
    '</ol></div>',
    '<script>animeWatch.initialize(5516, 70801, 188, "TRanimeizle", "");</script>'
].join("\n");

var FANSUB_BTN_HTML = [
    '<ol>',
    '<li class="sourceBtn" data-id="1126193" data-eid="69632">',
    '<p class="title">AitrVip <small class="author"><br>Sa0</small></p>',
    '</li>',
    '<li class="sourceBtn" data-id="1126194" data-eid="69632">',
    '<p class="title">HexUpload <small class="author"><br>Sa0</small></p>',
    '</li>',
    '</ol>',
    '<script>events.initialize()</script>'
].join("\n");

var PLAYER_JSON_1 = JSON.stringify({ source: '<iframe src="https://player.tranimecdn.io/embed2/?id=abc123" frameborder="0"></iframe>' });
var PLAYER_JSON_2 = JSON.stringify({ source: '<iframe src="//player2.tranimecdn.io/v/xyz" frameborder="0"></iframe>' });

var EMBED_HTML_1 = '<script>jwplayer("v").setup({file: "https:\\/\\/cdn.tranimecdn.io\\/hls\\/abc123\\/master.m3u8?tok=1", type: "hls"});</script>';
var EMBED_HTML_2 = '<video><source src="https://cdn2.tranimecdn.io/mp4/xyz/480.mp4" type="video/mp4"></video>';

var requests = [];
var failFansubApi = false;

function mockFetchv2(url, headers, method, body) {
    requests.push({ url: url, method: method || "GET", body: body || null });
    var text = null;
    if (url.indexOf("/arama/challenge") !== -1) text = CHALLENGE_HTML;
    else if (url.indexOf("/arama/naruto%20season%202") !== -1 || url.indexOf("/arama/naruto%20season") !== -1 || url.indexOf("/arama/naruto%202") !== -1) text = EMPTY_SEARCH_HTML;
    else if (url.indexOf("/arama/") !== -1 || url === "https://www.tranimeizle.io/") text = SEARCH_HTML;
    else if (url === "https://www.tranimeizle.io/anime/naruto") text = ANIME_HTML;
    else if (url.indexOf("-bolum-izle") !== -1) text = WATCH_HTML;
    else if (url.indexOf("/api/fansubSources") !== -1) {
        if (failFansubApi) return Promise.resolve({ status: 500, ok: false, headers: {}, text: function() { return ""; }, json: function() { return {}; } });
        text = FANSUB_BTN_HTML;
    } else if (url.indexOf("/api/sourcePlayer/1126193") !== -1) text = PLAYER_JSON_1;
    else if (url.indexOf("/api/sourcePlayer/1126194") !== -1) text = PLAYER_JSON_2;
    else if (url.indexOf("/api/sourcePlayer/1129415") !== -1) text = PLAYER_JSON_1;
    else if (url.indexOf("player.tranimecdn.io") !== -1) text = EMBED_HTML_1;
    else if (url.indexOf("player2.tranimecdn.io") !== -1) text = EMBED_HTML_2;
    if (text === null) {
        return Promise.resolve({ status: 404, ok: false, headers: {}, text: function() { return ""; }, json: function() { return {}; } });
    }
    return Promise.resolve({
        status: 200,
        ok: true,
        headers: {},
        text: function() { return text; },
        json: function() { return JSON.parse(text); }
    });
}

var ctx = {
    fetchv2: mockFetchv2,
    Promise: Promise,
    JSON: JSON,
    Math: Math,
    Date: Date,
    console: console
};
ctx.global = ctx;

var code = fs.readFileSync("tranimeizle.js", "utf8");
vm.createContext(ctx);
vm.runInContext(code, ctx);

var failed = 0;
function check(name, cond, extra) {
    if (cond) console.log("PASS " + name);
    else { failed++; console.log("FAIL " + name + (extra ? " :: " + extra : "")); }
}

ctx.searchResults("naruto").then(function(r) {
    var items = JSON.parse(r);
    check("search count=2", items.length === 2, "got " + items.length + " " + JSON.stringify(items));
    check("search title real card", items[0].title === "Naruto", JSON.stringify(items[0]));
    check("search title entities+season", items[1].title === "One Piece 2. Sezon & T\u00fcrk\u00e7e", JSON.stringify(items[1]));
    check("search img abs cdn", items[0].image === "https://static.tranimeizle.top/animes/21/medium.jpeg", items[0].image);
    check("search img relative abs", items[1].image === "https://www.tranimeizle.io/animes/2/medium.jpeg", items[1].image);
    check("search href anime page", items[0].href === "https://www.tranimeizle.io/anime/naruto", items[0].href);

    return ctx.searchResults("challenge");
}).then(function(r) {
    var items = JSON.parse(r);
    check("challenge -> DEBUG cards", items.length >= 2 && items[0].title.indexOf("D1") === 0, JSON.stringify(items));
    check("DEBUG D1 len", items[0].title.indexOf("D1 len=") === 0, items[0] && items[0].title);
    var jmCard = items.filter(function(c) { return c.title.indexOf("D3") === 0; })[0];
    check("DEBUG D3 jm=1 cf=1", jmCard && jmCard.title.indexOf("jm=1") !== -1 && jmCard.title.indexOf("cf=1") !== -1, jmCard && jmCard.title);
    var newsCard = items.filter(function(c) { return c.title.indexOf("D2") === 0; })[0];
    check("DEBUG D2 news=0", newsCard && newsCard.title.indexOf("news=0") !== -1, newsCard && newsCard.title);

    return ctx.searchResults("naruto season 2");
}).then(function(r) {
    var items = JSON.parse(r);
    check("noisy query -> candidate retry works", items.length === 2 && items[0].title === "Naruto", JSON.stringify(items));
    var aramaCalls = requests.filter(function(q) { return q.url.indexOf("/arama/") !== -1; }).slice(-3);
    check("candidate order noisy->shorter->clean", aramaCalls.length === 3 && aramaCalls[0].url.indexOf("naruto%20season%202") !== -1 && aramaCalls[1].url.indexOf("/arama/naruto%202") !== -1 && aramaCalls[2].url.indexOf("/arama/naruto") !== -1, JSON.stringify(aramaCalls.map(function(q) { return q.url; })));

    return ctx.searchResults("");
}).then(function(r) {
    var items = JSON.parse(r);
    check("empty kw -> homepage cards", items.length === 2, "got " + items.length);

    return ctx.extractDetails("https://www.tranimeizle.io/anime/naruto");
}).then(function(r) {
    var d = JSON.parse(r)[0];
    check("details desc", d.description === "Naruto Konoha k\u00f6y\u00fcn\u00fcn en \u00e7\u0131lg\u0131n ninjas\u0131d\u0131r.", JSON.stringify(d));
    check("details airdate yapim yili", d.airdate === "2002", d.airdate);

    return ctx.extractEpisodes("https://www.tranimeizle.io/anime/naruto");
}).then(function(r) {
    var eps = JSON.parse(r);
    check("episodes count=3", eps.length === 3, "got " + eps.length + " " + JSON.stringify(eps));
    check("ep1 num=1", eps[0].number === 1 && eps[0].href === "https://www.tranimeizle.io/naruto-1-sezon-1-bolum-izle", JSON.stringify(eps[0]));
    check("ep2 num=2 (title typo -> href fallback)", eps[1].number === 2 && eps[1].href === "https://www.tranimeizle.io/naruto-1-sezon-2-bolum-izle", JSON.stringify(eps[1]));
    check("s2e1 num=1001", eps[2].number === 1001 && eps[2].href === "https://www.tranimeizle.io/naruto-2-sezon-1-bolum-izle", JSON.stringify(eps[2]));

    return ctx.extractStreamUrl("https://www.tranimeizle.io/though-i-am-an-inept-villainess-10-bolum-izle");
}).then(function(r) {
    var res = JSON.parse(r);
    check("streams >=2", res.streams.length >= 2, "got " + res.streams.length + " " + JSON.stringify(res.streams));
    var m3u8 = res.streams.filter(function(s) { return s.streamUrl.indexOf(".m3u8") !== -1; })[0];
    var mp4 = res.streams.filter(function(s) { return s.streamUrl.indexOf(".mp4") !== -1; })[0];
    check("m3u8 resolved", m3u8 && m3u8.streamUrl === "https://cdn.tranimecdn.io/hls/abc123/master.m3u8?tok=1", m3u8 && m3u8.streamUrl);
    check("mp4 resolved", mp4 && mp4.streamUrl === "https://cdn2.tranimecdn.io/mp4/xyz/480.mp4", mp4 && mp4.streamUrl);
    check("btn label from p.title", m3u8 && m3u8.title === "TRanimeizle - AitrVip Sa0", m3u8 && m3u8.title);
    check("hex label", mp4 && mp4.title === "TRanimeizle - HexUpload Sa0", mp4 && mp4.title);
    check("stream referer embed origin", m3u8 && m3u8.headers.Referer === "https://player.tranimecdn.io", m3u8 && JSON.stringify(m3u8.headers));

    failFansubApi = true;
    return ctx.extractStreamUrl("https://www.tranimeizle.io/though-i-am-an-inept-villainess-10-bolum-izle");
}).then(function(r) {
    failFansubApi = false;
    var res = JSON.parse(r);
    check("fansub api fail -> inline fallback", res.streams.length >= 1, JSON.stringify(res.streams));
    check("inline fallback m3u8", res.streams.some(function(s) { return s.streamUrl.indexOf(".m3u8") !== -1; }), JSON.stringify(res.streams));
    check("inline label", res.streams.some(function(s) { return s.title.indexOf("AitrVip") !== -1; }), JSON.stringify(res.streams));

    console.log(failed === 0 ? "\nALL TESTS PASSED" : "\n" + failed + " TESTS FAILED");
    process.exit(failed === 0 ? 0 : 1);
}).catch(function(e) {
    console.log("HARNESS ERROR: " + (e && e.stack || e));
    process.exit(1);
});
