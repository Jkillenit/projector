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

const STATUS_KEY = "connections.status";
const PROBE = process.env.PROJECTOR_PROBE === "1";
const windows = new Map();
const probeFile = (id) => path.join(app.getPath("userData"), `probe-${id}.json`);

function readStatus() {
  try {
    return JSON.parse(getDb().prepare("SELECT value FROM settings WHERE key = ?").get(STATUS_KEY)?.value || "{}");
  } catch {
    return {};
  }
}

function writeStatus(status) {
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')")
    .run(STATUS_KEY, JSON.stringify(status));
}

// shortcut: "connected" means the service set a cookie for its host; swap for a real "am I signed in" check once the probe shows one.
async function hasSession(service) {
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
      if (await hasSession(service)) status[id] = { at: new Date().toISOString() };
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
    const status = readStatus();
    delete status[id];
    writeStatus(status);
    changed();
    return { ok: true };
  });
}

module.exports = { registerConnectionHandlers };
