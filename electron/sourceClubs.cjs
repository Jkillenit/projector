/**
 * The SOURCE (UA's club directory): its public club list, read signed out.
 * GET only. Node's fetch never carries the Electron session's cookies, so no UA login rides along (CLAUDE.md rule 5).
 * Returns the raw rows; src/features/clubs/sourceClubs.js turns them into our club shape.
 */
const BASE = "https://ua.campuslabs.com/engage/api/discovery/search/organizations";
const PAGE = 100;
const MAX_ROWS = 3000; // stops a runaway loop if the API ignores `skip`
const FRESH_MS = 6 * 60 * 60 * 1000;

async function fetchSourceRows(fetchImpl = fetch) {
  const rows = [];
  for (let skip = 0; skip < MAX_ROWS; skip += PAGE) {
    const url = `${BASE}?orderBy%5B0%5D=UpperName%20asc&top=${PAGE}&skip=${skip}&filter=&query=`;
    const res = await fetchImpl(url, { method: "GET", credentials: "omit", headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`The SOURCE answered ${res.status}`);
    const page = (await res.json())?.value;
    if (!Array.isArray(page)) throw new Error("The SOURCE sent an unexpected answer");
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

function registerSourceHandlers(ipcMain, fetchImpl = fetch) {
  let cache = null; // { at, rows }, kept in memory for this run only
  ipcMain.handle("source:clubs", async () => {
    if (cache && Date.now() - cache.at < FRESH_MS) return { ok: true, source: "the-source", rows: cache.rows, at: cache.at };
    try {
      cache = { at: Date.now(), rows: await fetchSourceRows(fetchImpl) };
      return { ok: true, source: "the-source", rows: cache.rows, at: cache.at };
    } catch {
      // An older list beats an empty screen.
      if (cache) return { ok: true, source: "the-source", rows: cache.rows, at: cache.at, stale: true };
      return { ok: false, source: "the-source", rows: [], error: "Could not reach The SOURCE right now." };
    }
  });
}

module.exports = { fetchSourceRows, registerSourceHandlers, BASE };
