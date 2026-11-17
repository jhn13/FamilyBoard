// Parent PIN (hashed with PBKDF2) and remembered devices (a long-lived cookie).
import { json, getMeta, setMeta, nowIso } from "./db.js";

const COOKIE = "fb_device";
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const randomHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPin(pin, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100000 },
    key, 256
  );
  return hex(bits);
}

export const validPin = (pin) => typeof pin === "string" && /^\d{4,8}$/.test(pin);

export async function hasPin(db) {
  return !!(await getMeta(db, "pin_hash"));
}

export async function setPin(db, pin) {
  const salt = randomHex(16);
  await setMeta(db, "pin_salt", salt);
  await setMeta(db, "pin_hash", await hashPin(pin, salt));
  // The length lets the PIN pad check the PIN as soon as the last digit is tapped.
  await setMeta(db, "pin_len", String(pin.length));
}

// Checks the PIN, with a short lock-out after repeated wrong guesses.
// Returns { ok } or { ok: false, locked, error }.
export async function checkPin(db, pin) {
  let fails = { count: 0, until: 0 };
  try { fails = JSON.parse((await getMeta(db, "pin_fails")) || "{}"); } catch {}
  fails.count = fails.count || 0;
  if (fails.until && Date.now() < fails.until) {
    return { ok: false, locked: true, error: "Too many wrong tries. Wait a few minutes and try again." };
  }
  const salt = await getMeta(db, "pin_salt");
  const hash = await getMeta(db, "pin_hash");
  if (validPin(pin) && salt && hash && (await hashPin(pin, salt)) === hash) {
    if (fails.count) await setMeta(db, "pin_fails", JSON.stringify({ count: 0, until: 0 }));
    if (!(await getMeta(db, "pin_len"))) await setMeta(db, "pin_len", String(pin.length));  // PINs set before this was stored
    return { ok: true };
  }
  fails.count += 1;
  if (fails.count >= MAX_FAILS) fails = { count: 0, until: Date.now() + LOCK_MS };
  await setMeta(db, "pin_fails", JSON.stringify(fails));
  return { ok: false, error: "That PIN isn't right." };
}

function readCookie(request) {
  const raw = request.headers.get("cookie") || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([a-f0-9]{64})"));
  return m ? m[1] : null;
}

export async function deviceFor(request, db) {
  const token = readCookie(request);
  if (!token) return null;
  const row = await db.prepare("SELECT token, last_seen FROM devices WHERE token = ?").bind(token).first();
  if (!row) return null;
  // Touch last_seen at most once an hour
  if (!row.last_seen || Date.now() - Date.parse(row.last_seen) > 3600e3) {
    await db.prepare("UPDATE devices SET last_seen = ? WHERE token = ?").bind(nowIso(), token).run();
  }
  return token;
}

export async function newDevice(db, name) {
  const token = randomHex(32);
  await db.prepare("INSERT INTO devices (token, name, created, last_seen) VALUES (?, ?, ?, ?)")
    .bind(token, String(name || "").slice(0, 60) || null, nowIso(), nowIso()).run();
  return token;
}

export function deviceCookie(token, secure) {
  return `${COOKIE}=${token}; Path=/; Max-Age=315360000; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

// POST /api/setup (first run: choose the PIN) and /api/pair (remember this device)
export async function handleGate(request, env, path) {
  const db = env.DB;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const secure = new URL(request.url).protocol === "https:";

  if (path === "/api/setup") {
    if (await hasPin(db)) return json({ error: "This board is already set up. Enter the parent PIN instead." }, 409);
    if (!validPin(body.pin)) return json({ error: "Choose a PIN of 4 to 8 digits." }, 400);
    await setPin(db, body.pin);
    const token = await newDevice(db, body.device);
    return json({ ok: true }, 200, { "set-cookie": deviceCookie(token, secure) });
  }

  if (path === "/api/pair") {
    if (!(await hasPin(db))) return json({ error: "This board isn't set up yet." }, 409);
    const res = await checkPin(db, body.pin);
    if (!res.ok) return json({ error: res.error }, res.locked ? 429 : 403);
    const token = await newDevice(db, body.device);
    return json({ ok: true }, 200, { "set-cookie": deviceCookie(token, secure) });
  }
  return json({ error: "Not found" }, 404);
}
