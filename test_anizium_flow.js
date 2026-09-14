const https = require('https');

function xorHex(d, k) {
    let o = '';
    for (let i = 0; i < d.length; i++) {
        let x = (d.charCodeAt(i) ^ k.charCodeAt(i % k.length)).toString(16);
        if (x.length < 2) x = '0' + x;
        o += x;
    }
    return o;
}
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const KEY = 'hlxjl1c2w281ax473rt1ofgrvhyjvi';
function makeToken() {
    const day = DAYS[new Date(Date.now() + 3 * 3600000).getUTCDay()];
    let rnd = '';
    for (let i = 0; i < 6; i++) rnd += (Math.random() + 1).toString(36)[2];
    return xorHex(JSON.stringify(Object.assign({}, rnd)), KEY + '_' + day);
}
function get(url, extra) {
    return new Promise((resolve, reject) => {
        const headers = Object.assign({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Cf-Control': makeToken(),
            'device': 'browser',
            'language': 'tr',
            'site': 'main'
        }, extra || {});
        https.get(url, { headers }, r => {
            let c = [];
            r.on('data', d => c.push(d));
            r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: Buffer.concat(c).toString('utf8') }));
        }).on('error', reject);
    });
}

(async () => {
    // 1. anime/get full seasons structure
    const r1 = await get('https://api.anizium.co/anime/get?id=437677985');
    const j1 = JSON.parse(r1.body);
    console.log('=== anime/get seasons structure ===');
    const seasons = j1.data.seasons || [];
    seasons.forEach(s => {
        console.log('Season', s.number, JSON.stringify(s.name), 'episode_count:', (s.episodes || []).length, 'season keys:', Object.keys(s).join(','));
        if (s.episodes && s.episodes[0]) console.log('  first ep:', JSON.stringify(s.episodes[0]).slice(0, 200));
    });
    console.log('total_season:', j1.data.total_season, 'type:', j1.data.type);

    // 2. MP4 direct access (no referer)
    const r2 = await get('https://f.aniziumserver.sbs/31910/1/1/480p.original.mp4', { Accept: '*/*' });
    console.log('\n=== MP4 direct (no referer) ===');
    console.log('Status:', r2.status, 'Size:', r2.body.length, 'Content-Type:', r2.headers['content-type']);

    // 3. server=2 (dub?)
    const r3 = await get('https://api.anizium.co/anime/source?id=437677985&site=main&plan=&season=1&episode=1&server=2', { language: 'tr', user: '' });
    console.log('\n=== source server=2 ===');
    console.log('Status:', r3.status);
    const j3 = JSON.parse(r3.body);
    (j3.groups || []).forEach(g => {
        console.log('Group:', g.name, g.type, '->', (g.items || []).map(i => i.quality + 'p:' + i.link).join(' | '));
    });
    console.log('Subtitles:', (j3.subtitles || []).map(s => s.name).join(', '));
})().catch(e => console.log('ERR', e.message));
