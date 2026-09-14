var fs = require('fs');
var html = fs.readFileSync('A:/downloads/archivetools/openani.me-2026-09-13_1844/archivetools/openani.me/2026-09-13_1844/page-17/index.html', 'utf8');

var m = html.match(/<script\s+type="application\/json"[^>]*data-url="https:\/\/api\.openani\.me\/anime\/[^"]*"[^>]*>([\s\S]*?)<\/script>/);
if (m) {
    console.log('JSON script FOUND, length:', m[1].length);
    var inner = JSON.parse(m[1]);
    console.log('Inner keys:', Object.keys(inner).join(', '));
    if (inner.body) {
        var body = JSON.parse(inner.body);
        console.log('Title:', body.turkish);
        console.log('Slug:', body.slug);
        console.log('Seasons:', body.seasons ? body.seasons.length : 0);
        if (body.seasons) body.seasons.forEach(function(s) {
            console.log('  S' + s.season_number + ' episodes=' + s.episode_count + ' hasEpisode=' + s.hasEpisode);
        });
    }
} else {
    console.log('NO JSON script tag found');
    console.log('Looking for any script with api.openani.me...');
    var idx = html.indexOf('api.openani.me/anime');
    if (idx >= 0) console.log('Found at', idx, ':', html.substring(Math.max(0,idx-50), Math.min(html.length, idx+100)));
}