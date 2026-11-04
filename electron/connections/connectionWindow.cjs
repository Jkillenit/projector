/**
 * Connections (CLAUDE.md rule 5): the student signs in on the service's own page, in an app window with its own
 * cookie store. Off until the student connects. Disconnect deletes the cookies, the cache and anything saved.
 * Only the tech lead changes files in electron/connections/.
 *
 * Probe mode (PROJECTOR_PROBE=1 only): while the window is open, writes userData/probe-<id>.json with page paths
 * and the *shape* of JSON answers (keys and types). Never values, query strings, headers or cookies (rule 3).
 */
const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { getDb } = require("../database.cjs");
const { SERVICES, byId, partitionOf, allowedHost } = require("./services.cjs");
const { safePath, shapeOf, queryKeys } = require("./probeShape.cjs");
const { failPage } = require("./failPage.cjs");
const { fromWeekAtAGlance, mondayOf, weekUrl, ymdOf } = require("./mybamaWeek.cjs");

const STATUS_KEY = "connections.status";
const PROBE = process.env.PROJECTOR_PROBE === "1";
const windows = new Map();
const probeFile = (id) => path.join(app.getPath("userData"), `probe-${id}.json`);

function readJson(key, fallback) {
  try {
    return JSON.parse(getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')")
    .run(key, JSON.stringify(value));
}

const readStatus = () => readJson(STATUS_KEY, {});
const writeStatus = (status) => writeJson(STATUS_KEY, status);
// Everything saved from a connection lives under "conn.<id>." so Disconnect can delete all of it.
const savedKey = (id, name) => `conn.${id}.${name}`;
const SCHEDULE_FRESH_MS = 6 * 60 * 60 * 1000;

/** This week's myBama schedule, read with the student's own signed-in session. GET only. */
async function fetchMybamaWeek(date = new Date()) {
  try {
    const res = await session.fromPartition(partitionOf("mybama")).fetch(weekUrl(date), {
      method: "GET",
      headers: { accept: "application/json", "x-requested-with": "XMLHttpRequest" },
    });
    // Signed out, Banner sends the UA sign-in page (HTML) instead of the schedule.
    if (!res.ok || !/json/i.test(res.headers.get("content-type") || "")) return { ok: false, signedOut: true };
    const week = fromWeekAtAGlance(await res.json(), ymdOf(mondayOf(date)));
    return week ? { ok: true, ...week } : { ok: false, signedOut: true };
  } catch {
    return { ok: false, offline: true };
  }
}

/** Signed in for real: myBama answers with a schedule. Other services fall back to "has a cookie" until they are built. */
async function isSignedIn(service) {
  if (service.id === "mybama") {
    const week = await fetchMybamaWeek();
    if (week.ok) writeJson(savedKey("mybama", "schedule"), { ...week, fetchedAt: Date.now() });
    return week.ok;
  }
  const cookies = await session.fromPartition(partitionOf(service.id)).cookies.get({ domain: service.cookieHost });
  return cookies.length > 0;
}

function list() {
  const status = readStatus();
  return SERVICES.map(({ id, name, reads, sends, ready }) => ({ id, name, reads, sends, ready, connected: !!status[id], connectedAt: status[id]?.at || null }));
}

function startProbe(win, id) {
  const log = { service: id, note: "Paths and data shapes only. No values, queries, headers or cookies.", pages: [], blocked: [], json: [] };
  const save = () => fs.writeFileSync(probeFile(id), JSON.stringify(log, null, 2));
  const pending = new Map();
  const dbg = win.webContents.debugger;
  try {
    dbg.attach("1.3");
    dbg.sendCommand("Network.enable").catch(() => {}); // the window can close before this answers
  } catch {
    return log;
  }
  const requests = new Map();
  dbg.on("message", async (_e, method, params) => {
    if (method === "Network.requestWillBeSent") {
      // The verb and the query parameter *names* only; values and bodies are never kept.
      requests.set(params.requestId, { method: params.request?.method, query: queryKeys(params.request?.url) });
    } else if (method === "Network.responseReceived" && /json/i.test(params.response?.mimeType || "")) {
      pending.set(params.requestId, { ...requests.get(params.requestId), path: safePath(params.response.url), status: params.response.status });
    } else if (method === "Network.loadingFinished" && pending.has(params.requestId)) {
      const meta = pending.get(params.requestId);
      pending.delete(params.requestId);
      requests.delete(params.requestId);
      try {
        const { body, base64Encoded } = await dbg.sendCommand("Network.getResponseBody", { requestId: params.requestId });
        log.json.push({ ...meta, shape: shapeOf(JSON.parse(base64Encoded ? Buffer.from(body, "base64").toString("utf8") : body)) });
        save();
      } catch {
        /* not JSON after all, or gone */
      }
    }
  });
  win.webContents.on("did-navigate", (_e, url) => {
    log.pages.push(safePath(url));
    save();
  });
  return log;
}

function registerConnectionHandlers(getMainWindow) {
  const fromMain = (event) => {
    const win = getMainWindow();
    return !!win && !win.isDestroyed() && event?.sender === win.webContents;
  };
  const changed = () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send("connections:changed", list());
  };

  ipcMain.handle("connections:list", (event) => (fromMain(event) ? list() : []));

  ipcMain.handle("connections:connect", async (event, id) => {
    const service = byId(id);
    if (!fromMain(event) || !service?.ready) return { ok: false, error: "This connection is not available yet." };
    const open = windows.get(id);
    if (open && !open.isDestroyed()) {
      open.focus();
      return { ok: true };
    }
    const win = new BrowserWindow({
      width: 1100,
      height: 850,
      title: `Projector: sign in to ${service.name}${PROBE ? " (probe on)" : ""}`,
      parent: getMainWindow() || undefined,
      webPreferences: { partition: partitionOf(id), nodeIntegration: false, contextIsolation: true, sandbox: true },
    });
    windows.set(id, win);
    const log = PROBE ? startProbe(win, id) : null;
    const outside = (url) => {
      if (log) log.blocked.push(safePath(url));
      if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    };
    // A load that fails or is replaced by a sign-in redirect rejects; did-fail-load below shows the student what happened.
    const go = (url) => win.loadURL(url).catch(() => {});
    // The window stays on the service's own sign-in sites. Anything else opens in the browser.
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (allowedHost(service, url)) void go(url);
      else outside(url);
      return { action: "deny" };
    });
    win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
      // -3 is "aborted": a redirect or a newer load took over, which is normal during sign-in.
      if (!isMainFrame || code === -3 || String(url).startsWith("data:") || win.isDestroyed()) return;
      void go(`data:text/html;charset=utf-8,${encodeURIComponent(failPage(url))}`);
    });
    win.webContents.on("will-navigate", (e, url) => {
      if (allowedHost(service, url)) return;
      e.preventDefault();
      outside(url);
    });
    win.on("closed", async () => {
      windows.delete(id);
      const status = readStatus();
      if (await isSignedIn(service)) status[id] = { at: new Date().toISOString() };
      else delete status[id];
      writeStatus(status);
      changed();
    });
    await go(service.startUrl);
    return { ok: true };
  });

  ipcMain.handle("connections:disconnect", async (event, id) => {
    const service = byId(id);
    if (!fromMain(event) || !service) return { ok: false };
    const open = windows.get(id);
    if (open && !open.isDestroyed()) {
      open.removeAllListeners("closed"); // or closing would mark it connected again before the wipe
      open.destroy();
    }
    windows.delete(id);
    const s = session.fromPartition(partitionOf(id));
    await s.clearStorageData();
    await s.clearCache();
    fs.rmSync(probeFile(id), { force: true });
    getDb().prepare("DELETE FROM settings WHERE key LIKE ?").run(`${savedKey(id, "")}%`);
    const status = readStatus();
    delete status[id];
    writeStatus(status);
    changed();
    return { ok: true };
  });

  // This week's classes from myBama: saved for 6 hours so the map works offline. GET only (rule 5).
  ipcMain.handle("connections:mybama:week", async (event, { refresh = false } = {}) => {
    if (!fromMain(event)) return { ok: false };
    if (!readStatus().mybama) return { ok: false, notConnected: true };
    const key = savedKey("mybama", "schedule");
    const saved = readJson(key, null);
    const thisWeek = ymdOf(mondayOf());
    if (!refresh && saved?.weekStart === thisWeek && Date.now() - saved.fetchedAt < SCHEDULE_FRESH_MS) return { ok: true, ...saved };
    const week = await fetchMybamaWeek();
    if (week.ok) {
      writeJson(key, { ...week, fetchedAt: Date.now() });
      return { ok: true, ...week, fetchedAt: Date.now() };
    }
    // Signed out or offline: the last saved week still helps, marked stale.
    return saved?.weekStart === thisWeek ? { ok: true, ...saved, stale: true, signedOut: !!week.signedOut } : week;
  });
}

module.exports = { registerConnectionHandlers };
