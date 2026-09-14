// Simulates Shirox's JSEngine environment (fetchv2 bridge) and tests openani.js end-to-end.
// Mode A (default): real network from this machine — API returns 401, tests fallback path.
// Mode B (MOCK_API=1): intercepts api.openani.me/anime requests with the real captured
// response shape from the user's archive to test the API search path.
var https = require('https');
var fs = require('fs');
var http = require('http');
var MOCK_API = process.env.MOCK_API === '1';

function nodeFetch(urlStr) {
    return new Promise(function(resolve, reject) {
        var mod = urlStr.indexOf('https:') === 0 ? https : http;
        var req = mod.request(urlStr, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/json'
            }
        }, function(res) {
            var chunks = [];
            res.on('data', function(c) { chunks.push(c); });
            res.on('end', function() {
                var text = Buffer.concat(chunks).toString('utf8');
                resolve({
                    status: res.statusCode,
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    url: urlStr,
                    headers: res.headers,
                    text: function() { return text; },
                    json: function() { return JSON.parse(text); }
                });
            });
        });
        req.on('error', function(e) { reject(e); });
        req.end();
    });
}

// Mock of the captured API response shape (from user's archive capture):
// { animes: [ { slug, turkish, english, romaji, pictures: { avatar, banner }, ... } ] }
function mockApiResponse(keyword) {
    var db = [
        { slug: 'naruto', turkish: 'Naruto', english: 'Naruto', romaji: 'Naruto',
          pictures: { avatar: 'https://image.tmdb.org/t/p/original/1LNBDQ4u6DcQ9dWd5S0Q7rFg028Fq.jpg', banner: 'https://image.tmdb.org/t/p/original/u8QlDE78tI6ValBADKa4NEOWihQ.jpg' } },
        { slug: 'naruto-shippuuden', turkish: 'Naruto: Shippuden', english: 'Naruto: Shippuden', romaji: 'Naruto: Shippuuden',
          pictures: { avatar: 'https://image.tmdb.org/t/p/original/hk9joSlfsrVTmcoYzQ7rFg028Fq.jpg', banner: '' } },
        { slug: 'horimiya', turkish: 'Horimiya', english: 'Horimiya', romaji: 'Horimiya',
          pictures: { avatar: 'https://image.tmdb.org/t/p/original/zayGBXlrNynwZAqcM0xgfC1GLZq.jpg', banner: '' } },
        { slug: 'one-piece', turkish: 'One Piece', english: 'One Piece', romaji: 'One Piece',
          pictures: { avatar: 'https://image.tmdb.org/t/p/original/c1P6JIG7hVIbONTviIm1epwKdvT.jpg', banner: '' } }
    ];
    var kw = (keyword || '').toLowerCase();
    var animes = kw ? db.filter(function(a) { return (a.turkish || '').toLowerCase().indexOf(kw) !== -1 || a.slug.indexOf(kw) !== -1; }) : db;
    return { animes: animes };
}

function fetchv2(url, headers, method, body) {
    if (MOCK_API && url.indexOf('https://api.openani.me/anime?page=') === 0) {
        var m = url.match(/keywords=([^&]*)/);
        var kw = m ? decodeURIComponent(m[1]) : '';
        console.log('[mock] API called, keywords =', JSON.stringify(kw));
        return Promise.resolve({
            status: 200,
            ok: true,
            url: url,
            headers: {},
            text: function() { return JSON.stringify(mockApiResponse(kw)); },
            json: function() { return mockApiResponse(kw); }
        });
    }
    return nodeFetch(url);
}

// Load the module
var script = fs.readFileSync(__dirname + '/openani.js', 'utf8');
eval(script);

function run() {
    console.log('MOCK_API =', MOCK_API, '\n');

    console.log('=== Test 1: searchResults("") ===');
    Promise.resolve(searchResults('')).then(function(res) {
        var parsed = JSON.parse(res);
        console.log('Result count:', parsed.length);
        if (parsed.length > 0) console.log('First item:', JSON.stringify(parsed[0]));

        console.log('\n=== Test 2: searchResults("naruto") ===');
        return Promise.resolve(searchResults('naruto'));
    }).then(function(res) {
        var parsed = JSON.parse(res);
        console.log('Result count:', parsed.length);
        parsed.slice(0, 5).forEach(function(p) { console.log(' -', JSON.stringify(p)); });

        console.log('\n=== Test 3: searchResults("horimiya") ===');
        return Promise.resolve(searchResults('horimiya'));
    }).then(function(res) {
        var parsed = JSON.parse(res);
        console.log('Result count:', parsed.length);
        parsed.slice(0, 5).forEach(function(p) { console.log(' -', JSON.stringify(p)); });

        console.log('\n=== Test 4: extractDetails("https://openani.me/anime/naruto") ===');
        return Promise.resolve(extractDetails('https://openani.me/anime/naruto'));
    }).then(function(res) {
        console.log('Details:', res.substring(0, 200));

        console.log('\n=== Test 5: extractEpisodes("https://openani.me/anime/naruto") ===');
        return Promise.resolve(extractEpisodes('https://openani.me/anime/naruto'));
    }).then(function(res) {
        var parsed = JSON.parse(res);
        console.log('Episode count:', parsed.length);
        if (parsed.length > 0) console.log('First:', JSON.stringify(parsed[0]));

        console.log('\n=== Test 6: extractStreamUrl("https://openani.me/anime/naruto/1/1") ===');
        return Promise.resolve(extractStreamUrl('https://openani.me/anime/naruto/1/1'));
    }).then(function(res) {
        console.log('Stream result:', res.substring(0, 400));
        process.exit(0);
    }).catch(function(e) {
        console.log('FATAL ERROR:', e.message);
        process.exit(1);
    });
}

run();
