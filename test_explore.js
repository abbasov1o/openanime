var https = require('https');

function nodeFetch(urlStr) {
    return new Promise(function(resolve, reject) {
        var req = https.request(urlStr, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        }, function(res) {
            var chunks = [];
            res.on('data', function(c) { chunks.push(c); });
            res.on('end', function() {
                resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') });
            });
        });
        req.on('error', function(e) { reject(e); });
        req.end();
    });
}

function tryEndpoint(name, url) {
    return nodeFetch(url).then(function(r) {
        console.log('\n=== ' + name + ' [' + url + '] ===');
        console.log('Status:', r.status, 'Size:', r.text.length);
        if (r.status === 200 && r.text.length > 100) {
            try {
                var data = JSON.parse(r.text);
                var flat = data.nodes && data.nodes[0] && data.nodes[0].data;
                if (!flat) { console.log('No flat data'); return; }
                console.log('Flat entries:', flat.length);
                var root = flat[0];
                console.log('Root keys:', Object.keys(root).join(', '));
                // Count anime-like objects in entire flat array
                var animeCount = 0, slugs = {};
                flat.forEach(function(e) {
                    if (e && typeof e === 'object' && !Array.isArray(e) && e.slug !== undefined && e.turkish !== undefined) {
                        animeCount++;
                        var s = typeof e.slug === 'number' ? flat[e.slug] : e.slug;
                        if (typeof s === 'string') slugs[s] = true;
                    }
                });
                console.log('Anime objects found in flat:', animeCount, 'unique slugs:', Object.keys(slugs).length);
                var sample = Object.keys(slugs).slice(0, 5);
                console.log('Sample slugs:', sample.join(', '));
                if (slugs['naruto']) console.log('*** CONTAINS NARUTO ***');
            } catch (e) {
                console.log('Parse error:', e.message);
            }
        }
    }).catch(function(e) { console.log(name, 'ERROR:', e.message); });
}

async function main() {
    await tryEndpoint('explore', 'https://openani.me/explore/__data.json');
    await tryEndpoint('explore page 2', 'https://openani.me/explore?page=2&__data.json');
    await tryEndpoint('4k-releases', 'https://openani.me/4k-releases/1/__data.json');
    await tryEndpoint('calendar', 'https://openani.me/calendar/__data.json');
    process.exit(0);
}
main();