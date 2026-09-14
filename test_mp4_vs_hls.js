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

function get(url, extra) {
    return new Promise((resolve, reject) => {
        const headers = Object.assign({
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'Cf-Control': makeToken(),
            'device': 'browser',
            'language': 'tr',
            'site': 'main'
        }, extra || {});
        https.get(url, { headers }, r => {
            let c = [];
            r.on('data', d => c.push(d));
            r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString('utf8') }));
        }).on('error', reject);
    });
}

(async () => {
    const base = 'https://api.anizium.co/anime/source?id=437677985&site=main&plan=&season=1&episode=1';
    for (const server of [1, 2]) {
        for (const withUser of [true, false]) {
            const extra = withUser ? { 'user': '' } : {};
            const r = await get(base + '&server=' + server, extra);
            const j = JSON.parse(r.body);
            const first = j.groups && j.groups[0] && j.groups[0].items && j.groups[0].items[0];
            console.log(`server=${server} user=${withUser} -> status ${r.status}, first item: ${first ? first.link : 'none'}`);
        }
    }
    // repeat to check stability
    const r2 = await get(base + '&server=1', { 'user': '' });
    const j2 = JSON.parse(r2.body);
    console.log('server=1 user=true repeat ->', j2.groups[0].items[0].link);
})().catch(e => console.log('ERR', e.message));
