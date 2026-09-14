const https = require('https');
const url = 'https://anizium.co/watch/437677985?season=1&episode=1';
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, r => {
    let c = [];
    r.on('data', d => c.push(d));
    r.on('end', () => {
        const b = Buffer.concat(c).toString('utf8');
        console.log('Status:', r.statusCode, 'Size:', b.length);
        const patterns = ['<source[^>]*>', '<video[^>]*>', 'file:\\s*["\'][^"\']+["\']', '[^"\']*m3u8[^"\']*', '[^"\']*\.mp4[^"\']*'];
        const found = new Set();
        for (const p of patterns) {
            const re = new RegExp(p, 'g');
            let m;
            while ((m = re.exec(b)) !== null) found.add(m[0].slice(0, 200));
        }
        if (found.size === 0) {
            console.log(b.slice(0, 1500));
        } else {
            [...found].slice(0, 25).forEach(x => console.log('M:', x));
        }
    });
});
