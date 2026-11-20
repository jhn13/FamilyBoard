// Two-way calendars through iCloud (CalDAV). The board signs in as the family's own Apple account
// with an app-specific password. Josh's and his wife's calendars are shared to that account, so
// the board can read all of them and add events that then show on everyone's iPhone.
import { createAccount, fetchCalendars, fetchCalendarObjects, createCalendarObject, propfind, getBasicAuthHeaders, DAVNamespaceShort } from "tsdav";
import { getMeta } from "./db.js";
import { eventsFromIcs } from "./calendar.js";

const ICLOUD = "https://caldav.icloud.com";
// Matches the board's palette when a calendar has no colour of its own.
const COLOURS = ["#2E9BE6", "#F0648A", "#2DB56B", "#F2B320", "#8C62E8", "#F5823A"];

export const serverUrl = (env) => (env && env.CALDAV_URL) || ICLOUD;

function headers(user, password) {
  return getBasicAuthHeaders({ username: user, password });
}

async function shortHash(text) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return "ic" + [...new Uint8Array(buf)].slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function niceColour(c, i) {
  const m = /^#?([0-9a-f]{6})/i.exec(c || "");
  return m ? "#" + m[1].toUpperCase() : COLOURS[i % COLOURS.length];
}

// Signs in and lists every calendar the account can see (its own and ones shared with it).
// Throws an Error with a message fit to show on the board.
export async function discover(env, user, password) {
  const h = headers(user, password);
  let account;
  try {
    account = await createAccount({ account: { serverUrl: serverUrl(env), accountType: "caldav" }, headers: h });
  } catch (e) {
    const msg = String(e && e.message || e);
    if (/401|403|unauthori[sz]ed|invalid credentials/i.test(msg)) {
      throw new Error("Apple didn't accept that email and password. Use an app-specific password, not the normal Apple Account password.");
    }
    throw new Error("Couldn't reach iCloud. Check the iPad is online and try again.");
  }
  if (!account.homeUrl) throw new Error("Apple didn't accept that email and password. Use an app-specific password, not the normal Apple Account password.");
  const all = await fetchCalendars({ account, headers: h });
  const cals = all.filter((c) => !c.components || c.components.includes("VEVENT"));
  return Promise.all(cals.map(async (c, i) => ({
    id: await shortHash(c.url),
    url: c.url,
    name: (typeof c.displayName === "string" && c.displayName.trim()) || "Calendar",
    colour: niceColour(c.calendarColor, i),
    readOnly: await isReadOnly(c.url, h),
  })));
}

async function isReadOnly(url, h) {
  try {
    const res = await propfind({ url, props: { [`${DAVNamespaceShort.DAV}:current-user-privilege-set`]: {} }, depth: "0", headers: h });
    const text = JSON.stringify(res?.[0]?.props?.currentUserPrivilegeSet || "");
    if (!text || text === '""') return false;
    return !/write|all/i.test(text);
  } catch {
    return false; // can't tell: let them try, and a refusal says so
  }
}

async function credentials(db, settings) {
  const user = settings.icloud?.user;
  const password = await getMeta(db, "icloud_pw");
  return user && password ? headers(user, password) : null;
}

// Events from the shown iCloud calendars, in the same shape as the published-link calendars.
export async function icloudEvents(env, settings, from, to) {
  const cals = (settings.icloud?.cals || []).filter((c) => c.show);
  if (!cals.length) return { events: [], errors: [] };
  const h = await credentials(env.DB, settings);
  if (!h) return { events: [], errors: [{ cal: "icloud", name: "iCloud", error: "Sign in to iCloud again in Settings → Calendars." }] };
  const results = await Promise.allSettled(cals.map(async (c) => {
    const objects = await fetchCalendarObjects({
      calendar: { url: c.url },
      headers: h,
      timeRange: { start: from.toISOString(), end: to.toISOString() },
    });
    const out = [];
    for (const o of objects) {
      if (!o.data) continue;
      try { out.push(...eventsFromIcs(o.data, c, from, to, settings.tz)); } catch {}
    }
    return out;
  }));
  const events = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") events.push(...r.value);
    else errors.push({ cal: cals[i].id, name: cals[i].name, error: /401|403/.test(String(r.reason)) ? "iCloud stopped accepting the board's password. Sign in again in Settings → Calendars." : "Couldn't load this calendar from iCloud." });
  });
  return { events, errors };
}

// ---- Writing an event

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Lines longer than 75 bytes are folded, as iCalendar requires.
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = "", len = 0, limit = 75;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > limit) { out.push(cur); cur = ""; len = 0; limit = 74; }
    cur += ch; len += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const LONDON_VTIMEZONE = [
  "BEGIN:VTIMEZONE", "TZID:Europe/London",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0000", "TZOFFSETTO:+0100", "TZNAME:BST", "DTSTART:19810329T010000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0000", "TZNAME:GMT", "DTSTART:19961027T020000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

const compact = (d) => d.replace(/-/g, "");
const nextDay = (iso) => new Date(Date.parse(iso + "T00:00:00Z") + 864e5).toISOString().slice(0, 10);

// The UTC instant for a wall-clock time in a time zone (for zones other than London).
function zonedToUtc(date, time, tz) {
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(guess).map((p) => [p.type, p.value]));
  const shown = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
  return new Date(guess.getTime() - (shown - guess.getTime()));
}
const utcStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

export function buildEvent(ev, tz = "Europe/London") {
  const uid = crypto.randomUUID().toUpperCase() + "@familyboard";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Family board//EN", "CALSCALE:GREGORIAN"];
  const london = tz === "Europe/London";
  if (!ev.allDay && london) lines.push(...LONDON_VTIMEZONE);
  lines.push("BEGIN:VEVENT", "UID:" + uid, "DTSTAMP:" + utcStamp(new Date()), "CREATED:" + utcStamp(new Date()));
  lines.push("SUMMARY:" + esc(ev.title));
  if (ev.location) lines.push("LOCATION:" + esc(ev.location));
  if (ev.notes) lines.push("DESCRIPTION:" + esc(ev.notes));
  if (ev.allDay) {
    lines.push("DTSTART;VALUE=DATE:" + compact(ev.date), "DTEND;VALUE=DATE:" + compact(nextDay(ev.endDate || ev.date)));
  } else if (london) {
    lines.push(`DTSTART;TZID=Europe/London:${compact(ev.date)}T${ev.start.replace(":", "")}00`);
    lines.push(`DTEND;TZID=Europe/London:${compact(ev.endDate || ev.date)}T${ev.end.replace(":", "")}00`);
  } else {
    lines.push("DTSTART:" + utcStamp(zonedToUtc(ev.date, ev.start, tz)), "DTEND:" + utcStamp(zonedToUtc(ev.endDate || ev.date, ev.end, tz)));
  }
  lines.push("TRANSP:" + (ev.allDay ? "TRANSPARENT" : "OPAQUE"), "END:VEVENT", "END:VCALENDAR");
  return { uid, ics: lines.map(fold).join("\r\n") + "\r\n" };
}

// Puts a new event into an iCloud calendar. Returns nothing, throws an Error with a friendly message.
export async function addEvent(env, settings, cal, ev) {
  const h = await credentials(env.DB, settings);
  if (!h) throw new Error("Sign in to iCloud in Settings → Calendars first.");
  const { uid, ics } = buildEvent(ev, settings.tz);
  const res = await createCalendarObject({ calendar: { url: cal.url }, filename: uid.replace(/[^A-Za-z0-9-]/g, "") + ".ics", iCalString: ics, headers: h });
  if (res.ok || res.status === 201 || res.status === 204) return;
  if (res.status === 401) throw new Error("iCloud stopped accepting the board's password. Sign in again in Settings → Calendars.");
  if (res.status === 403) throw new Error(`"${cal.name}" is view-only for the board. Share it with editing allowed.`);
  throw new Error("iCloud didn't save the event (error " + res.status + "). Try again.");
}
