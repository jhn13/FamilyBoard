// Database schema (D1, bound as DB) and small shared helpers.

export const DEFAULT_SETTINGS = {
  title: "Our board",
  tz: "Europe/London",
  location: { name: "Leeds", lat: 53.7997, lon: -1.5492 },
  calendars: [],        // [{ id, name, url, colour }]
  album: "",            // iCloud shared album public link
  idleMinutes: 3,
  nightStart: "22:00",
  nightEnd: "06:30",
  slideSeconds: 20,
};

let ready = false;
export async function ensureSchema(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS devices (token TEXT PRIMARY KEY, name TEXT, created TEXT, last_seen TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, name TEXT NOT NULL, colour TEXT, emoji TEXT, kid INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0)"),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS chores (id TEXT PRIMARY KEY, title TEXT NOT NULL, people TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0, " +
      "repeat TEXT NOT NULL DEFAULT 'daily', days TEXT NOT NULL DEFAULT '0123456', active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, created TEXT)"
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS completions (id TEXT PRIMARY KEY, chore_id TEXT NOT NULL, person_id TEXT NOT NULL, period TEXT NOT NULL, day TEXT NOT NULL, " +
      "title TEXT, amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', created TEXT, approved TEXT, UNIQUE (chore_id, person_id, period))"
    ),
    db.prepare("CREATE TABLE IF NOT EXISTS payouts (id TEXT PRIMARY KEY, person_id TEXT NOT NULL, amount INTEGER NOT NULL, created TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS todos (id TEXT PRIMARY KEY, text TEXT NOT NULL, person_id TEXT, done INTEGER NOT NULL DEFAULT 0, created TEXT, done_at TEXT)"),
  ]);
  ready = true;
}

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

export const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);
export const nowIso = () => new Date().toISOString();

export async function getMeta(db, key) {
  const row = await db.prepare("SELECT value FROM meta WHERE key = ?").bind(key).first();
  return row ? row.value : null;
}
export async function setMeta(db, key, value) {
  await db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").bind(key, value).run();
}

export async function getSettings(db) {
  const raw = await getMeta(db, "settings");
  let s = {};
  try { s = raw ? JSON.parse(raw) : {}; } catch { s = {}; }
  return { ...DEFAULT_SETTINGS, ...s };
}

// Local calendar date (YYYY-MM-DD) and weekday (0 = Monday) in the family's time zone.
export function localDay(tz, date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      .formatToParts(date).map((x) => [x.type, x.value])
  );
  const iso = `${p.year}-${p.month}-${p.day}`;
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday);
  return { iso, weekday };
}

export function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
