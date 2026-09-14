const fs = require('fs');
const p = 'A:/downloads/archivetools/anizium.co-2026-09-13_1830/archivetools/anizium.co/2026-09-13_1830/assets/js/klausBundle.js';
const c = fs.readFileSync(p, 'utf8');
for (const pat of ['adminHost=', 'adminHost =', 'video_sources=', 'video_sources =', 'server:', 'skin:']) {
    let idx = 0;
    let count = 0;
    while ((idx = c.indexOf(pat, idx)) !== -1 && count < 4) {
        console.log('### ' + pat + ' @ ' + idx);
        console.log(c.substring(Math.max(0, idx - 150), idx + 400).replace(/\s+/g, ' '));
        console.log('');
        idx += pat.length;
        count++;
    }
}
