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
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
    // 1) single fresh call
    let r = await get('https://api.anizium.co/anime/source?id=437677985&site=main&plan=&server=1&season=1&episode=1');
    console.log('call #1:', JSON.parse(r.body).groups[0].items[0].link);

    // 2) repeat same call immediately
    r = await get('https://api.anizium.co/anime/source?id=437677985&site=main&plan=&server=1&season=1&episode=1');
    console.log('call #2:', JSON.parse(r.body).groups[0].items[0].link);

    // 3) after other API calls (search x2 + anime/get), then source
    await get('https://api.anizium.co/page/search?value=naruto&page=1').catch(() => {});
    await get('https://api.anizium.co/anime/get?id=437677985').catch(() => {});
    r = await get('https://api.anizium.co/anime/source?id=437677985&site=main&plan=&server=1&season=1&episode=1');
    console.log('call #3 (after search+get):', JSON.parse(r.body).groups[0].items[0].link);
})().catch(e => console.log('ERR', e.message));
