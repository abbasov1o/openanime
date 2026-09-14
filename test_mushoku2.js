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
    const rg = await get('https://api.anizium.co/anime/get?id=792095957');
    const jg = JSON.parse(rg.body);
    const d = jg.data;
    console.log('=== anime/get:', d.name, '===');
    console.log('type:', d.type, '| total_season:', d.total_season, '| series:', d.series, '| series_text:', JSON.stringify(d.series_text));
    console.log('season count:', (d.seasons || []).length);
    (d.seasons || []).forEach(s => {
        console.log('Season', s.number, JSON.stringify(s.name), 'episodes:', (s.episodes || []).length, '| keys:', Object.keys(s).join(','));
    });

    // Also check source for season 3 episode 1
    const rs = await get('https://api.anizium.co/anime/source?id=792095957&site=main&plan=&season=3&episode=1&server=1');
    console.log('\n=== source season=3 episode=1 ===');
    console.log('Status:', rs.status);
    const js = JSON.parse(rs.body);
    console.log('success:', js.success, 'msg:', js.msg || '');
    if (js.groups) console.log('groups:', js.groups.map(g => g.name + ':' + (g.items || []).length).join(', '));
})().catch(e => console.log('ERR', e.message));
