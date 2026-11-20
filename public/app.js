// Family board: calendar, chores with pocket money, to-dos, and a photo screensaver.
"use strict";

/* ---------------- Small helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (p) => (p >= 100 || p === 0 ? "£" + (p / 100).toFixed(2).replace(/\.00$/, "") : p + "p");
const pad2 = (n) => String(n).padStart(2, "0");
const isoDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDaysIso = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoDay(d); };
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COLOURS = ["#F0648A", "#2E9BE6", "#F2B320", "#2DB56B", "#8C62E8", "#F5823A", "#E8534A", "#8D97A5"];
// Colours chosen before the brighter palette, shown as their brighter versions
const OLD_COLOURS = { "#F4A7B9": "#F0648A", "#8FCFE8": "#2E9BE6", "#F4D35E": "#F2B320", "#9BD89A": "#2DB56B", "#C3A8EA": "#8C62E8", "#F6B98A": "#F5823A", "#F29A8E": "#E8534A", "#E8E3D0": "#8D97A5" };
const pc = (c) => OLD_COLOURS[(c || "").toUpperCase()] || c || "#8D97A5";
const PARENT_MINUTES = 5;

const I = {
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1.3"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M18.5 6.5l1.5-1.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
};

/* Weather icons (WMO codes from Open-Meteo) */
function wxIcon(code, day = 1) {
  const s = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const sun = `<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12h2.2M19 12h2.2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5"/>`;
  const moon = `<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>`;
  const cloud = `<path d="M7 18.5h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z"/>`;
  const small = `<g transform="translate(-3 -4) scale(.75)">${day ? sun : moon}</g><g transform="translate(3 2) scale(.85)"><path d="M7 18.5h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z" fill="var(--wx-bg, #1B302B)"/></g>`;
  let body;
  if (code === 0) body = day ? sun : moon;
  else if (code <= 2) body = small;
  else if (code === 3) body = cloud;
  else if (code === 45 || code === 48) body = `<path d="M4 9h16M3 13h18M5 17h14"/>`;
  else if (code >= 71 && code <= 77 || code === 85 || code === 86) body = `<g transform="translate(0 -3)">${cloud}</g><path d="M8 20.5h.01M12 21.5h.01M16 20.5h.01" stroke-width="3"/>`;
  else if (code >= 95) body = `<g transform="translate(0 -3)">${cloud}</g><path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>`;
  else if (code >= 51) body = `<g transform="translate(0 -3)">${cloud}</g><path d="M8 18.5l-1 2.5M12 18.5l-1 2.5M16 18.5l-1 2.5"/>`;
  else body = cloud;
  return `<svg viewBox="0 0 24 24" ${s} aria-hidden="true">${body}</svg>`;
}

function wxText(code) {
  const t = { 0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Light showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorms", 96: "Thunder and hail", 99: "Thunder and hail" };
  return t[code] || "";
}
// "2026-11-20T21:00" (the forecast's own local time) to "9pm"
function hourLabel(t) { const h = +t.slice(11, 13), m = t.slice(14, 16); return `${h % 12 || 12}${m !== "00" ? ":" + m : ""}${h >= 12 ? "pm" : "am"}`; }
// The next n hours of forecast, starting with the current hour
function nextHours(n) {
  const h = WX?.hourly;
  if (!h?.time || !WX.current?.time) return [];
  const nowHour = WX.current.time.slice(0, 13);
  const i = Math.max(0, h.time.findIndex((t) => t.slice(0, 13) >= nowHour));
  return h.time.slice(i, i + n).map((t, k) => ({
    t, label: k === 0 ? "Now" : hourLabel(t), code: h.weather_code[i + k], day: h.is_day[i + k],
    temp: Math.round(h.temperature_2m[i + k]), rain: h.precipitation_probability[i + k] ?? 0,
  }));
}

/* ---------------- App state ---------------- */
let S = null;                 // board state from the server
let SP = null;                // parent-only settings (calendar links, album) when settings are open
let CAL = { events: [], calendars: [], errors: [] };
let PH = { photos: [] };
let WX = null;
let firstBuild = null;
let lastJson = "";
let parent = { pin: null, until: 0 };
let lastTouch = Date.now();
let idleOn = false;
let tab = "today";
let settingsTab = "family";
let justTicked = null;
let PIN_LEN = null;
let clockOffset = 0;          // server time minus this device's time, so timers agree everywhere
let VOICE = null;             // Siri key, only known while settings are open
const silenced = new Set();   // timers stopped on this device, before the server confirms
const nowMs = () => Date.now() + clockOffset;           // length of the parent PIN, so the pad can check it without an OK button

/* ---------------- Server calls ---------------- */
async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401 && data.paired === false) { showGate(); throw new Error("not paired"); }
  if (!res.ok) { const e = new Error(data.error || "Something went wrong. Try again."); e.data = data; e.status = res.status; throw e; }
  return data;
}

// Parent mode stays on until nobody has touched the screen for a few minutes.
const parentOn = () => !!parent.pin;
function setParent(pin) { parent = { pin }; render(); }
function lockParent() { const had = parent.pin; parent = { pin: null }; SP = null; $(".settings")?.remove(); if (had) render(); }

// Runs an action. Parent-only actions ask for the PIN first if parent mode is off.
async function act(action, extra = {}, { needPin = false, quiet = false } = {}) {
  if (needPin && !parentOn()) {
    const ok = await askPin("Parent PIN", "Enter the parent PIN to do this.");
    if (!ok) return null;
  }
  try {
    const data = await api("/api/do", { action, ...extra, ...(parentOn() ? { pin: parent.pin } : {}) });
    if (data.state) applyState(data.state);
    if ($(".settings") && action !== "pin.check") renderSettings();
    return data;
  } catch (e) {
    if (e.data && e.data.pin === false) { lockParent(); }
    if (!quiet) toast(e.message);
    return null;
  }
}

function applyTheme(theme) {
  const t = theme === "chalk" ? "chalk" : "bright";
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "chalk" ? "#1B302B" : "#EAF3F9");
}

function applyState(st) {
  if (!firstBuild) firstBuild = st.build;
  const j = JSON.stringify({ ...st, serverNow: 0 });
  if (j === lastJson) return;
  lastJson = j;
  S = st;
  if (st.serverNow) clockOffset = st.serverNow - Date.now();
  if (st.voice !== undefined) VOICE = st.voice;
  applyTheme(S.settings.theme);
  render();
}

async function refreshState() {
  try { applyState(await api("/api/state")); } catch {}
}
async function refreshCalendar(fresh = false) {
  try { CAL = await api("/api/calendar" + (fresh ? "?fresh=1" : "")); render(); } catch {}
}
async function refreshPhotos(fresh = false) {
  try { PH = await api("/api/photos" + (fresh ? "?fresh=1" : "")); shuffle(PH.photos); } catch {}
  return PH;
}
async function refreshWeather() {
  const loc = S?.settings?.location;
  if (!loc) return;
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,precipitation" +
      "&hourly=temperature_2m,weather_code,precipitation_probability,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
      "&wind_speed_unit=mph&timezone=auto&forecast_days=7";
    const r = await fetch(u);
    if (r.ok) { WX = await r.json(); WX._at = Date.now(); renderTop(); if (idleOn) renderIdleInfo(); if ($(".wxview")) renderWeather(); }
  } catch {}
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }

/* ---------------- Chore logic ---------------- */
const kids = () => (S?.people || []).filter((p) => p.kid);
const person = (id) => (S?.people || []).find((p) => p.id === id);

function periodFor(chore) {
  if (chore.repeat === "weekly") return "W" + S.weekStart;
  if (chore.repeat === "once") return "once";
  return S.today;
}
function completionFor(chore, kidId) {
  const period = periodFor(chore);
  return S.completions.find((c) => c.chore_id === chore.id && c.person_id === kidId && c.period === period);
}
// Today's chores for one child, in order, with their state.
function choresToday(kidId) {
  const out = [];
  for (const ch of S.chores) {
    if (!ch.people.includes(kidId)) continue;
    const comp = completionFor(ch, kidId);
    if (ch.repeat === "daily" && !ch.days.includes(String(S.weekday))) continue;
    if (ch.repeat === "once" && comp && comp.status === "approved" && comp.day < S.today) continue;
    out.push({ chore: ch, comp });
  }
  return out;
}
function weekTotals(kidId) {
  let approved = 0, pending = 0, possible = 0;
  for (const c of S.completions) {
    if (c.person_id !== kidId) continue;
    if (c.status === "pending") pending += c.amount;
    else if (c.day >= S.weekStart) approved += c.amount;
  }
  for (const ch of S.chores) {
    if (!ch.people.includes(kidId)) continue;
    if (ch.repeat === "daily") possible += ch.amount * ch.days.length;
    else if (ch.repeat === "weekly") possible += ch.amount;
    else {
      const comp = S.completions.find((c) => c.chore_id === ch.id && c.person_id === kidId);
      if (!comp || comp.day >= S.weekStart) possible += ch.amount;
    }
  }
  return { approved, pending, possible: Math.max(possible, approved + pending) };
}
function repeatText(ch) {
  if (ch.repeat === "weekly") return "Once a week";
  if (ch.repeat === "once") return "Just once";
  if (ch.days.length === 7) return "Every day";
  if (ch.days === "01234") return "Weekdays";
  if (ch.days === "56") return "Weekends";
  return [...ch.days].map((d) => DAY_NAMES[+d]).join(", ");
}

/* ---------------- Rendering ---------------- */
function render() {
  if (!S) return;
  const app = $("#app");
  if (!app.querySelector(".grid")) {
    app.innerHTML = `
      <header class="top" id="top"></header>
      <div class="timers" id="timers" hidden></div>
      <main class="grid">
        <section class="col col-cal" id="col-cal" aria-label="Calendar"></section>
        <section class="col col-chores" id="col-chores" aria-label="Chores"></section>
        <section class="col col-todo" id="col-todo" aria-label="To do"></section>
      </main>
      <nav class="tabs" id="tabs" role="tablist"></nav>`;
  }
  $(".grid").classList.toggle("many", kids().length >= 3);
  renderTop();
  renderTimers();
  renderCalendar();
  renderChores();
  renderTodos();
  renderTabs();
}

function clockParts(d = new Date()) {
  let h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return { hm: `${h}:${pad2(d.getMinutes())}`, ampm };
}
function dateLong(d = new Date()) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function renderTop() {
  const top = $("#top");
  if (!top || !S) return;
  const c = clockParts();
  let wx = "";
  if (WX?.current) {
    const days = (WX.daily?.time || []).slice(1, 4).map((t, i) => `
      <div class="wx-day">${new Date(t + "T12:00").toLocaleDateString("en-GB", { weekday: "short" })}
        ${wxIcon(WX.daily.weather_code[i + 1])}
        <b class="num">${Math.round(WX.daily.temperature_2m_max[i + 1])}°</b> <span class="num">${Math.round(WX.daily.temperature_2m_min[i + 1])}°</span></div>`).join("");
    wx = `<button class="wx" data-act="weather" aria-label="Weather forecast">
      <div class="wx-now">${wxIcon(WX.current.weather_code, WX.current.is_day)}
        <div><div class="t num">${Math.round(WX.current.temperature_2m)}°</div><div class="place">${esc(S.settings.location?.name || "")}</div></div></div>
      <div class="wx-days">${days}</div></button>`;
  }
  top.innerHTML = `
    <div class="clock" id="clock">${c.hm}<span class="ampm">${c.ampm}</span></div>
    <div class="date"><div class="day" id="date">${dateLong()}</div><div class="title">${esc(S.settings.title)}</div></div>
    <div class="top-right">${wx}
      <button class="icon-btn" data-act="timer" aria-label="Set a timer">${I.timer}</button>
      <button class="icon-btn ${parentOn() ? "on" : ""}" data-act="parent" aria-label="${parentOn() ? "Parent mode is on. Tap to lock" : "Parent mode"}">${parentOn() ? I.unlock : I.lock}</button>
      <button class="icon-btn" data-act="settings" aria-label="Settings">${I.gear}</button>
    </div>`;
}

function tickClock() {
  tickTimers();
  const c = clockParts();
  const el = $("#clock");
  if (el) el.innerHTML = `${c.hm}<span class="ampm">${c.ampm}</span>`;
  const d = $("#date");
  if (d && d.textContent !== dateLong()) d.textContent = dateLong();
  if (idleOn) renderIdleInfo();
}

/* Calendar column */
function eventsByDay(days = 8) { return groupEvents(CAL, isoDay(new Date()), days); }
// Sorts a calendar feed into days, starting at startIso.
function groupEvents(src, startIso, days) {
  const colours = Object.fromEntries((src.calendars || []).map((c) => [c.id, pc(c.colour)]));
  const groups = [];
  for (let i = 0; i < days; i++) groups.push({ iso: addDaysIso(startIso, i), items: [] });
  const byIso = Object.fromEntries(groups.map((g) => [g.iso, g]));
  for (const ev of src.events || []) {
    const c = colours[ev.cal];
    if (ev.allDay) {
      // Show multi-day events on every day they cover
      let d = ev.start;
      const end = ev.end && ev.end > ev.start ? ev.end : addDaysIso(ev.start, 1);
      while (d < end) { if (byIso[d]) byIso[d].items.push({ ...ev, c }); d = addDaysIso(d, 1); if (d > groups[groups.length - 1].iso) break; }
    } else {
      const s = new Date(ev.start);
      const g = byIso[isoDay(s)];
      if (g) g.items.push({ ...ev, c, s, e: ev.end ? new Date(ev.end) : s });
    }
  }
  for (const g of groups) g.items.sort((a, b) => (a.allDay === b.allDay ? (a.s || 0) - (b.s || 0) : a.allDay ? -1 : 1));
  return groups;
}
function timeText(d) {
  const h = d.getHours(), m = d.getMinutes();
  return { t: `${h % 12 || 12}${m ? ":" + pad2(m) : ""}`, ap: h >= 12 ? "pm" : "am" };
}
function dayLabel(iso, i) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  return new Date(iso + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function renderCalendar() {
  const col = $("#col-cal");
  if (!col) return;
  const now = new Date();
  const hasCals = (S.settings.calendars || []).length > 0;
  let body = "";
  if (!hasCals) {
    body = `<div class="empty">No calendars connected yet. <button data-act="settings" data-tab="calendars">Add your iCloud calendar</button></div>`;
  } else {
    const warn = (CAL.errors || []).map((e) => `<div class="cal-warn">${esc(e.name)}: ${esc(e.error)}</div>`).join("");
    body = warn + eventsByDay().map((g, i) => {
      if (i > 0 && !g.items.length) return "";
      const items = g.items.map((ev) => {
        let when, cls = "event";
        if (ev.allDay) when = `All<small>day</small>`;
        else {
          const a = timeText(ev.s);
          when = `${a.t}<small>${a.ap}</small>`;
          if (i === 0 && ev.e <= now) cls += " past";
          else if (i === 0 && ev.s <= now && ev.e > now) cls += " now";
        }
        return `<div class="${cls}" style="--c:${esc(ev.c || "#85998F")}"><div class="when">${when}</div>
          <div class="what">${esc(ev.title)}${ev.location ? `<span class="where">${esc(ev.location.split("\n")[0])}</span>` : ""}</div></div>`;
      }).join("");
      return `<div class="day-group ${i === 0 ? "today" : ""}"><h3><button data-act="month" data-day="${g.iso}">${dayLabel(g.iso, i)}</button></h3>${items || `<div class="empty">Nothing on today</div>`}</div>`;
    }).join("");
  }
  col.innerHTML = `<div class="col-head"><h2>Calendar</h2>${hasCals ? `<button class="pill-btn quiet" data-act="month">${I.cal} Month</button>` : ""}</div><div class="scroll">${body}</div>`;
  col.classList.toggle("active", tab === "today");
}

function jarSvg(k, t) {
  const frac = t.possible ? Math.min(1, t.approved / t.possible) : 0;
  const fracP = t.possible ? Math.min(1 - frac, t.pending / t.possible) : 0;
  const top = 26, bottom = 78, hgt = bottom - top;
  const ya = bottom - hgt * frac, yp = ya - hgt * fracP;
  const id = "j" + k.id.slice(0, 6);
  return `<svg class="jar" viewBox="0 0 72 84" aria-hidden="true">
    <defs>
      <clipPath id="${id}"><path d="M18 18h36v6c6 3 10 9 10 17v31a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V41c0-8 4-14 10-17z"/></clipPath>
      <pattern id="${id}p" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="${esc(pc(k.colour))}" opacity=".55"/></pattern>
    </defs>
    <g clip-path="url(#${id})">
      <rect class="fill" x="0" y="${yp.toFixed(1)}" width="72" height="${(ya - yp).toFixed(1)}" fill="url(#${id}p)"/>
      <rect class="fill" x="0" y="${ya.toFixed(1)}" width="72" height="${(bottom + 4 - ya).toFixed(1)}" fill="${esc(pc(k.colour))}"/>
    </g>
    <path d="M18 18h36v6c6 3 10 9 10 17v31a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V41c0-8 4-14 10-17z" fill="none" stroke="${esc(pc(k.colour))}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="14" y="9" width="44" height="10" rx="3" fill="none" stroke="${esc(pc(k.colour))}" stroke-width="3"/>
  </svg>`;
}

function renderChores() {
  const col = $("#col-chores");
  if (!col) return;
  const ks = kids();
  const pendingAll = S.completions.filter((c) => c.status === "pending");
  let body;
  if (!ks.length) {
    body = `<div class="no-kids"><p>Add the kids and their chores, and each one gets a money jar that fills up through the week.</p>
      <button class="pill-btn" data-act="settings" data-tab="family">${I.plus} Add the kids</button></div>`;
  } else {
    body = `<div class="kids">${ks.map((k) => {
      const t = weekTotals(k.id);
      const list = choresToday(k.id);
      const owed = S.owed[k.id] || 0;
      const rows = list.map(({ chore, comp }) => {
        const st = comp ? comp.status : "todo";
        const cls = st === "approved" ? "done" : st === "pending" ? "pending" : "";
        const pop = justTicked === chore.id + k.id ? " pop" : "";
        const sub = st === "pending" ? "Waiting for OK" : chore.repeat === "weekly" ? "Any day this week" : chore.repeat === "once" ? "Just once" : "";
        const label = `${chore.title}, ${money(chore.amount)}, ${st === "approved" ? "done" : st === "pending" ? "waiting for a parent" : "not done"}`;
        return `<button class="chore ${cls}${pop}" data-act="chore" data-chore="${chore.id}" data-kid="${k.id}" aria-label="${esc(label)}">
          <span class="tick">${st === "approved" ? I.tick : st === "pending" ? I.clock : ""}</span>
          <span><span class="t">${esc(chore.title)}</span>${sub ? `<span class="s">${sub}</span>` : ""}</span>
          <span class="amt">${chore.amount ? money(chore.amount) : ""}</span></button>`;
      }).join("");
      const subLines = [];
      if (t.pending) subLines.push(`${money(t.pending)} waiting for OK`);
      if (owed > 0) subLines.push(`${money(owed)} to be paid`);
      return `<article class="kid" style="--k:${esc(pc(k.colour))}">
        <div class="kid-head">${jarSvg(k, t)}
          <div><div class="kid-name">${k.emoji ? esc(k.emoji) + " " : ""}${esc(k.name)}</div>
          <div class="kid-money" aria-label="${esc(money(t.approved))} earned this week">${money(t.approved)}</div>
          <div class="kid-sub">${subLines.join("<br>") || "earned this week"}</div></div></div>
        <div class="kid-list">${rows || `<div class="kid-empty">No chores today</div>`}</div>
      </article>`;
    }).join("")}</div>`;
  }
  const bar = pendingAll.length
    ? `<div class="approve-bar"><span>${pendingAll.length} chore${pendingAll.length > 1 ? "s" : ""} waiting for a parent's OK</span>
       <button class="pill-btn yellow" data-act="approve-all">Approve</button></div>` : "";
  col.innerHTML = `<div class="col-head"><h2>Chores</h2><span class="aside">${parentOn() ? "Parent mode: ticks count straight away" : "Tap when it's done"}</span></div>
    <div class="scroll" style="display:flex;flex-direction:column">${body}</div>${bar}`;
  col.classList.toggle("active", tab === "chores");
  justTicked = null;
}

function renderTodos() {
  const col = $("#col-todo");
  if (!col) return;
  const items = S.todos.map((t) => {
    const p = person(t.person_id);
    return `<div class="todo ${t.done ? "done" : ""}">
      <button class="box" data-act="todo" data-id="${t.id}" aria-label="${esc(t.text)}: ${t.done ? "done" : "not done"}">${t.done ? I.tick : ""}</button>
      <div class="txt">${esc(t.text)}${p ? `<span class="who" style="--k:${esc(pc(p.colour))}">${esc(p.name)}</span>` : ""}</div>
      ${t.done ? `<button class="del" data-act="todo-del" data-id="${t.id}" aria-label="Remove ${esc(t.text)}">${I.x}</button>` : "<span></span>"}
    </div>`;
  }).join("");
  const open = S.todos.filter((t) => !t.done).length;
  col.innerHTML = `<div class="col-head"><h2>To do</h2><button class="pill-btn" data-act="todo-add">${I.plus} Add</button></div>
    <div class="scroll">${items || `<div class="empty">Nothing to do. Tap Add when something comes up.</div>`}</div>`;
  col.classList.toggle("active", tab === "todo");
  col.dataset.open = open;
}

function renderTabs() {
  const nav = $("#tabs");
  if (!nav) return;
  const pend = S.completions.filter((c) => c.status === "pending").length;
  const open = S.todos.filter((t) => !t.done).length;
  const t = (id, label, icon, badge) => `<button role="tab" data-act="tab" data-tab="${id}" aria-selected="${tab === id}">${icon}<span>${label}${badge ? `<span class="badge">${badge}</span>` : ""}</span></button>`;
  nav.innerHTML = t("today", "Calendar", I.cal) + t("chores", "Chores", I.star, pend) + t("todo", "To do", I.list, open);
}

/* ---------------- Month view ---------------- */
let monthAt = null;          // first day of the month on screen (YYYY-MM-DD)
let monthSel = null;         // the day whose events show in the side list
const monthCache = {};       // "from_to" -> { at, data }
const ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

const firstOfMonth = (iso) => iso.slice(0, 8) + "01";
function shiftMonth(iso, n) { const d = new Date(iso + "T12:00"); d.setDate(1); d.setMonth(d.getMonth() + n); return isoDay(d); }
function monthGrid(first) {
  const d = new Date(first + "T12:00");
  const lead = (d.getDay() + 6) % 7;                       // Monday first
  const daysIn = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((lead + daysIn) / 7);
  const start = addDaysIso(first, -lead);
  return { start, weeks, days: weeks * 7, end: addDaysIso(start, weeks * 7 - 1) };
}
async function loadMonth(first, force = false) {
  const g = monthGrid(first);
  const key = g.start + "_" + g.end;
  const hit = monthCache[key];
  if (hit && !force && Date.now() - hit.at < 10 * 60e3) return hit.data;
  const data = await api(`/api/calendar?from=${g.start}&to=${g.end}`);
  monthCache[key] = { at: Date.now(), data };
  return data;
}
function cachedMonth(first) {
  const g = monthGrid(first);
  return monthCache[g.start + "_" + g.end]?.data || null;
}

function openMonth(day) {
  const today = isoDay(new Date());
  monthSel = day || today;
  monthAt = firstOfMonth(monthSel);
  $(".month")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "month";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-label", "Month view");
  document.body.appendChild(wrap);
  // swipe left and right to change month
  let sx = null, sy = null;
  wrap.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; });
  wrap.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { wrap.dataset.swiped = "1"; goMonth(dx < 0 ? 1 : -1); setTimeout(() => delete wrap.dataset.swiped, 50); }
  });
  showMonth();
}
function closeMonth() { $(".month")?.remove(); }
function goMonth(n) {
  monthAt = shiftMonth(monthAt, n);
  const today = isoDay(new Date());
  monthSel = firstOfMonth(today) === monthAt ? today : monthAt;
  showMonth();
}
async function showMonth() {
  const at = monthAt;
  renderMonth(cachedMonth(at));
  try {
    const data = await loadMonth(at);
    if (monthAt === at) renderMonth(data);
    loadMonth(shiftMonth(at, 1)).catch(() => {});   // have next month ready for a swipe
  } catch (e) {
    if (monthAt === at) renderMonth({ events: [], calendars: [], errors: [{ name: "Calendar", error: e.message }] });
  }
}

function monthEventRow(ev) {
  const when = ev.allDay ? `All<small>day</small>` : `${timeText(ev.s).t}<small>${timeText(ev.s).ap}</small>`;
  return `<div class="event" style="--c:${esc(ev.c || "#85998F")}"><div class="when">${when}</div>
    <div class="what">${esc(ev.title)}${ev.location ? `<span class="where">${esc(ev.location.split("\n")[0])}</span>` : ""}</div></div>`;
}

function renderMonth(data) {
  const wrap = $(".month");
  if (!wrap) return;
  const g = monthGrid(monthAt);
  const today = isoDay(new Date());
  const month = monthAt.slice(0, 7);
  const days = data ? groupEvents(data, g.start, g.days) : Array.from({ length: g.days }, (_, i) => ({ iso: addDaysIso(g.start, i), items: [] }));
  const title = new Date(monthAt + "T12:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const MAX = 6;   // fitMonthCells() hides whatever doesn't fit and counts it
  const cells = days.map((d) => {
    const cls = ["m-cell"];
    if (d.iso.slice(0, 7) !== month) cls.push("out");
    if (d.iso < today) cls.push("past");
    if (d.iso === today) cls.push("today");
    if (d.iso === monthSel) cls.push("sel");
    const chips = d.items.slice(0, MAX).map((ev) =>
      `<span class="m-ev ${ev.allDay ? "all" : ""}" style="--c:${esc(ev.c || "#85998F")}">${esc(ev.title)}</span>`).join("");
    const more = d.items.length ? `<span class="m-more" data-total="${d.items.length}">+0 more</span>` : "";
    const dots = d.items.slice(0, 4).map((ev) => `<i style="--c:${esc(ev.c || "#85998F")}"></i>`).join("");
    const label = new Date(d.iso + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + (d.items.length ? `, ${d.items.length} event${d.items.length > 1 ? "s" : ""}` : ", nothing on");
    return `<button class="${cls.join(" ")}" data-m="day" data-day="${d.iso}" aria-label="${esc(label)}" aria-pressed="${d.iso === monthSel}">
      <span class="m-num">${+d.iso.slice(8)}</span><span class="m-evs">${chips}</span>${more}<span class="m-dots">${dots}</span></button>`;
  }).join("");

  const sel = days.find((d) => d.iso === monthSel);
  const selLabel = monthSel === today ? "Today" : monthSel === addDaysIso(today, 1) ? "Tomorrow" : new Date(monthSel + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const list = !data ? `<div class="empty">Loading…</div>` : sel && sel.items.length ? sel.items.map(monthEventRow).join("") : `<div class="empty">Nothing on.</div>`;
  const warn = (data?.errors || []).map((e) => `<div class="cal-warn">${esc(e.name)}: ${esc(e.error)}</div>`).join("");

  wrap.innerHTML = `
    <header class="m-head">
      <button class="icon-btn" data-m="prev" aria-label="Previous month">${ARROW_L}</button>
      <h2>${title}</h2>
      <button class="icon-btn" data-m="next" aria-label="Next month">${ARROW_R}</button>
      ${firstOfMonth(today) !== monthAt ? `<button class="pill-btn quiet" data-m="this">This month</button>` : ""}
      <span class="m-gap"></span>
      <button class="pill-btn" data-m="close">Back to board</button>
    </header>
    <div class="m-body">
      <div class="m-grid">
        ${warn}
        <div class="m-dow">${DAY_NAMES.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="m-cells" style="--weeks:${g.weeks}">${cells}</div>
      </div>
      <aside class="m-day" aria-live="polite"><h3>${selLabel}</h3><div class="scroll">${list}</div></aside>
    </div>`;
  fitMonthCells();
}

// Hide event names that don't fit in a day box and say how many more there are.
function fitMonthCells() {
  for (const cell of $$(".month .m-cell")) {
    const box = $(".m-evs", cell), more = $(".m-more", cell);
    if (!more) continue;
    if (!box.offsetParent) { more.style.display = "none"; continue; }   // phone: dots instead
    const fit = () => {
      more.style.visibility = "hidden";
      more.style.display = "";
      for (const chip of box.children) chip.style.display = "";
      const limit = box.getBoundingClientRect().bottom + 1;
      let hidden = +more.dataset.total - box.children.length, over = false;
      for (const chip of box.children) {
        // keep events in time order: once one doesn't fit, hide the rest too
        if (over || chip.getBoundingClientRect().bottom > limit) { over = true; chip.style.display = "none"; hidden++; }
      }
      return hidden;
    };
    let hidden = fit();
    if (hidden > 0 && !cell.classList.contains("tight")) { cell.classList.add("tight"); hidden = fit(); }  // busy day: one line each
    if (hidden > 0) { more.textContent = `+${hidden} more`; more.style.visibility = "visible"; }
    else more.style.display = "none";
  }
}
window.addEventListener("resize", () => { if ($(".month")) renderMonth(cachedMonth(monthAt)); });

document.addEventListener("click", (e) => {
  const wrap = $(".month");
  if (!wrap || !wrap.contains(e.target) || wrap.dataset.swiped) return;
  const b = e.target.closest("[data-m]");
  if (!b) return;
  const m = b.dataset.m;
  if (m === "close") closeMonth();
  if (m === "prev") goMonth(-1);
  if (m === "next") goMonth(1);
  if (m === "this") { monthAt = firstOfMonth(isoDay(new Date())); monthSel = isoDay(new Date()); showMonth(); }
  if (m === "day") {
    monthSel = b.dataset.day;
    if (monthSel.slice(0, 7) !== monthAt.slice(0, 7)) { monthAt = firstOfMonth(monthSel); showMonth(); }
    else renderMonth(cachedMonth(monthAt));
  }
});

/* ---------------- Weather view ---------------- */
function openWeather() {
  $(".wxview")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "wxview";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-label", "Weather forecast");
  document.body.appendChild(wrap);
  wrap.addEventListener("click", (e) => { if (e.target.closest("[data-w=close]")) closeWeather(); });
  renderWeather();
  if (!WX || Date.now() - (WX._at || 0) > 10 * 60e3) refreshWeather();
}
function closeWeather() { $(".wxview")?.remove(); }

function renderWeather() {
  const wrap = $(".wxview");
  if (!wrap) return;
  const place = S?.settings?.location?.name || "your area";
  if (!WX?.current) {
    wrap.innerHTML = `<header class="m-head"><h2>Weather</h2><span class="m-gap"></span><button class="pill-btn" data-w="close">Back to board</button></header>
      <div class="empty" style="padding:24px 0">Getting the forecast for ${esc(place)}…</div>`;
    return;
  }
  const cur = WX.current, d = WX.daily;
  const hours = nextHours(24);
  const hrs = hours.map((h) => `<div class="wv-hour ${h.label === "Now" ? "now" : ""}"><span>${h.label}</span>${wxIcon(h.code, h.day)}<b class="num">${h.temp}°</b>
      <i class="wv-rain" style="--r:${h.rain}%"><em></em></i><small class="num">${h.rain}%</small></div>`).join("");
  // temperature line across the 24 hours
  const ts = hours.map((h) => h.temp), tmin = Math.min(...ts), tmax = Math.max(...ts), span = Math.max(1, tmax - tmin);
  const W = hours.length * 72, H = 60;
  const pts = hours.map((h, i) => `${i * 72 + 36},${(8 + (1 - (h.temp - tmin) / span) * (H - 16)).toFixed(1)}`).join(" ");
  const line = `<svg class="wv-line" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--yellow)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${hours.map((h, i) => `<circle cx="${i * 72 + 36}" cy="${(8 + (1 - (h.temp - tmin) / span) * (H - 16)).toFixed(1)}" r="3.5" fill="var(--yellow)"/>`).join("")}</svg>`;
  const wkMin = Math.min(...d.temperature_2m_min), wkMax = Math.max(...d.temperature_2m_max), wkSpan = Math.max(1, wkMax - wkMin);
  const days = d.time.map((t, i) => {
    const name = i === 0 ? "Today" : new Date(t + "T12:00").toLocaleDateString("en-GB", { weekday: "long" });
    const lo = d.temperature_2m_min[i], hi = d.temperature_2m_max[i];
    const left = ((lo - wkMin) / wkSpan) * 100, width = Math.max(6, ((hi - lo) / wkSpan) * 100);
    const rain = d.precipitation_probability_max[i] ?? 0;
    return `<div class="wv-day"><span class="wv-name">${name}</span>${wxIcon(d.weather_code[i])}<span class="wv-text">${esc(wxText(d.weather_code[i]))}</span>
      <span class="wv-pct ${rain >= 40 ? "wet" : ""}">${rain >= 10 ? rain + "%" : ""}</span>
      <span class="wv-lo num">${Math.round(lo)}°</span><span class="wv-range"><i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i></span><span class="wv-hi num">${Math.round(hi)}°</span></div>`;
  }).join("");
  const sun = (t) => hourLabel(t);
  const keepScroll = $(".wv-hours", wrap)?.scrollLeft || 0;
  wrap.innerHTML = `
    <header class="m-head"><h2>Weather in ${esc(place)}</h2><span class="m-gap"></span><button class="pill-btn" data-w="close">Back to board</button></header>
    <div class="wv-body">
      <section class="wv-now">
        <div class="wv-big">${wxIcon(cur.weather_code, cur.is_day)}<span class="num">${Math.round(cur.temperature_2m)}°</span></div>
        <div class="wv-cond">${esc(wxText(cur.weather_code))}</div>
        <dl class="wv-facts">
          <div><dt>Feels like</dt><dd class="num">${Math.round(cur.apparent_temperature)}°</dd></div>
          <div><dt>High and low</dt><dd class="num">${Math.round(d.temperature_2m_max[0])}° / ${Math.round(d.temperature_2m_min[0])}°</dd></div>
          <div><dt>Chance of rain</dt><dd class="num">${d.precipitation_probability_max[0] ?? 0}%</dd></div>
          <div><dt>Wind</dt><dd class="num">${Math.round(cur.wind_speed_10m)} mph</dd></div>
          <div><dt>Sunrise</dt><dd>${sun(d.sunrise[0])}</dd></div>
          <div><dt>Sunset</dt><dd>${sun(d.sunset[0])}</dd></div>
        </dl>
      </section>
      <section class="wv-right">
        <h3>Next 24 hours</h3>
        <div class="wv-hours"><div class="wv-strip">${line}<div class="wv-cells">${hrs}</div></div></div>
        <h3>Next 7 days</h3>
        <div class="wv-days">${days}</div>
      </section>
    </div>`;
  $(".wv-hours", wrap).scrollLeft = keepScroll;
}

/* ---------------- Kitchen timers ---------------- */
const liveTimers = () => (S?.timers || []).filter((t) => !silenced.has(t.id));
function fmtLeft(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${pad2(m)}:${pad2(sec)}` : `${m}:${pad2(sec)}`;
}
function renderTimers() {
  const bar = $("#timers");
  if (!bar) return;
  const ts = liveTimers();
  bar.hidden = !ts.length;
  bar.innerHTML = ts.map((t) => `<div class="timer-chip" data-timer="${t.id}">
      ${I.timer}<span class="tl">${esc(t.label || "Timer")}</span><b class="tt num" data-left="${t.id}"></b>
      <button data-act="timer-add" data-id="${t.id}" aria-label="Add a minute">+1 min</button>
      <button data-act="timer-stop" data-id="${t.id}" aria-label="Cancel ${esc(t.label || "timer")}">${I.x}</button></div>`).join("");
  tickTimers();
}
function tickTimers() {
  const now = nowMs();
  for (const t of liveTimers()) {
    const left = t.ends_at - now;
    $$(`[data-left="${t.id}"]`).forEach((el) => { el.textContent = left > 0 ? fmtLeft(left) : "Done"; });
    $(`[data-timer="${t.id}"]`)?.classList.toggle("done", left <= 0);
  }
  const ringing = liveTimers().filter((t) => t.ends_at <= now);
  if (ringing.length) showRing(ringing); else hideRing();
}
async function stopTimer(tid) {
  silenced.add(tid);
  renderTimers();
  if (idleOn) renderIdleInfo();
  await act("timer.stop", { id: tid }, { quiet: true });
}

// Alarm: full-screen message plus a chime, until someone taps Stop (on any device)
let ringingKey = "";
function showRing(list) {
  let el = $("#ring");
  const key = list.map((t) => t.id).join(",");
  if (!el) { el = document.createElement("div"); el.id = "ring"; el.setAttribute("role", "alertdialog"); document.body.appendChild(el); }
  if (key !== ringingKey) {
    ringingKey = key;
    const names = list.map((t) => (t.label ? esc(t.label) + " timer" : "Timer"));
    el.innerHTML = `<div class="ring-box">${I.timer}<h2>${names.length > 1 ? names.join(" and ") + " are done" : names[0] + " is done"}</h2>
      <div class="ring-btns"><button class="pill-btn quiet" data-ring="more" data-id="${list[0].id}">+1 minute</button>
      <button class="pill-btn quiet" data-ring="more5" data-id="${list[0].id}">+5 minutes</button>
      <button class="pill-btn yellow" data-ring="stop">Stop</button></div>
      <p class="ring-sound" hidden>Tap anywhere to hear the alarm</p></div>`;
    el.onclick = async (e) => {
      unlockAudio();
      const r = e.target.closest("[data-ring]")?.dataset.ring;
      if (r === "stop") list.forEach((t) => stopTimer(t.id));
      if (r === "more" || r === "more5") { await act("timer.add", { id: e.target.closest("[data-ring]").dataset.id, seconds: r === "more" ? 60 : 300 }); }
    };
  }
  if (idleOn) stopIdle();
  chime();
}
function hideRing() { $("#ring")?.remove(); ringingKey = ""; }

let audioCtx = null, lastChime = 0;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {}
}
function chime() {
  if (Date.now() - lastChime < 1600) return;
  lastChime = Date.now();
  const hint = $("#ring .ring-sound");
  if (!audioCtx || audioCtx.state !== "running") { if (hint) hint.hidden = false; return; }
  if (hint) hint.hidden = true;
  const t0 = audioCtx.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "triangle";
    o.frequency.value = [880, 1175, 1568][i];
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.2);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0 + d); o.stop(t0 + d + 0.22);
  });
}
document.addEventListener("pointerdown", unlockAudio, { passive: true });

function timerSheet() {
  const presets = [1, 2, 3, 5, 10, 12, 15, 20, 30, 45, 60, 90];
  const labels = ["Oven", "Pasta", "Eggs", "Rice", "Bath", "Screen time", "Homework"];
  let label = "";
  const { el, close } = openSheet(`
    <h2>Set a timer</h2>
    <div class="field"><span>What's it for? (optional)</span><div class="chips" id="tlabels">${labels.map((l) => `<button class="chip" data-l="${esc(l)}" aria-pressed="false">${esc(l)}</button>`).join("")}</div></div>
    <div class="field"><span>How long?</span><div class="preset-grid">${presets.map((m) => `<button class="preset" data-m="${m}">${m >= 60 ? (m / 60) + (m === 60 ? " hour" : " hours") : m + " min"}</button>`).join("")}</div></div>
    <div class="two"><label class="field"><span>Or type minutes</span><input class="input" id="tmins" inputmode="decimal" placeholder="8"></label>
    <div class="field"><span>&nbsp;</span><button class="pill-btn yellow" data-go="1" style="width:100%;justify-content:center;padding:13px">Start</button></div></div>
    <p class="err" id="terr2"></p>`);
  const start = async (mins) => {
    const secs = Math.round(mins * 60);
    if (!(secs >= 5 && secs <= 86400)) { $("#terr2", el).textContent = "Pick between a few seconds and 24 hours."; return; }
    unlockAudio();
    if (await act("timer.start", { seconds: secs, label })) { close(); toast(`${label || "Timer"} set`); }
  };
  el.addEventListener("click", (e) => {
    const l = e.target.closest("[data-l]");
    if (l) { label = l.getAttribute("aria-pressed") === "true" ? "" : l.dataset.l; $$("[data-l]", el).forEach((b) => b.setAttribute("aria-pressed", b === l && label !== "")); return; }
    const m = e.target.closest("[data-m]");
    if (m) return start(+m.dataset.m);
    if (e.target.closest("[data-go]")) return start(parseFloat($("#tmins", el).value));
  });
}

/* ---------------- Sheets ---------------- */
function openSheet(html, { onClose } = {}) {
  const root = $("#sheet-root");
  const back = document.createElement("div");
  back.className = "sheet-back";
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  root.appendChild(back);
  const close = (v) => { back.remove(); onClose && onClose(v); };
  back.addEventListener("click", (e) => { if (e.target === back) close(null); });
  return { el: back.firstElementChild, close };
}

function askPin(title, lead) {
  return new Promise((resolve) => {
    let val = "", busy = false;
    const auto = !!PIN_LEN;
    const { el, close } = openSheet(`
      <h2>${esc(title)}</h2><p class="lead">${esc(lead)}</p>
      <div class="pin-dots" id="dots"></div><p class="err" id="perr" style="text-align:center"></p>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join("")}
        <button class="txt" data-k="cancel">Cancel</button><button data-k="0">0</button>
        ${auto ? `<button class="txt" data-k="del">Delete</button>` : `<button class="ok" data-k="ok">OK</button>`}</div>`,
      { onClose: (v) => resolve(v) });
    const dots = $("#dots", el);
    const draw = () => { dots.innerHTML = Array.from({ length: PIN_LEN || Math.max(4, val.length) }, (_, i) => `<i class="${i < val.length ? "f" : ""}"></i>`).join(""); };
    draw();
    const submit = async () => {
      if (val.length < 4 || busy) return;
      busy = true;
      try {
        await api("/api/do", { action: "pin.check", pin: val });
        PIN_LEN = val.length;
        setParent(val);
        close(true);
      } catch (e) {
        $("#perr", el).textContent = e.message;
        dots.classList.remove("shake"); void dots.offsetWidth; dots.classList.add("shake");
        val = ""; draw();
      }
      busy = false;
    };
    el.addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]")?.dataset.k;
      if (!k || busy) return;
      if (k === "cancel") return close(false);
      if (k === "ok") return submit();
      if (k === "del") { val = val.slice(0, -1); draw(); return; }
      if (val.length < (PIN_LEN || 8)) { val += k; draw(); }
      if (auto && val.length === PIN_LEN) submit();
    });
  });
}

function addTodoSheet() {
  let who = "";
  const people = S.people.map((p) => `<button class="chip" style="--k:${esc(pc(p.colour))}" data-who="${p.id}" aria-pressed="false">${esc(p.name)}</button>`).join("");
  const { el, close } = openSheet(`
    <h2>Add a to-do</h2>
    <label class="field"><span>What needs doing?</span><textarea class="input" id="tt" maxlength="200" placeholder="Buy milk"></textarea></label>
    ${people ? `<div class="field"><span>Who's it for?</span><div class="chips" id="who"><button class="chip" data-who="" aria-pressed="true">Anyone</button>${people}</div></div>` : ""}
    <p class="err" id="terr"></p>
    <div class="sheet-actions"><button class="pill-btn quiet" data-x="cancel">Cancel</button><button class="pill-btn yellow" data-x="add">Add to-do</button></div>`);
  setTimeout(() => $("#tt", el).focus(), 50);
  el.addEventListener("click", async (e) => {
    const w = e.target.closest("[data-who]");
    if (w) { who = w.dataset.who; $$("[data-who]", el).forEach((b) => b.setAttribute("aria-pressed", b === w)); return; }
    const x = e.target.closest("[data-x]")?.dataset.x;
    if (x === "cancel") close();
    if (x === "add") {
      const text = $("#tt", el).value.trim();
      if (!text) { $("#terr", el).textContent = "Write what needs doing."; return; }
      if (await act("todo.add", { text, person: who })) { close(); toast("To-do added"); }
    }
  });
  $("#tt", el).addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $('[data-x="add"]', el).click(); } });
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------------- Board taps ---------------- */
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || !S) return;
  const a = b.dataset.act;
  if (a === "tab") { tab = b.dataset.tab; render(); return; }
  if (a === "month") { openMonth(b.dataset.day); return; }
  if (a === "weather") { openWeather(); return; }
  if (a === "timer") { timerSheet(); return; }
  if (a === "timer-add") { await act("timer.add", { id: b.dataset.id, seconds: 60 }); return; }
  if (a === "timer-stop") { stopTimer(b.dataset.id); return; }
  if (a === "parent") { parentOn() ? (lockParent(), toast("Parent mode locked")) : askPin("Parent mode", "Ticks count straight away and you can approve chores for the next 5 minutes."); return; }
  if (a === "settings") { openSettings(b.dataset.tab); return; }
  if (a === "todo") { await act("todo.toggle", { id: b.dataset.id }); return; }
  if (a === "todo-del") { await act("todo.delete", { id: b.dataset.id }); return; }
  if (a === "todo-add") { addTodoSheet(); return; }
  if (a === "approve-all") {
    const ids = S.completions.filter((c) => c.status === "pending").map((c) => c.id);
    if (await act("chore.approve", { ids }, { needPin: true })) toast(ids.length > 1 ? "Chores approved" : "Chore approved");
    return;
  }
  if (a === "chore") {
    const chore = S.chores.find((c) => c.id === b.dataset.chore);
    if (!chore) return;
    const comp = completionFor(chore, b.dataset.kid);
    if (!comp) {
      justTicked = chore.id + b.dataset.kid;
      await act("chore.done", { chore: chore.id, person: b.dataset.kid });
    } else if (comp.status === "pending") {
      if (parentOn()) await act("chore.approve", { id: comp.id });
      else {
        const k = person(b.dataset.kid);
        const { el, close } = openSheet(`<h2>${esc(chore.title)}</h2><p class="lead">${esc(k?.name || "")} ticked this. It's waiting for a parent to OK it.</p>
          <div class="sheet-actions"><button class="pill-btn quiet" data-x="undo">Take the tick back</button><button class="pill-btn yellow" data-x="ok">Approve it</button></div>`);
        el.addEventListener("click", async (ev) => {
          const x = ev.target.closest("[data-x]")?.dataset.x;
          if (x === "undo") { close(); await act("chore.undo", { id: comp.id }); }
          if (x === "ok") { close(); if (await act("chore.approve", { id: comp.id }, { needPin: true })) toast("Chore approved"); }
        });
      }
    } else if (parentOn()) {
      const { el, close } = openSheet(`<h2>Undo this chore?</h2><p class="lead">${esc(chore.title)} will go back to not done and ${money(comp.amount)} comes off this week's total.</p>
        <div class="sheet-actions"><button class="pill-btn quiet" data-x="no">Keep it</button><button class="pill-btn yellow" data-x="yes">Undo chore</button></div>`);
      el.addEventListener("click", async (ev) => {
        const x = ev.target.closest("[data-x]")?.dataset.x;
        if (x === "no") close();
        if (x === "yes") { close(); await act("chore.undo", { id: comp.id }); }
      });
    }
  }
});

/* ---------------- Settings (parent only) ---------------- */
async function openSettings(which) {
  if (!parentOn()) {
    const ok = await askPin("Settings", "Enter the parent PIN to change the board.");
    if (!ok) return;
  }
  const res = await act("pin.check", {}, { quiet: true });
  if (!res) return;
  SP = res.state.settings;
  VOICE = res.state.voice || null;
  settingsTab = which || settingsTab;
  const wrap = document.createElement("div");
  wrap.className = "settings";
  wrap.innerHTML = `<nav aria-label="Settings"></nav><div class="pane" id="pane"></div>`;
  document.body.appendChild(wrap);
  renderSettings();
}
function closeSettings() { $(".settings")?.remove(); SP = null; refreshCalendar(); }

const TABS = [["family", "Family"], ["chores", "Chores"], ["money", "Pocket money"], ["calendars", "Calendars"], ["photos", "Photos"], ["screen", "Screen"], ["siri", "Siri"], ["security", "PIN and devices"]];

function renderSettings() {
  const wrap = $(".settings");
  if (!wrap || !S) return;
  if (!parentOn()) { closeSettings(); return; }
  const nav = $("nav", wrap);
  nav.innerHTML = `<h2>Settings</h2>${TABS.map(([id, label]) => `<button data-st="${id}" aria-current="${settingsTab === id}">${label}</button>`).join("")}
    <button class="done-btn" data-st="close">Done</button>`;
  const pane = $("#pane", wrap);
  const keepScroll = pane.scrollTop;
  pane.innerHTML = PANES[settingsTab]();
  pane.scrollTop = keepScroll;
}

const swatches = (sel, name = "colour") => `<div class="swatches" data-swatches="${name}">${COLOURS.map((c) => `<button class="swatch" style="--k:${c}" data-colour="${c}" aria-pressed="${c.toLowerCase() === (sel || "").toLowerCase()}" aria-label="Colour ${c}"></button>`).join("")}</div>`;

const PANES = {
  family() {
    const rows = S.people.map((p) => `<div class="row" data-person="${p.id}">
      <input class="input" style="width:64px;text-align:center" data-f="emoji" value="${esc(p.emoji || "")}" maxlength="8" aria-label="Emoji" placeholder="🙂">
      <input class="input grow" data-f="name" value="${esc(p.name)}" maxlength="40" aria-label="Name">
      ${swatches(pc(p.colour))}
      <label class="toggle"><input type="checkbox" data-f="kid" ${p.kid ? "checked" : ""}> Does chores</label>
      <button class="small-btn" data-x="person-save">Save</button>
      <button class="small-btn danger" data-x="person-del">Remove</button></div>`).join("");
    return `<h3>Family</h3><p class="lead">Everyone in the house. Anyone marked "does chores" gets a money jar on the board. Parents can be added too, so to-dos can be for them.</p>
      ${rows}
      <div class="form-card" data-person="">
        <div class="two"><label class="field"><span>Name</span><input class="input" data-f="name" maxlength="40" placeholder="Name"></label>
        <label class="field"><span>Emoji (optional)</span><input class="input" data-f="emoji" maxlength="8" placeholder="🦖"></label></div>
        <div class="field"><span>Colour</span>${swatches(COLOURS[S.people.length % COLOURS.length])}</div>
        <label class="toggle" style="margin-bottom:14px"><input type="checkbox" data-f="kid" checked> Does chores</label>
        <div class="sheet-actions" style="justify-content:flex-start"><button class="pill-btn yellow" data-x="person-save">Add person</button></div>
      </div>`;
  },
  chores() {
    const ks = kids();
    if (!ks.length) return `<h3>Chores</h3><p class="lead">Add the kids on the Family page first, then come back to give them chores.</p>`;
    const rows = S.chores.map((c) => `<div class="row">
      <div class="grow"><div style="font-weight:700">${esc(c.title)} <span class="meta">${money(c.amount)}</span></div>
      <div class="meta">${c.people.map((id) => esc(person(id)?.name || "?")).join(", ")}. ${repeatText(c)}</div></div>
      <button class="small-btn" data-x="chore-edit" data-id="${c.id}">Edit</button>
      <button class="small-btn danger" data-x="chore-del" data-id="${c.id}">Remove</button></div>`).join("");
    return `<h3>Chores</h3><p class="lead">Each chore has a pocket-money amount. Kids tick it on the board, a parent OKs it, and it goes into their jar.</p>
      ${rows || `<p class="meta">No chores yet.</p>`}
      ${choreForm(null)}`;
  },
  money() {
    const ks = kids();
    if (!ks.length) return `<h3>Pocket money</h3><p class="lead">Add the kids on the Family page first.</p>`;
    const rows = ks.map((k) => {
      const owed = S.owed[k.id] || 0;
      const t = weekTotals(k.id);
      return `<div class="row money-row" style="--k:${esc(pc(k.colour))}">
        <div class="grow"><div style="font-weight:700">${esc(k.name)}</div><div class="meta">${money(t.approved)} earned this week${t.pending ? `, ${money(t.pending)} waiting for OK` : ""}</div></div>
        <div class="big">${money(Math.max(0, owed))}</div>
        ${owed > 0 ? `<button class="pill-btn yellow" data-x="pay" data-id="${k.id}" data-amount="${owed}">Mark ${money(owed)} as paid</button>` : `<span class="meta">All paid</span>`}</div>`;
    }).join("");
    const hist = S.payouts.map((p) => `<div class="row"><div class="grow">${esc(person(p.person_id)?.name || "Removed")}</div><div class="meta">${new Date(p.created).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div><div style="font-weight:700">${money(p.amount)}</div></div>`).join("");
    return `<h3>Pocket money</h3><p class="lead">What each child is owed for approved chores. When you hand the money over, mark it as paid and it resets to £0.</p>
      ${rows}${hist ? `<h3 style="font-size:22px;margin-top:28px">Paid recently</h3>${hist}` : ""}`;
  },
  calendars() {
    const cals = SP?.calendars || [];
    const errs = Object.fromEntries((CAL.errors || []).map((e) => [e.cal, e.error]));
    const rows = cals.map((c, i) => `<div class="row"><span class="swatch" style="--k:${esc(pc(c.colour))}"></span>
      <div class="grow"><div style="font-weight:700">${esc(c.name)}</div>${errs[c.id] ? `<div class="err">${esc(errs[c.id])}</div>` : `<div class="meta">Connected</div>`}</div>
      <button class="small-btn danger" data-x="cal-del" data-i="${i}">Remove</button></div>`).join("");
    return `<h3>Calendars</h3><p class="lead">The board shows your iCloud calendars using each calendar's public share link. It checks for changes every 10 minutes.</p>
      ${rows}
      <div class="form-card" id="cal-form">
        <label class="field"><span>Calendar name</span><input class="input" data-f="name" maxlength="40" placeholder="Family"></label>
        <label class="field"><span>Share link</span><input class="input" data-f="url" placeholder="webcal://p…-caldav.icloud.com/published/…" autocapitalize="off" autocorrect="off" spellcheck="false">
          <small>Anyone with this link can see the calendar, so only paste it here.</small></label>
        <div class="field"><span>Colour</span>${swatches(COLOURS[cals.length % COLOURS.length])}</div>
        <p class="err" id="cerr"></p>
        <div class="sheet-actions" style="justify-content:flex-start"><button class="pill-btn yellow" data-x="cal-add">Add calendar</button></div>
      </div>
      <div class="howto"><b>Getting the link on an iPhone</b><ol>
        <li>Open Calendar and tap Calendars at the bottom.</li>
        <li>Tap the ⓘ next to the calendar you want.</li>
        <li>Turn on Public Calendar, tap Share Link, then Copy.</li></ol>
        <p>Apple's built-in "Family" calendar can't be shared this way. If you use it, make a normal shared calendar for the family instead.</p></div>`;
  },
  photos() {
    return `<h3>Photos</h3><p class="lead">When nobody has touched the board for a while, it shows a slideshow from an iCloud shared album with the time and weather on top.</p>
      <div class="form-card">
        <label class="field"><span>Shared album link</span><input class="input" id="album" value="${esc(SP?.album || "")}" placeholder="https://www.icloud.com/sharedalbum/#B0…" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <p class="meta" id="album-status">${SP?.album ? `${PH.photos.length} photos found${PH.name ? ` in "${esc(PH.name)}"` : ""}${PH.error ? `. ${esc(PH.error)}` : ""}` : "No album yet: the screensaver shows a big clock instead."}</p>
        <div class="sheet-actions" style="justify-content:flex-start"><button class="pill-btn yellow" data-x="album-save">Save album</button>
        <button class="pill-btn quiet" data-x="preview">Show screensaver now</button></div>
      </div>
      <div class="howto"><b>Getting the link on an iPhone</b><ol>
        <li>Open Photos, go to Shared Albums and open the album (or make a new one for the board).</li>
        <li>Tap the people icon at the top.</li>
        <li>Turn on Public Website, then tap Share Link and Copy.</li></ol>
        <p>New photos added to the album appear on the board within half an hour.</p></div>`;
  },
  screen() {
    const s = SP || S.settings;
    return `<h3>Screen</h3><p class="lead">How the board behaves when nobody's using it.</p>
      <div class="form-card">
        <div class="field"><span>Look</span><div class="chips" data-group="theme" data-single>
          <button class="chip" data-v="bright" aria-pressed="${(s.theme || "bright") === "bright"}">Bright</button>
          <button class="chip" data-v="chalk" aria-pressed="${s.theme === "chalk"}">Chalkboard</button></div></div>
        <label class="field"><span>Board name</span><input class="input" id="s-title" value="${esc(s.title)}" maxlength="40"></label>
        <label class="field"><span>Weather for</span><input class="input" id="s-town" value="${esc(s.location?.name || "")}" placeholder="Town or city">
          <small id="s-town-res">Type a town and press Find.</small></label>
        <div class="sheet-actions" style="justify-content:flex-start;margin:-6px 0 14px"><button class="small-btn" data-x="town-find">Find</button></div>
        <div class="two">
          <label class="field"><span>Screensaver after (minutes)</span><input class="input" id="s-idle" type="number" min="1" max="60" value="${s.idleMinutes}"></label>
          <label class="field"><span>Each photo shows for (seconds)</span><input class="input" id="s-slide" type="number" min="5" max="300" value="${s.slideSeconds}"></label>
          <label class="field"><span>Night mode from</span><input class="input" id="s-ns" type="time" value="${s.nightStart}"></label>
          <label class="field"><span>Night mode until</span><input class="input" id="s-ne" type="time" value="${s.nightEnd}"></label>
        </div>
        <label class="toggle"><input type="checkbox" id="s-noff" ${s.nightOff ? "checked" : ""}> No night mode</label>
        <p class="meta" style="margin-top:12px">At night the board goes almost black with a dim clock, so it doesn't light up the kitchen.</p>
        <div class="sheet-actions" style="justify-content:flex-start"><button class="pill-btn yellow" data-x="screen-save">Save</button></div>
      </div>`;
  },
  siri() {
    const link = VOICE ? `${location.origin}/api/voice?key=${VOICE}&say=` : "";
    return `<h3>Siri</h3><p class="lead">Say "Hey Siri, Board" on the iPad or either of your phones, then ask for a timer, add a to-do, or ask what's on. It works through a Siri Shortcut that sends what you say to the board.</p>
      ${!VOICE ? `<div class="form-card"><p style="margin:0 0 12px">First, make the board's private Siri link.</p><button class="pill-btn yellow" data-x="voice-key">Make the Siri link</button></div>` : `
      <div class="form-card">
        <div class="field"><span>The board's Siri link</span><input class="input" id="vlink" readonly value="${esc(link)}">
          <small>Keep this private: anyone with it can set timers and add to-dos. Make a new one any time and the old one stops working.</small></div>
        <div class="sheet-actions" style="justify-content:flex-start"><button class="pill-btn yellow" data-x="voice-copy">Copy link</button><button class="pill-btn quiet" data-x="voice-key">Make a new link</button></div>
      </div>
      <div class="howto"><b>Make the shortcut (once per device, about 2 minutes)</b><ol>
        <li>Copy the link above, then open the <b>Shortcuts</b> app and tap <b>+</b>.</li>
        <li>Add <b>Ask for Input</b>. Set the question to <i>What would you like?</i></li>
        <li>Add <b>URL Encode</b>. It picks up the answer automatically.</li>
        <li>Add <b>Text</b>. Paste the link, then straight after it tap <b>URL Encoded Text</b> to add it on the end.</li>
        <li>Add <b>Get Contents of URL</b>. It uses the Text above.</li>
        <li>Add <b>Show Result</b>. Siri reads the board's answer out.</li>
        <li>Rename the shortcut <b>Board</b>, so you can say "Hey Siri, Board".</li></ol>
        <p><b>Things to say after "Hey Siri, Board":</b> "Pasta timer 10 minutes". "Timer for an hour and a half". "How long's left on the timer". "Cancel the timer". "Add milk to the list". "Remind us to book the dentist". "What's on tomorrow".</p>
        <p>"Hey Siri, set a timer" without "Board" still works on the iPad, but it uses the iPad's own Clock app instead of showing on the board.</p></div>`}`;
  },
  security() {
    return `<h3>PIN and devices</h3><p class="lead">The parent PIN unlocks settings and approves chores. Each phone or iPad also needs it once to connect to the board.</p>
      <div class="form-card">
        <div class="two"><label class="field"><span>New PIN</span><input class="input" id="p1" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></label>
        <label class="field"><span>New PIN again</span><input class="input" id="p2" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></label></div>
        <p class="err" id="perr2"></p>
        <div class="sheet-actions" style="justify-content:flex-start"><button class="pill-btn yellow" data-x="pin-save">Change PIN</button></div>
      </div>
      <div class="form-card"><p style="margin:0 0 12px">Lost a phone, or want to start again? This disconnects every other phone and iPad. They'll need the PIN to reconnect.</p>
        <button class="pill-btn quiet" data-x="devices-forget">Disconnect other devices</button></div>`;
  },
};

function choreForm(c) {
  const ks = kids();
  const sel = new Set(c ? c.people : ks.length === 1 ? [ks[0].id] : []);
  const days = c ? c.days : "0123456";
  const rep = c ? c.repeat : "daily";
  return `<div class="form-card" id="chore-form" data-id="${c ? c.id : ""}">
    <h3 style="font-size:22px">${c ? "Edit chore" : "New chore"}</h3>
    <div class="two"><label class="field"><span>Chore</span><input class="input" data-f="title" maxlength="80" value="${esc(c?.title || "")}" placeholder="Make your bed"></label>
    <label class="field"><span>Worth (£)</span><input class="input" data-f="amount" inputmode="decimal" value="${c ? (c.amount / 100).toFixed(2) : ""}" placeholder="0.50"></label></div>
    <div class="field"><span>Who does it</span><div class="chips" data-group="people">${ks.map((k) => `<button class="chip" style="--k:${esc(pc(k.colour))}" data-v="${k.id}" aria-pressed="${sel.has(k.id)}">${esc(k.name)}</button>`).join("")}</div>
      <small>Pick more than one and they each get their own tick and money.</small></div>
    <div class="field"><span>How often</span><div class="chips" data-group="repeat" data-single>
      <button class="chip" data-v="daily" aria-pressed="${rep === "daily"}">On these days</button>
      <button class="chip" data-v="weekly" aria-pressed="${rep === "weekly"}">Once a week, any day</button>
      <button class="chip" data-v="once" aria-pressed="${rep === "once"}">Just once</button></div></div>
    <div class="field" id="days-field" ${rep === "daily" ? "" : "hidden"}><span>Days</span><div class="chips" data-group="days">${DAY_NAMES.map((d, i) => `<button class="chip" data-v="${i}" aria-pressed="${days.includes(String(i))}">${d}</button>`).join("")}</div></div>
    <p class="err" id="ferr"></p>
    <div class="sheet-actions" style="justify-content:flex-start">${c ? `<button class="pill-btn quiet" data-x="chore-cancel">Cancel</button>` : ""}<button class="pill-btn yellow" data-x="chore-save">${c ? "Save chore" : "Add chore"}</button></div>
  </div>`;
}

document.addEventListener("click", async (e) => {
  const wrap = $(".settings");
  if (!wrap || !wrap.contains(e.target)) return;
  const st = e.target.closest("[data-st]");
  if (st) { if (st.dataset.st === "close") closeSettings(); else { settingsTab = st.dataset.st; $("#pane").scrollTop = 0; renderSettings(); } return; }

  // Colour swatches and chip groups just toggle state
  const sw = e.target.closest(".swatch[data-colour]");
  if (sw) { $$(".swatch", sw.parentElement).forEach((b) => b.setAttribute("aria-pressed", b === sw)); return; }
  const chip = e.target.closest(".chips[data-group] .chip");
  if (chip) {
    const g = chip.parentElement;
    if (g.hasAttribute("data-single")) $$(".chip", g).forEach((b) => b.setAttribute("aria-pressed", b === chip));
    else chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") !== "true");
    if (g.dataset.group === "repeat") $("#days-field").hidden = chip.dataset.v !== "daily";
    if (g.dataset.group === "theme") applyTheme(chip.dataset.v);
    return;
  }

  const x = e.target.closest("[data-x]")?.dataset.x;
  if (!x) return;
  const btn = e.target.closest("[data-x]");
  const colourIn = (el) => $('.swatch[aria-pressed="true"]', el)?.dataset.colour;
  const saveSettings = async (patch) => {
    const r = await act("settings.save", { settings: patch });
    if (r) { SP = r.state.settings; renderSettings(); }
    return r;
  };

  switch (x) {
    case "person-save": {
      const row = btn.closest("[data-person]");
      const name = $('[data-f="name"]', row).value.trim();
      if (!name) { toast("Enter a name."); return; }
      if (await act("person.save", { id: row.dataset.person || undefined, name, emoji: $('[data-f="emoji"]', row).value, kid: $('[data-f="kid"]', row).checked, colour: colourIn(row) })) toast(row.dataset.person ? "Saved" : `${name} added`);
      break;
    }
    case "person-del": {
      const row = btn.closest("[data-person]");
      const p = person(row.dataset.person);
      if (confirmSheet(`Remove ${p?.name}?`, "Their chores and to-dos stay but won't show for them any more.", "Remove", async () => { await act("person.delete", { id: p.id }); })) {}
      break;
    }
    case "chore-edit": {
      const c = S.chores.find((c) => c.id === btn.dataset.id);
      $("#chore-form").outerHTML = choreForm(c);
      $("#chore-form").scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }
    case "chore-cancel": $("#chore-form").outerHTML = choreForm(null); break;
    case "chore-del": {
      const c = S.chores.find((c) => c.id === btn.dataset.id);
      confirmSheet(`Remove "${c.title}"?`, "It comes off the board. Money already earned for it stays.", "Remove chore", async () => { await act("chore.delete", { id: c.id }); });
      break;
    }
    case "chore-save": {
      const f = $("#chore-form");
      const on = (g) => $$(`[data-group="${g}"] .chip[aria-pressed="true"]`, f).map((b) => b.dataset.v);
      const amountText = $('[data-f="amount"]', f).value.replace(/[£p\s]/g, "");
      const amount = amountText === "" ? 0 : Math.round(parseFloat(amountText) * 100);
      if (!Number.isFinite(amount) || amount < 0) { $("#ferr").textContent = "Enter an amount like 0.50."; return; }
      const r = await act("chore.save", { id: f.dataset.id || undefined, title: $('[data-f="title"]', f).value, amount, people: on("people"), repeat: on("repeat")[0] || "daily", days: on("days").join("") }, { quiet: true });
      if (!r) { $("#ferr").textContent = "Check the chore has a name, someone to do it, and a day."; return; }
      toast(f.dataset.id ? "Chore saved" : "Chore added");
      break;
    }
    case "pay": {
      const k = person(btn.dataset.id);
      const amt = +btn.dataset.amount;
      confirmSheet(`Pay ${k.name} ${money(amt)}?`, "Their owed total goes back to £0. Do this once you've handed the money over.", "Mark as paid", async () => { if (await act("payout", { person: k.id, amount: amt })) toast(`${money(amt)} paid to ${k.name}`); });
      break;
    }
    case "cal-add": {
      const f = $("#cal-form");
      const url = $('[data-f="url"]', f).value.trim();
      if (!/^(webcal|https):\/\//i.test(url)) { $("#cerr").textContent = "Paste the share link from the Calendar app. It starts with webcal://"; return; }
      const cals = [...(SP.calendars || []), { name: $('[data-f="name"]', f).value.trim() || "Calendar", url, colour: colourIn(f) }];
      if (await saveSettings({ calendars: cals })) { toast("Calendar added"); await refreshCalendar(true); renderSettings(); }
      break;
    }
    case "cal-del": {
      const cals = SP.calendars.filter((_, i) => i !== +btn.dataset.i);
      if (await saveSettings({ calendars: cals })) { await refreshCalendar(true); renderSettings(); }
      break;
    }
    case "album-save": {
      const v = $("#album").value.trim();
      if (v && !/#[A-Za-z0-9]+/.test(v)) { $("#album-status").textContent = "That doesn't look like a shared album link. It should end in # and some letters."; return; }
      if (await saveSettings({ album: v })) {
        $("#album-status").textContent = "Checking the album…";
        await refreshPhotos(true);
        renderSettings();
      }
      break;
    }
    case "preview": closeSettings(); startIdle(true); break;
    case "town-find": {
      const q = $("#s-town").value.trim();
      const out = $("#s-town-res");
      if (!q) return;
      out.textContent = "Searching…";
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`).then((r) => r.json());
        const list = r.results || [];
        if (!list.length) { out.textContent = "No places found. Try a nearby town."; return; }
        out.innerHTML = list.map((p, i) => `<button class="small-btn" style="margin:4px 6px 0 0" data-x="town-pick" data-i="${i}">${esc([p.name, p.admin1, p.country_code].filter(Boolean).join(", "))}</button>`).join("");
        out._list = list;
      } catch { out.textContent = "Couldn't search right now."; }
      break;
    }
    case "town-pick": {
      const p = $("#s-town-res")._list[+btn.dataset.i];
      if (await saveSettings({ location: { name: p.name, lat: p.latitude, lon: p.longitude } })) { toast(`Weather set to ${p.name}`); refreshWeather(); }
      break;
    }
    case "screen-save": {
      if (await saveSettings({ theme: $('[data-group="theme"] .chip[aria-pressed="true"]')?.dataset.v || "bright", title: $("#s-title").value, idleMinutes: $("#s-idle").value, slideSeconds: $("#s-slide").value, nightStart: $("#s-ns").value, nightEnd: $("#s-ne").value, nightOff: $("#s-noff").checked })) toast("Saved");
      break;
    }
    case "pin-save": {
      const a = $("#p1").value, b = $("#p2").value;
      if (!/^\d{4,8}$/.test(a)) { $("#perr2").textContent = "Use 4 to 8 digits."; return; }
      if (a !== b) { $("#perr2").textContent = "The two PINs don't match."; return; }
      if (await act("pin.change", { newPin: a })) { PIN_LEN = a.length; setParent(a); toast("PIN changed"); $("#p1").value = $("#p2").value = ""; }
      break;
    }
    case "voice-key": {
      const fresh = !!VOICE;
      if (await act("voice.key", {})) { toast(fresh ? "New link made. Update your shortcuts with it." : "Siri link made"); renderSettings(); }
      break;
    }
    case "voice-copy": {
      const v = $("#vlink");
      try { await navigator.clipboard.writeText(v.value); toast("Link copied"); }
      catch { v.select(); document.execCommand("copy"); toast("Link copied"); }
      break;
    }
    case "devices-forget":
      confirmSheet("Disconnect other devices?", "Every other phone and iPad will need the PIN to connect again. This one stays connected.", "Disconnect", async () => { if (await act("devices.forget")) toast("Other devices disconnected"); });
      break;
  }
});

function confirmSheet(title, lead, yes, fn) {
  const { el, close } = openSheet(`<h2>${esc(title)}</h2><p class="lead">${esc(lead)}</p>
    <div class="sheet-actions"><button class="pill-btn quiet" data-x="no">Cancel</button><button class="pill-btn yellow" data-x="yes">${esc(yes)}</button></div>`);
  el.addEventListener("click", async (ev) => {
    const x = ev.target.closest("[data-x]")?.dataset.x;
    if (x === "no") close();
    if (x === "yes") { close(); await fn(); }
  });
  return true;
}

/* ---------------- Screensaver ---------------- */
let slideTimer = null, slideIdx = 0, nightShift = 0;

function isNight() {
  const s = S?.settings;
  if (!s || s.nightOff) return false;
  const m = (t) => { const [h, mm] = t.split(":").map(Number); return h * 60 + mm; };
  const now = new Date(), n = now.getHours() * 60 + now.getMinutes();
  const a = m(s.nightStart), b = m(s.nightEnd);
  return a > b ? n >= a || n < b : n >= a && n < b;
}

function nextEvent() {
  const now = new Date();
  for (const g of eventsByDay(2)) {
    for (const ev of g.items) {
      if (ev.allDay) continue;
      if (ev.s > now) return { ev, day: g.iso === isoDay(now) ? "" : "Tomorrow " };
    }
  }
  return null;
}

function renderIdleInfo() {
  const box = $("#idle");
  const c = clockParts();
  const n = nextEvent();
  const next = n ? `<div class="idle-next"><b>Next</b> ${esc(n.day)}${timeText(n.ev.s).t}${timeText(n.ev.s).ap} ${esc(n.ev.title)}</div>` : "";
  let info = $(".idle-info", box);
  if (!info) { info = document.createElement("div"); info.className = "idle-info"; box.appendChild(info); }
  info.innerHTML = `<div class="idle-clock">${c.hm}<span class="ampm">${c.ampm}</span></div><div class="idle-date">${dateLong()}</div>${next}`;
  // Running timers sit top-left, big enough to read across the kitchen
  let tbox = $(".idle-timers", box);
  const ts = liveTimers();
  if (!ts.length) tbox?.remove();
  else {
    if (!tbox) { tbox = document.createElement("div"); tbox.className = "idle-timers"; box.appendChild(tbox); }
    tbox.innerHTML = ts.map((t) => `<div class="it"><span>${esc(t.label || "Timer")}</span><b class="num">${fmtLeft(t.ends_at - nowMs())}</b></div>`).join("");
  }
  box.classList.toggle("has-timers", ts.length > 0);

  // Weather card: only redrawn when the forecast or the hour changes
  let card = $(".idle-weather", box);
  const key = WX?.current ? WX.current.time + (S?.settings?.location?.name || "") : "";
  if (!WX?.current) { card?.remove(); }
  else if (!card || card.dataset.key !== key) {
    if (!card) { card = document.createElement("div"); card.className = "idle-weather"; card.setAttribute("role", "button"); card.setAttribute("aria-label", "Open the weather forecast"); box.appendChild(card); }
    card.dataset.key = key;
    const cur = WX.current, d = WX.daily;
    const hours = nextHours(7).slice(1).map((h) => `<div class="iw-hour"><span>${h.label}</span>${wxIcon(h.code, h.day)}<b class="num">${h.temp}°</b>
      <i class="iw-rain" style="--r:${h.rain}%"><em></em></i><small>${h.rain >= 10 ? h.rain + "%" : ""}</small></div>`).join("");
    card.innerHTML = `
      <div class="iw-now">${wxIcon(cur.weather_code, cur.is_day)}<span class="iw-temp num">${Math.round(cur.temperature_2m)}°</span>
        <div class="iw-desc"><b>${esc(wxText(cur.weather_code))}</b><span>Feels like ${Math.round(cur.apparent_temperature)}°</span>
        <span>${esc(S?.settings?.location?.name || "")}</span></div></div>
      <div class="iw-meta"><span>High ${Math.round(d.temperature_2m_max[0])}°</span><span>Low ${Math.round(d.temperature_2m_min[0])}°</span>
        <span>Rain ${d.precipitation_probability_max[0] ?? 0}%</span><span>Wind ${Math.round(cur.wind_speed_10m)} mph</span></div>
      <div class="iw-hours">${hours}</div>
      <div class="iw-more">Tap for the full forecast</div>`;
  }
  if (box.classList.contains("night")) {
    // drift the dim clock a little each minute
    const k = Math.floor(Date.now() / 60000);
    if (k !== nightShift) { nightShift = k; box.style.setProperty("--nx", ((k * 37) % 81 - 40) + "px"); box.style.setProperty("--ny", ((k * 53) % 61 - 30) + "px"); }
  }
}

function startIdle(preview = false) {
  if (idleOn) return;
  idleOn = true;
  lockParent();
  closeMonth();
  closeWeather();
  $$(".sheet-back").forEach((s) => s.remove());
  const box = $("#idle");
  const night = isNight() && !preview;
  const photos = PH.photos || [];
  box.className = night ? "night" : photos.length ? "" : "chalk";
  box.innerHTML = `<div class="idle-shade"></div><div class="idle-hint">Tap to open the board</div>`;
  if (!night && !photos.length) {
    const today = eventsByDay(1)[0].items.filter((e) => e.allDay || e.e > new Date()).slice(0, 4);
    if (today.length) {
      const t = document.createElement("div");
      t.className = "idle-today";
      t.innerHTML = `<div class="day-group today"><h3>Still to come today</h3>${today.map((ev) => `<div class="event" style="--c:${esc(ev.c || "#85998F")}"><div class="when">${ev.allDay ? "All<small>day</small>" : `${timeText(ev.s).t}<small>${timeText(ev.s).ap}</small>`}</div><div class="what">${esc(ev.title)}</div></div>`).join("")}</div>`;
      box.appendChild(t);
    }
  }
  renderIdleInfo();
  box.hidden = false;
  if (!night && photos.length) { slideIdx = Math.floor(Math.random() * photos.length); showSlide(); }
}

function showSlide() {
  const box = $("#idle");
  const photos = PH.photos || [];
  if (!idleOn || !photos.length || box.classList.contains("night")) return;
  const p = photos[slideIdx % photos.length];
  slideIdx++;
  const img = new Image();
  const secs = Math.max(5, S.settings.slideSeconds || 20);
  const go = () => {
    if (!idleOn) return;
    const el = document.createElement("div");
    el.className = "slide drift";
    el.style.backgroundImage = `url("${p.url.replace(/"/g, "%22")}")`;
    el.style.setProperty("--dur", secs + 4 + "s");
    el.style.setProperty("--dx", (Math.random() * 4 - 2).toFixed(2) + "%");
    el.style.setProperty("--dy", (Math.random() * 3 - 1.5).toFixed(2) + "%");
    box.insertBefore(el, $(".idle-shade", box));
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
    // keep only the two newest slides
    const old = $$(".slide", box);
    if (old.length > 2) old.slice(0, old.length - 2).forEach((o) => o.remove());
    slideTimer = setTimeout(showSlide, secs * 1000);
  };
  img.onload = go;
  img.onerror = () => { slideTimer = setTimeout(showSlide, 1000); };
  img.src = p.url;
}

function stopIdle() {
  if (!idleOn) return;
  idleOn = false;
  clearTimeout(slideTimer);
  const box = $("#idle");
  box.hidden = true;
  box.innerHTML = "";
  render();
}

function wake() {
  lastTouch = Date.now();
  if (idleOn) stopIdle();
  requestWakeLock();
}
$("#idle").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const onWeather = e.target.closest(".idle-weather") && !$("#idle").classList.contains("night");
  wake();
  if (onWeather) openWeather();
});
["pointerdown", "keydown"].forEach((t) => document.addEventListener(t, () => { lastTouch = Date.now(); requestWakeLock(); }, { passive: true }));

// Screensaver timer, night switch-over, parent-mode timeout, updates
setInterval(() => {
  if (!S) return;
  const idleMs = (isNight() ? 1 : S.settings.idleMinutes || 3) * 60e3;
  const busy = $(".sheet-back") || $(".settings") || document.activeElement?.matches?.("input, textarea");
  if (!idleOn && !busy && Date.now() - lastTouch > idleMs && window.matchMedia("(min-width: 761px)").matches) startIdle();
  // switch screensaver style at the start and end of the night
  if (idleOn) { const night = isNight(); if (night !== $("#idle").classList.contains("night")) { stopIdle(); startIdle(); } }
  if (parent.pin && Date.now() - lastTouch > PARENT_MINUTES * 60e3) { lockParent(); }
  // pick up a new version of the board when nobody's using it
  if (idleOn && firstBuild && S.build !== firstBuild && !liveTimers().length) location.reload();
  // fresh page once a night keeps Safari tidy
  const d = new Date();
  if (idleOn && d.getHours() === 3 && d.getMinutes() < 2 && performance.now() > 3 * 3600e3 && !liveTimers().length) location.reload();
}, 5000);

/* Keep the screen awake where Safari allows it (iPadOS 18.4+ in Home Screen apps) */
let wakeLock = null;
async function requestWakeLock() {
  try { if ("wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => (wakeLock = null)); } } catch {}
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { requestWakeLock(); refreshState(); refreshCalendar(); } });

/* ---------------- First run and connecting a device ---------------- */
let gateShown = false;
function showGate(setUp = true) {
  if (gateShown) return;
  gateShown = true;
  const app = $("#app");
  const title = setUp ? "Connect this device" : "Set up your family board";
  const lead = setUp ? "Enter the parent PIN once and this phone or iPad stays connected to the board." : "Choose a 4-digit parent PIN. You'll use it to connect phones, approve chores and change settings.";
  // A new board always gets a 4-digit PIN; an existing one checks as soon as its PIN length is reached.
  const target = setUp ? PIN_LEN : 4;
  app.innerHTML = `<div class="gate"><h1>${title}</h1><p>${lead}</p><div class="pin-dots" id="gdots"></div><p class="err" id="gerr"></p>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-g="${n}">${n}</button>`).join("")}<button class="txt" data-g="del">Delete</button><button data-g="0">0</button>${target ? "<span></span>" : `<button class="ok" data-g="ok">Connect</button>`}</div></div>`;
  let val = "", first = null, busy = false;
  const dots = $("#gdots"), err = $("#gerr");
  const draw = () => { dots.innerHTML = Array.from({ length: target || Math.max(4, val.length) }, (_, i) => `<i class="${i < val.length ? "f" : ""}"></i>`).join(""); };
  draw();
  const shake = (m) => { err.textContent = m; dots.classList.remove("shake"); void dots.offsetWidth; dots.classList.add("shake"); val = ""; draw(); };
  app.onclick = async (e) => {
    const k = e.target.closest("[data-g]")?.dataset.g;
    if (!k || busy) return;
    if (k === "del") { val = val.slice(0, -1); draw(); return; }
    if (k !== "ok") {
      if (val.length < (target || 8)) { val += k; draw(); }
      if (!target || val.length < target) return;
    }
    if (val.length < 4) return shake("Use at least 4 digits.");
    const device = /iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)) ? "iPad" : /iPhone/.test(navigator.userAgent) ? "iPhone" : "Browser";
    busy = true;
    try {
      if (setUp) { await api("/api/pair", { pin: val, device }); PIN_LEN = val.length; }
      else {
        if (!first) { first = val; val = ""; draw(); $(".gate p").textContent = "Enter the same PIN again to check it."; err.textContent = ""; busy = false; return; }
        if (first !== val) { first = null; $(".gate p").textContent = lead; busy = false; return shake("Those didn't match. Start again."); }
        await api("/api/setup", { pin: val, device });
        PIN_LEN = val.length;
        setParent(val);
      }
      app.onclick = null;
      gateShown = false;
      app.innerHTML = "";
      await boot();
      if (!setUp) openSettings("family");
    } catch (ex) { shake(ex.message); }
    busy = false;
  };
}

/* ---------------- Start ---------------- */
async function boot() {
  const hello = await api("/api/hello");
  PIN_LEN = hello.pinLength || null;
  if (!hello.setUp) return showGate(false);
  if (!hello.paired) return showGate(true);
  await refreshState();
  refreshCalendar();
  refreshWeather();
  refreshPhotos();
}

boot().catch(() => {
  $("#app").innerHTML = `<div class="gate"><h1>Can't reach the board</h1><p>Check the internet connection. It'll try again in a minute.</p></div>`;
  setTimeout(() => location.reload(), 60000);
});
setInterval(() => { if (document.visibilityState === "visible" && !gateShown) refreshState(); }, 8000);
setInterval(() => !gateShown && refreshCalendar(), 10 * 60e3);
setInterval(() => !gateShown && refreshWeather(), 15 * 60e3);
setInterval(() => !gateShown && refreshPhotos(), 30 * 60e3);
setInterval(tickClock, 1000);
