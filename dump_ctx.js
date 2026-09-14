const fs = require('fs');
const p = 'A:/downloads/archivetools/anizium.co-2026-09-13_1830/archivetools/anizium.co/2026-09-13_1830/assets/js/klausBundle.js';
const c = fs.readFileSync(p, 'utf8');
const idx = c.indexOf('&hash=');
if (idx >= 0) {
    const start = Math.max(0, idx - 3000);
    console.log(c.substring(start, idx + 1500).replace(/\s+/g, ' '));
}
