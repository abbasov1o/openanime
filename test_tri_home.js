const https = require('https');

function get(urlStr, headers) {
    return new Promise((resolve, reject) => {
        const mod = urlStr.indexOf('https:') === 0 ? https : require('http');
        const req = mod.request(urlStr, {
            headers: Object.assign({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9'
            }, headers || {})
        }, res => {
            let chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf8')
            }));
        });
        req.on('error', e => reject(e));
        req.end();
    });
}

(async () => {
    const r = await get('https://www.tranimeizle.io/');
    console.log('Status:', r.status, 'Size:', r.body.length);
    console.log('Final headers server:', r.headers.server, '| content-type:', r.headers['content-type']);
    // find basic structure: title, nav links
    const title = r.body.match(/<title>([^<]*)<\/title>/);
    console.log('Title:', title ? title[1] : 'none');
    // look for common patterns
    const patterns = [/\/anime\/[^"']+/g, /\/arama\?[^"']+/g, /action="[^"]*"/g, /\/search[^"']*/g, /wp-json[^"']*/g, /wp-content[^"']{0,40}/g];
    for (const p of patterns) {
        const m = r.body.match(p);
        if (m) console.log(p.source.slice(0, 20), '->', [...new Set(m)].slice(0, 5).join(' | '));
    }
    console.log('\nFirst 2000 chars:');
    console.log(r.body.slice(0, 2000));
})().catch(e => console.log('ERR', e.message));
