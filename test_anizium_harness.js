// Simulates Shirox's JSEngine environment (fetchv2 bridge) and tests anizium.js end-to-end
var https = require('https');
var http = require('http');
var fs = require('fs');

function nodeFetch(urlStr, headers) {
    return new Promise(function(resolve, reject) {
        var mod = urlStr.indexOf('https:') === 0 ? https : http;
        var req = mod.request(urlStr, {
            headers: Object.assign({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }, headers || {})
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

function fetchv2(url, headers, method, body) {
    if (url.indexOf('/anime/source') !== -1) {
        console.log('[debug] source URL:', url);
        console.log('[debug] source headers:', JSON.stringify(headers));
    }
    return nodeFetch(url, headers);
}

var script = fs.readFileSync(__dirname + '/anizium.js', 'utf8');
eval(script);

function run() {
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
        if (parsed.length === 0) throw new Error('naruto search returned 0');
        var href = parsed[0].href;

        console.log('\n=== Test 3: extractDetails ===');
        return Promise.resolve(extractDetails(href)).then(function(d) {
            console.log('Details:', d.substring(0, 250));
            return href;
        });
    }).then(function(href) {
        console.log('\n=== Test 4: extractEpisodes ===');
        return Promise.resolve(extractEpisodes(href)).then(function(e) {
            var eps = JSON.parse(e);
            console.log('Episode count:', eps.length);
            if (eps.length > 0) {
                console.log('First:', JSON.stringify(eps[0]));
                console.log('Last:', JSON.stringify(eps[eps.length - 1]));
            }
            return eps.length > 0 ? eps[0].href : href;
        });
    }).then(function(epHref) {
        console.log('\n=== Test 5: extractStreamUrl ===');
        return Promise.resolve(extractStreamUrl(epHref)).then(function(s) {
            var r = JSON.parse(s);
            console.log('Streams:', r.streams.length);
            r.streams.slice(0, 6).forEach(function(x) { console.log(' -', x.title, '->', x.streamUrl); });
            console.log('Subtitle:', r.subtitle);
            if (r.streams.length === 0) throw new Error('no streams');
        });
    }).then(function() {
        console.log('\n=== Test 6: searchResults("mushoku tensei season 3") ===');
        return Promise.resolve(searchResults('mushoku tensei season 3'));
    }).then(function(res) {
        var parsed = JSON.parse(res);
        console.log('Result count:', parsed.length);
        parsed.slice(0, 5).forEach(function(p) { console.log(' -', JSON.stringify(p.title), p.href); });
        if (parsed.length === 0) throw new Error('mushoku season 3 search returned 0');

        console.log('\n=== Test 7: searchResults("one piece") ===');
        return Promise.resolve(searchResults('one piece'));
    }).then(function(res) {
        var parsed = JSON.parse(res);
        console.log('Result count:', parsed.length);
        parsed.slice(0, 3).forEach(function(p) { console.log(' -', JSON.stringify(p.title), p.href); });
        process.exit(0);
    }).catch(function(e) {
        console.log('FATAL ERROR:', e.message);
        process.exit(1);
    });
}

run();
