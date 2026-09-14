const https = require('https');
const CLIENT_KEY = '16ghkdz5qnwinkyebwopbd94b49xhs';

function decrypt(text, key) {
    const keyBytes = [...key].map(c => c.charCodeAt(0));
    const bytes = text.match(/.{2}/g).map((b, i) => parseInt(b, 16) ^ keyBytes[i % keyBytes.length]);
    return Buffer.from(bytes).toString('utf8');
}

https.get('https://x.anizium.co/embed?u=&site=main&lang=tr&id=437677985&plan=&server=1&skin=art&season=1&episode=1', { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Referer': 'https://anizium.co/' } }, r => {
    let c = [];
    r.on('data', d => c.push(d));
    r.on('end', () => {
        const b = Buffer.concat(c).toString('utf8');
        const m = b.match(/_ = "([0-9a-f]+)"/);
        if (!m) { console.log('no payload, status', r.statusCode); console.log(b.slice(0, 500)); return; }
        const payload = decrypt(m[1], CLIENT_KEY);
        const j = JSON.parse(payload);
        console.log('Top keys:', Object.keys(j).join(', '));
        if (j.data) {
            console.log('data keys:', Object.keys(j.data).join(', '));
            console.log(JSON.stringify(j.data).slice(0, 2000));
        } else {
            console.log(payload.slice(0, 2000));
        }
    });
});
