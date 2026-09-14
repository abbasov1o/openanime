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

// Split concatenated JSON objects (brace counting, string aware)
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

function resolveRef(flat, ref) {
  try {
    if (ref === null || ref === undefined) return null;
    if (Array.isArray(ref)) return ref.map(r => resolveRef(flat, r));
    if (typeof ref === "object") {
      const out = {};
      for (const k of Object.keys(ref)) out[k] = resolveRef(flat, ref[k]);
      return out;
    }
    if (typeof ref === "number") return flat[ref];
    return ref;
  } catch (e) { return null; }
}

async function dump(label, url) {
  try {
    const res = await get(url);
    console.log(`\n=== ${label} ${url} ===`);
    console.log("Status:", res.status, "Size:", res.body.length);
    if (res.status !== 200) return;
    const objs = splitJsonObjects(res.body);
    console.log("JSON objects found:", objs.length);
    const slugs = new Map();
    for (let oi = 0; oi < objs.length; oi++) {
      let data;
      try { data = JSON.parse(objs[oi]); } catch (e) { console.log(`obj ${oi} parse fail: ${e.message}`); continue; }
      const flat = data.nodes && data.nodes[0] && data.nodes[0].data;
      if (!flat) { console.log(`obj ${oi}: no flat`); continue; }
      console.log(`obj ${oi}: flat entries ${flat.length}`);
      // find all anime-like objects in flat
      let count = 0;
      for (const item of flat) {
        if (item && typeof item === "object" && !Array.isArray(item) && item.slug && (item.turkish || item.name)) {
          count++;
          const slug = resolveRef(flat, item.slug);
          const turkish = resolveRef(flat, item.turkish);
          const avatar = resolveRef(flat, item.avatar);
          const genres = item.genres ? resolveRef(flat, item.genres) : null;
          if (slug && !slugs.has(slug)) slugs.set(slug, { turkish: turkish || "", avatar: avatar || "", genres: genres ? JSON.stringify(genres).slice(0, 80) : "" });
        }
      }
      console.log(`obj ${oi}: anime-like objects: ${count}`);
      // dump root keys
      const root = flat[0];
      if (root && typeof root === "object") console.log(`obj ${oi} root keys:`, Object.keys(root).join(", "));
    }
    console.log(`TOTAL unique slugs: ${slugs.size}`);
    let i = 0;
    for (const [s, v] of slugs) { if (i++ < 15) console.log("  ", s, "|", v.turkish, "|", v.genres || "no genres"); }
  } catch (e) { console.log(label, "ERROR:", e.message); }
}

(async () => {
  await dump("4k-releases-1", "https://openani.me/4k-releases/1/__data.json");
  await dump("4k-releases-2", "https://openani.me/4k-releases/2/__data.json");
  await dump("calendar", "https://openani.me/calendar/__data.json");
})();
