const https = require('https');
const http = require('http');

function get(urlStr, headers) {
    return new Promise((resolve) => {
        const mod = urlStr.indexOf('https:') === 0 ? https : http;
        try {
            const req = mod.request(urlStr, {
                headers: Object.assign({
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'tr-TR,tr;q=0.9'
                }, headers || {})
            }, res => {
                let chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => resolve({
                    url: urlStr,
                    status: res.statusCode,
                    server: res.headers.server,
                    ct: res.headers['content-type'],
                    body: Buffer.concat(chunks).toString('utf8')
                }));
            });
            req.on('error', e => resolve({ url: urlStr, status: 0, err: e.message }));
            req.end();
        } catch (e) { resolve({ url: urlStr, status: 0, err: e.message }); }
    });
}

(async () => {
    const urls = [
        'https://www.tranimeizle.io/arama?kelime=naruto',
        'https://tranimeizle.io/',
        'https://www.tranimeizle.pw/',
        'https://www.tranimeizle.co/',
        'https://tranimeizle.tv/',
        'https://www.tranimeizle.io/wp-json/',
        'https://api.tranimeizle.io/',
        'https://www.tranimeizle.io/api/',
    ];
    for (const u of urls) {
        const r = await get(u);
        if (r.status === 0) { console.log(u, '-> ERR', r.err); continue; }
        const challenged = r.body && r.body.indexOf('Just a moment') !== -1;
        console.log(u, '->', r.status, r.ct, challenged ? 'CF-CHALLENGE' : (r.body ? r.body.slice(0, 80).replace(/\s+/g, ' ') : ''));
    }
})().catch(e => console.log('ERR', e.message));
