const https = require("https");

function get(url) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Accept": "*/*", "Accept-Language": "tr-TR,tr;q=0.9" } };
    https.get(url, opts, res => {
      let chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    }).on("error", reject);
  });
}

function splitJsonObjects(text) {
  const objs = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") { depth--; if (depth === 0 && start >= 0) { objs.push(text.slice(start, i + 1)); start = -1; } }
  }
  return objs;
}

async function dump(label, url) {
  try {
    const res = await get(url);
    console.log(`\n=== ${label} ${url} ===`);
    if (res.status !== 200) { console.log("Status:", res.status); return; }
    const objs = splitJsonObjects(res.body);
    for (let oi = 0; oi < objs.length; oi++) {
      let data;
      try { data = JSON.parse(objs[oi]); } catch (e) { console.log(`obj ${oi} parse fail: ${e.message}`); continue; }
      console.log(`\n--- obj ${oi} (${objs[oi].length} bytes) ---`);
      console.log("top keys:", Object.keys(data).join(", "));
      if (data.nodes) {
        for (let ni = 0; ni < data.nodes.length; ni++) {
          const n = data.nodes[ni];
          const nkeys = n && typeof n === "object" ? Object.keys(n).join(", ") : typeof n;
          console.log(`  node ${ni} keys:`, nkeys);
          if (n && n.data && Array.isArray(n.data)) {
            // root object
            const flat = n.data;
            const root = flat[0];
            if (root && typeof root === "object" && !Array.isArray(root)) {
              console.log(`  node ${ni} flat[0] (root) keys:`, Object.keys(root).join(", "));
              for (const k of Object.keys(root)) {
                const v = root[k];
                if (Array.isArray(v)) console.log(`    root.${k}: array[${v.length}]`);
                else if (typeof v === "number") console.log(`    root.${k}: -> ${flat[v] !== undefined ? JSON.stringify(flat[v]).slice(0, 100) : "(out of range " + v + ")"}`);
                else console.log(`    root.${k}: ${JSON.stringify(v).slice(0, 100)}`);
              }
            } else {
              console.log(`  node ${ni} flat[0] type:`, JSON.stringify(root).slice(0, 200));
            }
          }
        }
      } else if (data.data) {
        console.log("data.data type:", typeof data.data, JSON.stringify(data.data).slice(0, 300));
      } else {
        console.log("raw start:", JSON.stringify(data).slice(0, 400));
      }
    }
  } catch (e) { console.log(label, "ERROR:", e.message); }
}

(async () => {
  await dump("4k-releases-1", "https://openani.me/4k-releases/1/__data.json");
  await dump("calendar", "https://openani.me/calendar/__data.json");
  await dump("explore", "https://openani.me/explore/__data.json");
  await dump("homepage", "https://openani.me/__data.json");
})();
