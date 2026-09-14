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
    const payload = {};
    for (let j = 0; j < rnd.length; j++) payload[String(j)] = rnd.charAt(j);
    return xorHex(JSON.stringify(payload), KEY + '_' + day);
}
function get(url) {
    return new Promise((resolve, reject) => {
        const headers = {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'Cf-Control': makeToken(),
            'device': 'browser',
            'language': 'tr',
            'site': 'main'
        };
        https.get(url, { headers }, r => {
            let c = [];
            r.on('data', d => c.push(d));
            r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString('utf8') }));
        }).on('error', reject);
    });
}

(async () => {
    // search mushoku
    const r = await get('https://api.anizium.co/page/search?value=mushoku&page=1');
    const j = JSON.parse(r.body);
    console.log('=== search "mushoku" page 1 ===');
    console.log('total:', j.page.pageless_total, 'pages:', j.page.total_pages);
    j.page.data.forEach(a => console.log('-', a.name, '| ID:', a.ID, '| type:', a.type));

    const r2 = await get('https://api.anizium.co/page/search?value=mushoku&page=2');
    const j2 = JSON.parse(r2.body);
    console.log('\n=== page 2 ===');
    (j2.page.data || []).forEach(a => console.log('-', a.name, '| ID:', a.ID, '| type:', a.type));

    // anime/get for first result to inspect seasons
    if (j.page.data.length > 0) {
        const first = j.page.data[0];
        const rg = await get('https://api.anizium.co/anime/get?id=' + first.ID);
        const jg = JSON.parse(rg.body);
        const d = jg.data;
        console.log('\n=== anime/get:', d.name, '===');
        console.log('type:', d.type, '| total_season:', d.total_season, '| series:', d.series, '| series_text:', d.series_text);
        (d.seasons || []).forEach(s => {
            console.log('Season', s.number, JSON.stringify(s.name), 'episodes:', (s.episodes || []).length);
        });
    }
})().catch(e => console.log('ERR', e.message));
