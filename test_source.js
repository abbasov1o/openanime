const https = require('https');
const CLIENT_KEY = '16ghkdz5qnwinkyebwopbd94b49xhs';
const TOKEN_KEY = 'hlxjl1c2w281ax473rt1ofgrvhyjvi';

function decrypt(text, key) {
    const keyBytes = [...key].map(c => c.charCodeAt(0));
    const bytes = text.match(/.{2}/g).map((b, i) => parseInt(b, 16) ^ keyBytes[i % keyBytes.length]);
    return Buffer.from(bytes).toString('utf8');
}

function get(url, headers) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, r => {
            let c = [];
            r.on('data', d => c.push(d));
            r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString('utf8') }));
        }).on('error', reject);
    });
}

(async () => {
    // Step 1: embed page
    const embedUrl = 'https://x.anizium.co/embed?u=&site=main&lang=tr&id=437677985&plan=&server=1&skin=art&season=1&episode=1';
    const r1 = await get(embedUrl, { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Referer': 'https://anizium.co/' });
    const m = r1.body.match(/_ = "([0-9a-f]+)"/);
    if (!m) { console.log('no payload'); return; }
    const cfg = JSON.parse(decrypt(m[1], CLIENT_KEY));
    console.log('TOKEN:', cfg.TOKEN);

    // try decrypt token content
    try { console.log('TOKEN decrypted:', decrypt(cfg.TOKEN, TOKEN_KEY)); } catch (e) { console.log('token decrypt fail'); }
    try { console.log('TOKEN decrypted (clientKey):', decrypt(cfg.TOKEN, CLIENT_KEY)); } catch (e) {}

    // Step 2: anime/source
    const srcUrl = `https://api.anizium.co/anime/source?id=437677985&site=main&plan=&season=1&episode=1&server=1`;
    const r2 = await get(srcUrl, {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Cf-Control': cfg.TOKEN,
        'language': 'tr',
        'user': ''
    });
    console.log('\n=== /anime/source ===');
    console.log('Status:', r2.status);
    console.log(r2.body.slice(0, 1500));
})().catch(e => console.log('ERR', e.message));
