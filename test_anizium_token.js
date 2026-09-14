const https = require('https');

function xorHex(data, key) {
    var out = '';
    for (var i = 0; i < data.length; i++) {
        var dc = data.charCodeAt(i);
        var kc = key.charCodeAt(i % key.length);
        var x = (dc ^ kc).toString(16);
        if (x.length < 2) x = '0' + x;
        out += x;
    }
    return out;
}

var TOKEN_KEY = 'hlxjl1c2w281ax473rt1ofgrvhyjvi';
var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function makeToken() {
    // Istanbul = UTC+3, no DST
    var dayIdx = new Date(Date.now() + 3 * 3600000).getUTCDay();
    var key = TOKEN_KEY + '_' + DAYS[dayIdx];
    var rnd = '';
    for (var i = 0; i < 6; i++) rnd += (Math.random() + 1).toString(36)[2];
    var payload = JSON.stringify(Object.assign({}, rnd));
    return xorHex(payload, key);
}

function get(url) {
    return new Promise((resolve, reject) => {
        var headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Cf-Control': makeToken(),
            'device': 'browser',
            'language': 'tr',
            'site': 'main'
        };
        https.get(url, { headers }, res => {
            let chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
        }).on('error', reject);
    });
}

(async () => {
    console.log('=== page/genre ===');
    var r = await get('https://api.anizium.co/page/genre');
    console.log('Status:', r.status);
    console.log(r.body.slice(0, 150));

    console.log('\n=== page/catalog?id=movie&type=type&page=1 ===');
    r = await get('https://api.anizium.co/page/catalog?id=movie&type=type&page=1');
    console.log('Status:', r.status);
    console.log(r.body.slice(0, 300));

    console.log('\n=== page/top?platform=favorite&page=1 ===');
    r = await get('https://api.anizium.co/page/top?platform=favorite&page=1');
    console.log('Status:', r.status);
    console.log(r.body.slice(0, 300));
})().catch(e => console.log('ERR:', e.message));
