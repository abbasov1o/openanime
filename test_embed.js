const https = require('https');
https.get('https://x.anizium.co/assets/js/index.js?v=1789291018374', { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://anizium.co/' } }, r => {
    let c = [];
    r.on('data', d => c.push(d));
    r.on('end', () => {
        const b = Buffer.concat(c).toString('utf8');
        require('fs').writeFileSync('C:/Users/xCode/AdemiProjects/shiroxopen/embed_index.js', b);
        // find usages of _ variable and decrypt
        const lines = b.split('\n');
        lines.forEach((l, i) => {
            if (/decrypt\(|clientKey|tokenKey|_\s*=|window\._|\b_\b.*decrypt|answer_decrypt|sources|video|file|\.mp4|m3u8/i.test(l) && l.length < 300) {
                console.log(i + ': ' + l.trim().slice(0, 250));
            }
        });
    });
});
