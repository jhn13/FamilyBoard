// /api/state (everything the board shows) and /api/do (every change).
import { json, id, nowIso, getSettings, setMeta, localDay, addDays, DEFAULT_SETTINGS } from "./db.js";
import { checkPin, setPin, validPin } from "./auth.js";

export const BUILD = "2026-11-20.1";

const COLOURS = ["#F0648A", "#2E9BE6", "#F2B320", "#2DB56B", "#8C62E8", "#F5823A"];
const str = (v, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const pence = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
};

function periodFor(chore, today, weekStart) {
  if (chore.repeat === "weekly") return "W" + weekStart;
  if (chore.repeat === "once") return "once";
  return today.iso;
}

export async function state(env, { parent = false } = {}) {
  const db = env.DB;
  const settings = await getSettings(db);
  const today = localDay(settings.tz);
  const weekStart = addDays(today.iso, -today.weekday);
  const cutoff = new Date(Date.now() - 18 * 3600e3).toISOString();

  const [people, chores, comps, owed, payouts, todos] = await db.batch([
    db.prepare("SELECT id, name, colour, emoji, kid FROM people ORDER BY sort, name"),
    db.prepare("SELECT id, title, people, amount, repeat, days, sort FROM chores WHERE active = 1 ORDER BY sort, created"),
    db.prepare(
      "SELECT id, chore_id, person_id, period, day, title, amount, status, created FROM completions " +
      "WHERE day >= ? OR status = 'pending' OR period = 'once' ORDER BY created"
    ).bind(weekStart),
    db.prepare(
      "SELECT p.id AS person_id, " +
      "COALESCE((SELECT SUM(amount) FROM completions c WHERE c.person_id = p.id AND c.status = 'approved'), 0) - " +
      "COALESCE((SELECT SUM(amount) FROM payouts y WHERE y.person_id = p.id), 0) AS owed FROM people p"
    ),
    db.prepare("SELECT id, person_id, amount, created FROM payouts ORDER BY created DESC LIMIT 20"),
    db.prepare("SELECT id, text, person_id, done, created, done_at FROM todos WHERE done = 0 OR done_at > ? ORDER BY done, created").bind(cutoff),
  ]);

  const safeSettings = { ...settings, calendars: settings.calendars.map(({ url, ...c }) => (parent ? { url, ...c } : c)) };
  safeSettings.hasAlbum = !!settings.album;
  if (!parent) delete safeSettings.album;

  return {
    build: BUILD,
    today: today.iso,
    weekday: today.weekday,
    weekStart,
    settings: safeSettings,
    people: people.results,
    chores: chores.results.map((c) => ({ ...c, people: c.people ? c.people.split(",") : [] })),
    completions: comps.results,
    owed: Object.fromEntries(owed.results.map((r) => [r.person_id, r.owed])),
    payouts: payouts.results,
    todos: todos.results,
  };
}

// Actions anyone on a remembered device can do (kids included).
const OPEN = new Set(["todo.add", "todo.toggle", "todo.delete", "chore.done", "chore.undo", "pin.check"]);

export async function handleDo(request, env) {
  const db = env.DB;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let b;
  try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const action = str(b.action, 40);

  let parent = false;
  if (b.pin) {
    const res = await checkPin(db, String(b.pin));
    if (!res.ok) return json({ error: res.error, pin: false }, res.locked ? 429 : 403);
    parent = true;
  }
  if (!OPEN.has(action) && !parent) return json({ error: "A parent PIN is needed for that.", pin: false }, 403);

  const settings = await getSettings(db);
  const today = localDay(settings.tz);
  const weekStart = addDays(today.iso, -today.weekday);

  switch (action) {
    case "pin.check":
      if (!parent) return json({ error: "Enter the parent PIN.", pin: false }, 403);
      break;

    // ---- To-dos
    case "todo.add": {
      const text = str(b.text, 200);
      if (!text) return json({ error: "Write what needs doing." }, 400);
      await db.prepare("INSERT INTO todos (id, text, person_id, done, created) VALUES (?, ?, ?, 0, ?)")
        .bind(id(), text, str(b.person, 40) || null, nowIso()).run();
      break;
    }
    case "todo.toggle":
      await db.prepare("UPDATE todos SET done = 1 - done, done_at = CASE WHEN done = 0 THEN ? ELSE NULL END WHERE id = ?")
        .bind(nowIso(), str(b.id, 40)).run();
      break;
    case "todo.delete":
      await db.prepare("DELETE FROM todos WHERE id = ?").bind(str(b.id, 40)).run();
      break;

    // ---- Chores: kids tick, parents approve
    case "chore.done": {
      const chore = await db.prepare("SELECT * FROM chores WHERE id = ? AND active = 1").bind(str(b.chore, 40)).first();
      const person = str(b.person, 40);
      if (!chore || !chore.people.split(",").includes(person)) return json({ error: "That chore isn't on the list any more." }, 404);
      const period = periodFor(chore, today, weekStart);
      await db.prepare(
        "INSERT OR IGNORE INTO completions (id, chore_id, person_id, period, day, title, amount, status, created, approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(id(), chore.id, person, period, today.iso, chore.title, chore.amount, parent ? "approved" : "pending", nowIso(), parent ? nowIso() : null).run();
      break;
    }
    case "chore.undo": {
      // Kids can take back a tick that hasn't been approved; parents can take back any.
      const sql = parent ? "DELETE FROM completions WHERE id = ?" : "DELETE FROM completions WHERE id = ? AND status = 'pending'";
      await db.prepare(sql).bind(str(b.id, 40)).run();
      break;
    }
    case "chore.approve": {
      const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map((x) => str(x, 40)).filter(Boolean).slice(0, 200);
      if (ids.length) {
        await db.batch(ids.map((x) => db.prepare("UPDATE completions SET status = 'approved', approved = ? WHERE id = ? AND status = 'pending'").bind(nowIso(), x)));
      }
      break;
    }
    case "chore.save": {
      const title = str(b.title, 80);
      const people = (Array.isArray(b.people) ? b.people : []).map((x) => str(x, 40)).filter(Boolean);
      const amount = pence(b.amount);
      const repeat = ["daily", "weekly", "once"].includes(b.repeat) ? b.repeat : "daily";
      const days = typeof b.days === "string" ? [...new Set(b.days.replace(/[^0-6]/g, ""))].sort().join("") : "0123456";
      if (!title) return json({ error: "Give the chore a name." }, 400);
      if (!people.length) return json({ error: "Pick who does this chore." }, 400);
      if (amount === null) return json({ error: "Enter an amount like 0.50." }, 400);
      if (repeat === "daily" && !days) return json({ error: "Pick at least one day." }, 400);
      if (b.id) {
        await db.prepare("UPDATE chores SET title = ?, people = ?, amount = ?, repeat = ?, days = ? WHERE id = ?")
          .bind(title, people.join(","), amount, repeat, days, str(b.id, 40)).run();
      } else {
        const max = await db.prepare("SELECT COALESCE(MAX(sort), 0) AS m FROM chores").first();
        await db.prepare("INSERT INTO chores (id, title, people, amount, repeat, days, active, sort, created) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)")
          .bind(id(), title, people.join(","), amount, repeat, days, (max?.m || 0) + 1, nowIso()).run();
      }
      break;
    }
    case "chore.delete":
      // Keep the history (and money earned) - just stop showing the chore.
      await db.prepare("UPDATE chores SET active = 0 WHERE id = ?").bind(str(b.id, 40)).run();
      break;

    // ---- Pocket money
    case "payout": {
      const person = str(b.person, 40);
      const amount = pence(b.amount);
      if (!person || !amount) return json({ error: "Nothing to pay." }, 400);
      await db.prepare("INSERT INTO payouts (id, person_id, amount, created) VALUES (?, ?, ?, ?)").bind(id(), person, amount, nowIso()).run();
      break;
    }

    // ---- Family members
    case "person.save": {
      const name = str(b.name, 40);
      if (!name) return json({ error: "Enter a name." }, 400);
      const colour = /^#[0-9a-fA-F]{6}$/.test(b.colour || "") ? b.colour : null;
      const emoji = str(b.emoji, 16) || null;
      const kid = b.kid ? 1 : 0;
      if (b.id) {
        await db.prepare("UPDATE people SET name = ?, colour = COALESCE(?, colour), emoji = ?, kid = ? WHERE id = ?")
          .bind(name, colour, emoji, kid, str(b.id, 40)).run();
      } else {
        const count = await db.prepare("SELECT COUNT(*) AS n FROM people").first();
        const n = count?.n || 0;
        await db.prepare("INSERT INTO people (id, name, colour, emoji, kid, sort) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(id(), name, colour || COLOURS[n % COLOURS.length], emoji, kid, n + 1).run();
      }
      break;
    }
    case "person.delete":
      await db.prepare("DELETE FROM people WHERE id = ?").bind(str(b.id, 40)).run();
      break;
    case "person.order": {
      const ids = (Array.isArray(b.ids) ? b.ids : []).map((x) => str(x, 40)).slice(0, 30);
      if (ids.length) await db.batch(ids.map((x, i) => db.prepare("UPDATE people SET sort = ? WHERE id = ?").bind(i + 1, x)));
      break;
    }

    // ---- Settings
    case "settings.save": {
      const s = b.settings || {};
      const next = { ...settings };
      if ("theme" in s) next.theme = s.theme === "chalk" ? "chalk" : "bright";
      if ("title" in s) next.title = str(s.title, 40) || DEFAULT_SETTINGS.title;
      if (s.location && Number.isFinite(+s.location.lat) && Number.isFinite(+s.location.lon)) {
        next.location = { name: str(s.location.name, 60), lat: +(+s.location.lat).toFixed(4), lon: +(+s.location.lon).toFixed(4) };
      }
      if (Array.isArray(s.calendars)) {
        next.calendars = s.calendars.slice(0, 12).map((c) => ({
          id: str(c.id, 40) || id(),
          name: str(c.name, 40) || "Calendar",
          url: str(c.url, 600).replace(/^webcal:\/\//i, "https://"),
          colour: /^#[0-9a-fA-F]{6}$/.test(c.colour || "") ? c.colour : COLOURS[0],
        })).filter((c) => /^https:\/\//.test(c.url));
      }
      if ("album" in s) next.album = str(s.album, 300);
      if ("idleMinutes" in s) next.idleMinutes = Math.min(60, Math.max(1, Math.round(+s.idleMinutes) || 3));
      if ("slideSeconds" in s) next.slideSeconds = Math.min(300, Math.max(5, Math.round(+s.slideSeconds) || 20));
      for (const k of ["nightStart", "nightEnd"]) if (k in s && /^([01]\d|2[0-3]):[0-5]\d$/.test(s[k] || "")) next[k] = s[k];
      if ("nightOff" in s) next.nightOff = !!s.nightOff;
      await setMeta(db, "settings", JSON.stringify(next));
      break;
    }
    case "pin.change":
      if (!validPin(b.newPin)) return json({ error: "Choose a PIN of 4 to 8 digits." }, 400);
      await setPin(db, b.newPin);
      return json({ ok: true, state: await state(env, { parent: false }) });
    case "devices.forget": {
      // Signs out every other phone/iPad; they'll need the PIN again.
      const keep = (request.headers.get("cookie") || "").match(/fb_device=([a-f0-9]{64})/)?.[1] || "";
      await db.prepare("DELETE FROM devices WHERE token != ?").bind(keep).run();
      break;
    }
    default:
      return json({ error: "Unknown action" }, 400);
  }
  return json({ ok: true, parent, state: await state(env, { parent }) });
}
