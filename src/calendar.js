// GET /api/calendar: events from the signed-in iCloud calendars and any published calendar links.
import ICAL from "ical.js";
import { json, getSettings } from "./db.js";
import { icloudEvents } from "./caldav.js";

const DAYS_AHEAD = 21;
const CACHE_SECONDS = 600;

// Used when a feed refers to Europe/London without including its definition.
const LONDON_TZ = `BEGIN:VCALENDAR
BEGIN:VTIMEZONE
TZID:Europe/London
BEGIN:DAYLIGHT
TZOFFSETFROM:+0000
TZOFFSETTO:+0100
TZNAME:BST
DTSTART:19810329T010000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0100
TZOFFSETTO:+0000
TZNAME:GMT
DTSTART:19961027T020000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
END:VCALENDAR`;

let londonRegistered = false;
function registerLondon() {
  if (londonRegistered) return;
  const comp = new ICAL.Component(ICAL.parse(LONDON_TZ));
  ICAL.TimezoneService.register(comp.getFirstSubcomponent("vtimezone"));
  londonRegistered = true;
}

const dateOnly = (t) => `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;

function toOut(start, end, ev, cal, tz) {
  const allDay = start.isDate;
  // Floating times (no zone) are treated as the family's own time zone.
  const fix = (t) => {
    if (!t.isDate && t.zone === ICAL.Timezone.localTimezone) {
      const z = ICAL.TimezoneService.get(tz);
      if (z) t = ICAL.Time.fromData({ year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute, second: t.second }, z);
    }
    return t;
  };
  return {
    cal: cal.id,
    title: ev.summary || "Busy",
    location: ev.location || "",
    allDay,
    start: allDay ? dateOnly(start) : fix(start).toJSDate().toISOString(),
    end: end ? (allDay ? dateOnly(end) : fix(end).toJSDate().toISOString()) : null,
  };
}

export function eventsFromIcs(text, cal, from, to, tz = "Europe/London") {
  registerLondon();
  const root = new ICAL.Component(ICAL.parse(text));
  for (const vtz of root.getAllSubcomponents("vtimezone")) {
    try { ICAL.TimezoneService.register(vtz); } catch {}
  }
  const rangeStart = ICAL.Time.fromJSDate(from, true);
  const rangeEnd = ICAL.Time.fromJSDate(to, true);
  const all = root.getAllSubcomponents("vevent").map((v) => new ICAL.Event(v));
  const masters = new Map();
  const loose = [];
  for (const ev of all) {
    if (!ev.isRecurrenceException()) masters.set(ev.uid, ev);
  }
  for (const ev of all) {
    if (ev.isRecurrenceException()) {
      const m = masters.get(ev.uid);
      if (m) m.relateException(ev);
      else loose.push(ev);
    }
  }
  const out = [];
  const overlaps = (s, e) => {
    const end = e || s;
    return s.compare(rangeEnd) < 0 && (end.compare(rangeStart) > 0 || (s.isDate && s.compare(rangeStart) >= 0));
  };
  for (const ev of [...masters.values(), ...loose]) {
    try {
      if ((ev.component.getFirstPropertyValue("status") || "").toUpperCase() === "CANCELLED") continue;
      if (!ev.isRecurring()) {
        if (overlaps(ev.startDate, ev.endDate)) out.push(toOut(ev.startDate, ev.endDate, ev, cal, tz));
        continue;
      }
      const it = ev.iterator();
      let next, guard = 0;
      while ((next = it.next()) && guard++ < 5000) {
        if (next.compare(rangeEnd) >= 0) break;
        const d = ev.getOccurrenceDetails(next);
        if ((d.item.component.getFirstPropertyValue("status") || "").toUpperCase() === "CANCELLED") continue;
        if (overlaps(d.startDate, d.endDate)) out.push(toOut(d.startDate, d.endDate, d.item, cal, tz));
      }
    } catch {
      // Skip a single malformed event rather than losing the whole calendar.
    }
  }
  return out;
}

async function fetchIcs(url) {
  const res = await fetch(url.replace(/^webcal:\/\//i, "https://"), {
    headers: { "user-agent": "Mozilla/5.0 (Family board)", accept: "text/calendar, */*" },
    cf: { cacheTtl: 300 },
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.text();
}

// Events from every connected calendar between two dates, sorted. Used by the board and by Siri.
export async function loadEvents(settings, from, to, env) {
  const cals = settings.calendars || [];
  const [results, ic] = await Promise.all([
    Promise.allSettled(cals.map(async (c) => eventsFromIcs(await fetchIcs(c.url), c, from, to, settings.tz))),
    icloudEvents(env, settings, from, to),
  ]);
  const events = [...ic.events];
  const errors = [...ic.errors];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") events.push(...r.value);
    else errors.push({ cal: cals[i].id, name: cals[i].name, error: "Couldn't load this calendar. Check its share link is still switched on." });
  });
  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.allDay ? -1 : 1));
  return { events, errors };
}

export async function handleCalendar(request, env, ctx) {
  const settings = await getSettings(env.DB);
  const cals = [...(settings.icloud?.cals || []).filter((c) => c.show), ...(settings.calendars || [])];
  if (!cals.length) return json({ events: [], calendars: [], errors: [] });

  // Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD (the month view), otherwise yesterday to three weeks ahead.
  const q = new URL(request.url).searchParams;
  const isoOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "") && !isNaN(Date.parse(v + "T00:00:00Z"));
  let range = "";
  let from = new Date(Date.now() - 24 * 3600e3);
  let to = new Date(Date.now() + DAYS_AHEAD * 24 * 3600e3);
  if (isoOk(q.get("from")) && isoOk(q.get("to"))) {
    const f = new Date(q.get("from") + "T00:00:00Z"), t = new Date(q.get("to") + "T00:00:00Z");
    const span = (t - f) / 864e5;
    const farOff = Math.abs(f - Date.now()) / 864e5;
    if (span < 0 || span > 70 || farOff > 800) return json({ error: "Pick a range of up to ten weeks." }, 400);
    // A day either side so events in other time zones aren't cut off
    from = new Date(f.getTime() - 864e5);
    to = new Date(t.getTime() + 2 * 864e5);
    range = q.get("from") + "_" + q.get("to");
  }

  const key = new Request("https://cache.family-board/cal/" + encodeURIComponent(cals.map((c) => c.url + c.colour).join("|")) + "/" + range);
  const cache = caches.default;
  const fresh = q.has("fresh");
  if (!fresh) {
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }

  const { events, errors } = await loadEvents(settings, from, to, env);
  const body = JSON.stringify({
    events,
    calendars: cals.map(({ id, name, colour }) => ({ id, name, colour })),
    errors,
    fetched: new Date().toISOString(),
  });
  if (!errors.length) {
    ctx.waitUntil(cache.put(key, new Response(body, { headers: { "content-type": "application/json", "cache-control": `max-age=${CACHE_SECONDS}` } })));
  }
  return new Response(body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
