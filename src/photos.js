// GET /api/photos: picture links from an iCloud shared album that has "Public Website" switched on.
// This reads the same feed the public album web page uses. Apple doesn't document it,
// so if it ever changes the slideshow falls back to the plain clock screen.
import { json, getSettings } from "./db.js";

const CACHE_SECONDS = 1800;   // links from Apple expire after a while, so refresh regularly
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function albumToken(link) {
  if (!link) return null;
  const m = String(link).match(/#([A-Za-z0-9]+)/) || String(link).match(/^([A-Za-z0-9]{10,})$/);
  return m ? m[1] : null;
}

export function albumBase(token) {
  const b62 = (s) => [...s].reduce((n, ch) => n * 62 + B62.indexOf(ch), 0);
  const partition = token[0] === "A" ? b62(token[1]) : b62(token.slice(1, 3));
  return `https://p${String(partition).padStart(2, "0")}-sharedstreams.icloud.com/${token}/sharedstreams/`;
}

const HEADERS = {
  "content-type": "text/plain",
  origin: "https://www.icloud.com",
  referer: "https://www.icloud.com/",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
};

async function post(url, body) {
  return fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body), redirect: "manual" });
}

export async function loadAlbum(token, fetcher = post) {
  let base = albumBase(token);
  let res = await fetcher(base + "webstream", { streamCtag: null });
  if (res.status === 330) {
    const hop = await res.json();
    const host = hop["X-Apple-MMe-Host"];
    if (!host) throw new Error("No redirect host");
    base = `https://${host}/${token}/sharedstreams/`;
    res = await fetcher(base + "webstream", { streamCtag: null });
  }
  if (!res.ok) throw new Error("Album HTTP " + res.status);
  const stream = await res.json();

  // Pick the biggest still-photo version up to 2048px wide for each picture.
  const pics = [];
  for (const p of stream.photos || []) {
    if (p.mediaAssetType === "video") continue;
    let best = null;
    for (const [key, d] of Object.entries(p.derivatives || {})) {
      if (!/^\d+$/.test(key)) continue;
      const w = +d.width || +key;
      if (w > 2048) continue;
      if (!best || w > best.w) best = { w, h: +d.height || 0, checksum: d.checksum };
    }
    if (best) pics.push({ guid: p.photoGuid, checksum: best.checksum, w: best.w, h: best.h, caption: p.caption || "", date: p.dateCreated || null });
  }

  const urls = {};
  for (let i = 0; i < pics.length; i += 25) {
    const r = await fetcher(base + "webasseturls", { photoGuids: pics.slice(i, i + 25).map((p) => p.guid) });
    if (!r.ok) continue;
    const data = await r.json();
    for (const [checksum, loc] of Object.entries(data.items || {})) {
      urls[checksum] = `https://${loc.url_location}${loc.url_path}`;
    }
  }
  return {
    name: stream.streamName || "",
    photos: pics.filter((p) => urls[p.checksum]).map((p) => ({ url: urls[p.checksum], w: p.w, h: p.h, caption: p.caption, date: p.date })),
  };
}

export async function handlePhotos(request, env, ctx) {
  const settings = await getSettings(env.DB);
  const token = albumToken(settings.album);
  if (!token) return json({ photos: [], name: "" });

  const key = new Request("https://cache.family-board/album/" + token);
  const cache = caches.default;
  if (!new URL(request.url).searchParams.has("fresh")) {
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
  try {
    const album = await loadAlbum(token);
    const body = JSON.stringify({ ...album, fetched: new Date().toISOString() });
    ctx.waitUntil(cache.put(key, new Response(body, { headers: { "content-type": "application/json", "cache-control": `max-age=${CACHE_SECONDS}` } })));
    return new Response(body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch (e) {
    return json({ photos: [], name: "", error: "Couldn't load the shared album. Check Public Website is switched on for it." });
  }
}
