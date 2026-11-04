/**
 * Public UA feeds the desktop app reads signed out: The SOURCE club list and events, and UA's calendar (Localist).
 * GET only. Node's fetch never carries the Electron session's cookies, so no UA login rides along, and nothing
 * about the student is sent (CLAUDE.md rule 5). Raw rows go to the renderer; src/features/ turns them into our shapes.
 */
const BASE = "https://ua.campuslabs.com/engage/api/discovery/search/organizations";
const SOURCE_EVENTS = "https://ua.campuslabs.com/engage/api/discovery/event/search";
const CALENDAR = "https://calendar.ua.edu/api/2/events";
const PAGE = 100;
const MAX_ROWS = 3000; // stops a runaway loop if an API ignores paging
const FRESH_MS = 6 * 60 * 60 * 1000;
const EVENT_DAYS = 14;

async function getJson(fetchImpl, url) {
  const res = await fetchImpl(url, { method: "GET", credentials: "omit", headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  return res.json();
}

/** Engage (The SOURCE) pages with top/take and skip and answers `{ value: [...] }`. */
async function pagedEngage(fetchImpl, urlFor) {
  const rows = [];
  for (let skip = 0; skip < MAX_ROWS; skip += PAGE) {
    const page = (await getJson(fetchImpl, urlFor(skip)))?.value;
    if (!Array.isArray(page)) throw new Error("The SOURCE sent an unexpected answer");
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

const fetchSourceRows = (fetchImpl = fetch) =>
  pagedEngage(fetchImpl, (skip) => `${BASE}?orderBy%5B0%5D=UpperName%20asc&top=${PAGE}&skip=${skip}&filter=&query=`);

function fetchSourceEvents(fetchImpl = fetch, now = new Date()) {
  const after = encodeURIComponent(now.toISOString());
  return pagedEngage(fetchImpl, (skip) => `${SOURCE_EVENTS}?endsAfter=${after}&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=${PAGE}&skip=${skip}&query=`);
}

/** Localist answers `{ events: [{ event }], page: { current, total } }`. */
async function fetchCalendarEvents(fetchImpl = fetch) {
  const rows = [];
  for (let page = 1; rows.length < MAX_ROWS; page++) {
    const body = await getJson(fetchImpl, `${CALENDAR}?days=${EVENT_DAYS}&pp=${PAGE}&page=${page}`);
    if (!Array.isArray(body?.events)) throw new Error("UA's calendar sent an unexpected answer");
    rows.push(...body.events.map((e) => e.event));
    if (!body.page || body.page.current >= body.page.total) break;
  }
  return rows;
}

/** Memoizes a fetch for FRESH_MS. On failure it keeps the last good rows (marked stale) over an empty screen. */
function cached(load) {
  let cache = null;
  return async () => {
    if (cache && Date.now() - cache.at < FRESH_MS) return { ok: true, rows: cache.rows, at: cache.at };
    try {
      cache = { at: Date.now(), rows: await load() };
      return { ok: true, rows: cache.rows, at: cache.at };
    } catch {
      if (cache) return { ok: true, rows: cache.rows, at: cache.at, stale: true };
      return { ok: false, rows: [] };
    }
  };
}

function registerSourceHandlers(ipcMain, fetchImpl = fetch) {
  const clubs = cached(() => fetchSourceRows(fetchImpl));
  const sourceEvents = cached(() => fetchSourceEvents(fetchImpl));
  const calendarEvents = cached(() => fetchCalendarEvents(fetchImpl));

  ipcMain.handle("source:clubs", async () => {
    const res = await clubs();
    return { ...res, source: "the-source", ...(res.ok ? {} : { error: "Could not reach The SOURCE right now." }) };
  });
  // One source being down never hides the other.
  ipcMain.handle("campus:events", async () => {
    const [s, c] = await Promise.all([sourceEvents(), calendarEvents()]);
    return { ok: s.ok || c.ok, source: "live", sourceRows: s.rows, calendarRows: c.rows, stale: !!(s.stale || c.stale), down: [...(s.ok ? [] : ["The SOURCE"]), ...(c.ok ? [] : ["UA's calendar"])] };
  });
}

module.exports = { fetchSourceRows, fetchSourceEvents, fetchCalendarEvents, registerSourceHandlers, BASE, CALENDAR };
