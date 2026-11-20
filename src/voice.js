// GET /api/voice?key=…&say=… : what Siri heard, sent by an iPhone or iPad Shortcut.
// Replies with a short sentence for Siri to read out.
import { getMeta, getSettings, id, nowIso, localDay, addDays } from "./db.js";
import { startTimer } from "./api.js";
import { loadEvents } from "./calendar.js";

const WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, "twenty five": 25, thirty: 30, forty: 40, "forty five": 45, fifty: 50, sixty: 60, ninety: 90,
};
const NUM = "(\\d+(?:\\.\\d+)?|" + Object.keys(WORDS).sort((a, b) => b.length - a.length).join("|") + ")";
const UNIT = "(hours?|hrs?|minutes?|mins?|seconds?|secs?)";

// Finds a length of time in a sentence: "10 minutes", "an hour and a half", "half an hour", "1 hour 20 minutes".
// Returns { secs, rest } where rest is the sentence with the time taken out.
export function parseDuration(text) {
  let t = " " + text.toLowerCase().replace(/-/g, " ") + " ";
  let secs = 0;
  const take = (re, fn) => { t = t.replace(re, (...m) => { secs += fn(...m); return " "; }); };
  take(/\bhalf an hour\b/g, () => 1800);
  take(/\ba quarter of an hour\b/g, () => 900);
  take(new RegExp(`\\b${NUM}\\s*${UNIT}\\s+and a half\\b`, "g"), (_, n, u) => toSecs(n, u) + toSecs(0.5, u));
  take(new RegExp(`\\b${NUM}\\s*${UNIT}\\b`, "g"), (_, n, u) => toSecs(n, u));
  return { secs: Math.round(secs), rest: t.replace(/\s+/g, " ").trim() };
}
function toSecs(n, unit) {
  const v = typeof n === "number" ? n : WORDS[n] ?? parseFloat(n);
  if (/^h/.test(unit)) return v * 3600;
  if (/^m/.test(unit)) return v * 60;
  return v;
}

export function sayDuration(secs) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} minute${m > 1 ? "s" : ""}`);
  if (s && !h) parts.push(`${s} second${s > 1 ? "s" : ""}`);
  return parts.join(" and ") || "0 seconds";
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Works out what was asked. Pure function so it can be tested on its own.
export function understand(said) {
  const text = said.trim().replace(/[.?!]+$/, "");
  const low = text.toLowerCase();
  if (!low) return { intent: "help" };

  if (/\b(cancel|stop|clear|delete|remove)\b/.test(low) && /\btimers?\b/.test(low)) return { intent: "timer.cancel" };
  if (/\b(how long|how much time|time left|how's the timer|how is the timer)\b/.test(low)) return { intent: "timer.left" };

  const { secs, rest } = parseDuration(low);
  if (secs > 0 && (/\b(timer|alarm|countdown)\b/.test(low) || rest.split(" ").length <= 4)) {
    const label = rest
      .replace(/\b(set|start|put|make|a|an|the|on|timer|alarm|countdown|for|please|board|kitchen|me|us|can you|could you)\b/g, " ")
      .replace(/\s+/g, " ").trim();
    return { intent: "timer.start", secs, label: label ? cap(label) : "" };
  }

  const day = /\btomorrow\b/.test(low) ? 1 : /\btoday|tonight|this evening\b/.test(low) ? 0 : null;
  if (/\b(what'?s on|what is on|what have we got|what do we have|what's happening|whats happening|calendar|plans|diary)\b/.test(low)) {
    return { intent: "calendar", day: day ?? 0 };
  }

  let m = low.match(/^(?:please\s+)?(?:add|put|write)\s+(.+?)(?:\s+(?:to|on|onto)\s+(?:the\s+|our\s+)?(?:to ?do list|todo list|to-do list|shopping list|list|board))?$/);
  if (!m) m = low.match(/^(?:remind (?:us|me) to|we need to|don't forget to|dont forget to)\s+(.+)$/);
  if (!m) m = low.match(/^we need\s+(.+)$/);
  if (m) {
    const start = text.toLowerCase().indexOf(m[1]);
    const item = (start >= 0 ? text.slice(start, start + m[1].length) : m[1]).trim();
    return { intent: "todo.add", text: cap(item), said: item };
  }
  return { intent: "help" };
}

function timeIn(tz, iso) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso)).replace(":00", "").replace(" ", "");
}
const listJoin = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

export async function handleVoice(request, env) {
  const db = env.DB;
  const q = new URL(request.url).searchParams;
  const reply = (s, status = 200) => new Response(s, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

  const key = await getMeta(db, "voice_key");
  const given = q.get("key") || "";
  if (!key || given.length !== key.length || !timingSafe(given, key)) {
    return reply("The family board didn't recognise this shortcut. Check its link in the board's Siri settings.", 403);
  }

  const settings = await getSettings(db);
  const tz = settings.tz;
  const u = understand(q.get("say") || "");

  switch (u.intent) {
    case "timer.start": {
      if (u.secs < 5 || u.secs > 24 * 3600) return reply("Timers can be between 5 seconds and 24 hours.");
      await startTimer(db, u.secs, u.label);
      return reply(`${u.label ? u.label + " timer" : "Timer"} set for ${sayDuration(u.secs)}.`);
    }
    case "timer.cancel": {
      const r = await db.prepare("UPDATE timers SET dismissed = 1 WHERE dismissed = 0").run();
      return reply(r.meta?.changes ? "Timers cancelled." : "There aren't any timers running.");
    }
    case "timer.left": {
      const rows = (await db.prepare("SELECT label, ends_at FROM timers WHERE dismissed = 0 AND ends_at > ? ORDER BY ends_at").bind(Date.now()).all()).results;
      if (!rows.length) return reply("There aren't any timers running.");
      return reply(listJoin(rows.map((t) => `${t.label || "the timer"} has ${sayDuration(Math.round((t.ends_at - Date.now()) / 1000))} left`)) .replace(/^./, (c) => c.toUpperCase()) + ".");
    }
    case "todo.add": {
      if (!u.text) return reply("What should I add?");
      await db.prepare("INSERT INTO todos (id, text, person_id, done, created) VALUES (?, ?, NULL, 0, ?)").bind(id(), u.text.slice(0, 200), nowIso()).run();
      return reply(`Added ${u.said || u.text} to the board.`);
    }
    case "calendar": {
      if (!(settings.calendars || []).length) return reply("There's no calendar connected to the board yet.");
      const today = localDay(tz).iso;
      const dayIso = addDays(today, u.day);
      const { events } = await loadEvents(settings, new Date(Date.now() - 864e5), new Date(Date.now() + 3 * 864e5), env);
      const now = Date.now();
      const items = events.filter((e) => {
        if (e.allDay) return e.start <= dayIso && (e.end || addDays(e.start, 1)) > dayIso;
        const d = localDay(tz, new Date(e.start)).iso;
        return d === dayIso && (u.day > 0 || Date.parse(e.end || e.start) > now);
      });
      const when = u.day ? "Tomorrow" : "Today";
      if (!items.length) return reply(u.day ? "Nothing on the calendar tomorrow." : "Nothing else on the calendar today.");
      const said = items.slice(0, 6).map((e) => (e.allDay ? e.title : `${e.title} at ${timeIn(tz, e.start)}`));
      return reply(`${when}: ${listJoin(said)}${items.length > 6 ? `, and ${items.length - 6} more` : ""}.`);
    }
    default:
      return reply("I can set timers, add things to the to-do list, and tell you what's on. Try saying: pasta timer for 10 minutes.");
  }
}

function timingSafe(a, b) {
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
