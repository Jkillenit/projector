const { app, BrowserWindow, session, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { getDb } = require("./database.cjs");
const { applyBbSync, ensureCourseForBb } = require("./dbMirrorHandlers.cjs");
const { wipeBlackboardData } = require("./bbWipe.cjs");
const { needsFull, syllabusUnchanged } = require("./syncMode.cjs");
const {
  BB_PARTITION,
  BB_ORIGIN: BB_URL,
  getJson,
  listEnrollments,
  sessionWorks,
  syncCourse,
  findSyllabus,
  checkCourse,
  resetUserCache,
  setPageFetcher,
  getCourseInfo,
} = require("./bbSync.cjs");

let bbWindow = null;
const syllabusPopups = new Set();
let getMainWindow = () => null;
let onDisconnect = () => {};
let onConnect = () => {};
let extractBufferText = null;

const BB_TEMP_DIR = path.join(app.getPath("temp"), "projector-bb");
const BB_TEMP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const hostOf = (url) => {
  try {
    return new URL(String(url || "")).hostname;
  } catch {
    return "";
  }
};

function isBlackboardUrl(url) {
  try {
    const u = new URL(String(url || ""));
    return u.protocol === "https:" && (u.hostname === "blackboard.com" || u.hostname.endsWith(".blackboard.com"));
  } catch {
    return false;
  }
}

/** Only the Blackboard window, while showing a *.blackboard.com page, may drive imports. */
function isTrustedBbSender(event) {
  if (!bbWindow || bbWindow.isDestroyed()) return false;
  if (event?.sender !== bbWindow.webContents) return false;
  return isBlackboardUrl(event.senderFrame?.url || bbWindow.webContents.getURL());
}

function isMainWindowSender(event) {
  const win = getMainWindow();
  return !!win && !win.isDestroyed() && event?.sender === win.webContents;
}

/** Removes the Blackboard temp download folder, whatever is in it. */
function removeTempDir() {
  try {
    fs.rmSync(BB_TEMP_DIR, { recursive: true, force: true });
  } catch {
    /* in use; the OS clears temp later */
  }
}

function sendToMain(channel, payload) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

async function isLoggedIn() {
  const bbSession = session.fromPartition(BB_PARTITION);
  const cookies = await bbSession.cookies.get({
    domain: new URL(BB_URL).hostname,
  });
  return cookies.some(
    (c) => c.name === "BbRouter" || c.name === "BBLEARN_Login_Code" || c.name === "bbdlicd"
  );
}

function parseCourseFromUrl(url) {
  const match = String(url || "").match(/\/ultra\/courses\/(_\d+_\d+)\//);
  if (!match) return null;
  return { bbCourseId: match[1], url };
}

function displayLinkedCourseName(pageBbCourseId) {
  if (!pageBbCourseId) return "";
  try {
    return getDb().prepare("SELECT name FROM courses WHERE bb_course_id = ? LIMIT 1").get(pageBbCourseId)?.name || "";
  } catch {
    return "";
  }
}

/* ---------------- syllabus capture (Simple Syllabus and other LTI tools) ---------------- */

const SYLLABUS_HOST_RE = /(^|\.)simplesyllabus\.com$/i;
const LTI_LAUNCH_RE = /\/webapps\/blackboard\/execute\/blti\//i;
const LTI_TIMEOUT_MS = 15000;
const TAB_FIND_TIMEOUT_MS = 15000;
const TAB_LOAD_TIMEOUT_MS = 25000;
const SYLLABUS_LAUNCH_KEY = "bb.syllabusLaunch";
const HIDDEN_PREFS = {
  partition: BB_PARTITION,
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  backgroundThrottling: false,
};

function withTimeout(promise, ms, fallback) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

function readSyllabusLaunches() {
  try {
    const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(SYLLABUS_LAUNCH_KEY);
    return JSON.parse(row?.value || "{}") || {};
  } catch {
    return {};
  }
}

/** Remembers the Blackboard LTI launch that opened a syllabus page: per course, plus a course-agnostic template. */
function rememberSyllabusLaunch(launchUrl) {
  let u;
  try {
    u = new URL(launchUrl);
  } catch {
    return;
  }
  const courseId = u.searchParams.get("course_id");
  if (!/^_\d+_\d+$/.test(String(courseId || ""))) return;
  const relative = u.pathname + u.search;
  const data = readSyllabusLaunches();
  data.byCourse = { ...(data.byCourse || {}), [courseId]: relative };
  if (!u.searchParams.has("content_id")) data.template = relative.replace(/course_id=[^&]+/, "course_id={COURSE}");
  try {
    getDb()
      .prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
      )
      .run(SYLLABUS_LAUNCH_KEY, JSON.stringify(data));
  } catch {
    /* best effort */
  }
}

function syllabusLaunchFor(bbCourseId) {
  const data = readSyllabusLaunches();
  if (data.byCourse?.[bbCourseId]) return data.byCourse[bbCourseId];
  return data.template ? data.template.replace("{COURSE}", bbCourseId) : null;
}

/** When a syllabus tool page loads in any frame, the Blackboard LTI launch just before it is remembered. */
function watchLtiLaunches(wc) {
  let lastLaunch = null;
  wc.on("did-frame-navigate", (_event, url) => {
    if (isBlackboardUrl(url) && LTI_LAUNCH_RE.test(url)) lastLaunch = url;
    else if (isSyllabusToolUrl(url) && lastLaunch) rememberSyllabusLaunch(lastLaunch);
  });
}

function createHiddenBbWindow() {
  const win = new BrowserWindow({ show: false, width: 1200, height: 900, webPreferences: HIDDEN_PREFS });
  const popups = [];
  win.webContents.setAudioMuted(true);
  win.on("show", () => win.hide());
  win.webContents.setWindowOpenHandler(({ url }) =>
    isSyllabusToolUrl(url) || isBlackboardUrl(url)
      ? { action: "allow", overrideBrowserWindowOptions: { show: false, webPreferences: HIDDEN_PREFS } }
      : { action: "deny" }
  );
  win.webContents.on("did-create-window", (child) => {
    popups.push(child);
    child.on("show", () => child.hide());
    watchLtiLaunches(child.webContents);
  });
  watchLtiLaunches(win.webContents);
  return {
    win,
    contents: () => [win.webContents, ...popups.filter((p) => !p.isDestroyed()).map((p) => p.webContents)],
    destroy: () => {
      popups.forEach((p) => !p.isDestroyed() && p.destroy());
      if (!win.isDestroyed()) win.destroy();
    },
  };
}

function isSyllabusToolUrl(url) {
  try {
    const u = new URL(String(url || ""));
    return u.protocol === "https:" && SYLLABUS_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

function syllabusFrames(webContentsList) {
  const frames = [];
  for (const wc of webContentsList) {
    if (!wc || wc.isDestroyed()) continue;
    try {
      for (const frame of wc.mainFrame.framesInSubtree) if (isSyllabusToolUrl(frame.url)) frames.push(frame);
    } catch {
      /* frame tree unavailable */
    }
  }
  return frames;
}

/** Longest syllabus-tool text across frames once it stops growing (SPA pages render late). */
async function waitForSyllabusText(getWebContents, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    let best = "";
    for (const frame of syllabusFrames(getWebContents())) {
      try {
        const text = await withTimeout(
          frame.executeJavaScript("document.body ? document.body.innerText : ''"),
          3000,
          ""
        );
        if (typeof text === "string" && text.length > best.length) best = text;
      } catch {
        /* frame navigated away */
      }
    }
    if (best.length >= 500 && best.length === last.length) return best;
    last = best;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return last.length >= 500 ? last : "";
}

const LAST_FULL_KEY = "bb.lastFull";
const SYLLABUS_CACHE_KEY = "bb.syllabusCache";
const COURSE_ID_RE = /^_\d+_\d+$/;

/** Loads `relativeUrl` in a hidden Blackboard-session window and reads the syllabus tool page it leads to. */
async function readSyllabusAt(relativeUrl, timeoutMs) {
  const hidden = createHiddenBbWindow();
  try {
    hidden.win.loadURL(`${BB_URL}${relativeUrl}`).catch(() => {});
    return await waitForSyllabusText(hidden.contents, timeoutMs);
  } finally {
    hidden.destroy();
  }
}

/** Launches a course content LTI link (a syllabus item in the content list). */
async function readLtiText(bbCourseId, contentId) {
  if (!COURSE_ID_RE.test(String(bbCourseId)) || !COURSE_ID_RE.test(String(contentId))) return "";
  return readSyllabusAt(
    `/webapps/blackboard/execute/blti/launchLink?course_id=${bbCourseId}&content_id=${contentId}&from_ultra=true`,
    LTI_TIMEOUT_MS
  );
}

const CLICK_SYLLABUS_TAB = `(() => {
  const re = /^\\s*(simple\\s+)?syllabus\\s*$/i;
  const nodes = [...document.querySelectorAll('a, button, [role="tab"], [role="link"], [role="menuitem"]')];
  const matches = nodes.filter((n) => re.test(n.textContent || "") || re.test(n.getAttribute("aria-label") || ""));
  const target = matches.find((n) => n.offsetParent !== null) || matches[0];
  if (!target) return false;
  target.click();
  return true;
})()`;

/** Opens the course in a hidden window and clicks its Syllabus tab, like the student would. */
async function readSyllabusViaTab(bbCourseId) {
  const hidden = createHiddenBbWindow();
  try {
    hidden.win.loadURL(`${BB_URL}/ultra/courses/${bbCourseId}/outline`).catch(() => {});
    const deadline = Date.now() + TAB_FIND_TIMEOUT_MS;
    let clicked = false;
    while (!clicked && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (hidden.win.isDestroyed()) return "";
      clicked = !!(await withTimeout(hidden.win.webContents.executeJavaScript(CLICK_SYLLABUS_TAB).catch(() => false), 3000, false));
    }
    if (!clicked) return "";
    return await waitForSyllabusText(hidden.contents, TAB_LOAD_TIMEOUT_MS);
  } finally {
    hidden.destroy();
  }
}

/** Course-level syllabus tool (e.g. a Simple Syllabus tab): remembered launch first, then clicking the tab. */
async function readCourseSyllabus(bbCourseId) {
  if (!COURSE_ID_RE.test(String(bbCourseId))) return "";
  const launch = syllabusLaunchFor(bbCourseId);
  if (launch) {
    const text = await readSyllabusAt(launch, LTI_TIMEOUT_MS);
    if (text) return text;
  }
  return readSyllabusViaTab(bbCourseId);
}

async function openBlackboardWindow(targetUrl = null) {
  if (bbWindow && !bbWindow.isDestroyed()) {
    if (targetUrl) await bbWindow.loadURL(targetUrl).catch(() => {});
    bbWindow.focus();
    return;
  }

  const loggedIn = await isLoggedIn();
  bbWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    title: "Projector — Blackboard",
    webPreferences: {
      partition: BB_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  bbWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSyllabusToolUrl(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 1000,
          height: 850,
          title: "Projector — Syllabus",
          webPreferences: { partition: BB_PARTITION, nodeIntegration: false, contextIsolation: true, sandbox: true },
        },
      };
    }
    if (isBlackboardUrl(url)) {
      bbWindow?.loadURL(url);
    } else if (/^https:\/\//i.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  watchLtiLaunches(bbWindow.webContents);
  bbWindow.webContents.on("did-create-window", (child) => {
    syllabusPopups.add(child);
    watchLtiLaunches(child.webContents);
    child.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    child.on("closed", () => syllabusPopups.delete(child));
  });

  bbWindow.on("closed", () => {
    bbWindow = null;
  });

  const startUrl = loggedIn ? targetUrl || `${BB_URL}/ultra/course` : BB_URL;
  await bbWindow.loadURL(startUrl);
}

let loginWatch = null;

/** Sign in only: once the real users/me call works, the login window closes by itself. */
function watchForLogin() {
  clearInterval(loginWatch);
  loginWatch = setInterval(async () => {
    if (!bbWindow || bbWindow.isDestroyed()) return clearInterval(loginWatch);
    if (!(await sessionWorks())) return;
    clearInterval(loginWatch);
    closeBlackboardWindow();
    sendToMain("bb:connected", {});
    onConnect();
  }, 2000);
}

/**
 * Blackboard through the student's existing UA sign-in (shared with myBama, see CLAUDE.md rule 5): a hidden window
 * opens Blackboard, which hands off to UA's sign-in and back without asking again. True once users/me works.
 * GET only, like the rest of this file. Gives up after `timeoutMs`; then the visible window is the fallback.
 */
async function connectBlackboardQuietly(timeoutMs = 25000) {
  if (await sessionWorks()) return true;
  const win = new BrowserWindow({ show: false, width: 1200, height: 900, webPreferences: HIDDEN_PREFS });
  win.webContents.setAudioMuted(true);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  try {
    win.loadURL(`${BB_URL}/ultra/course`).catch(() => {});
    const until = Date.now() + timeoutMs;
    let onLoginSince = null;
    while (Date.now() < until && !win.isDestroyed()) {
      await new Promise((r) => setTimeout(r, 1500));
      if (await sessionWorks()) return true;
      // Sitting on UA's sign-in page means it wants a password: stop and let the student sign in for real.
      const onLogin = /(^|\.)myapps\.ua\.edu$|(^|\.)okta\.com$/i.test(hostOf(win.webContents.getURL()));
      onLoginSince = onLogin ? onLoginSince ?? Date.now() : null;
      if (onLoginSince && Date.now() - onLoginSince > 5000) return false;
    }
    return false;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

/** Connect Blackboard: no window when already connected (or the UA sign-in carries over), otherwise the sign-in window. */
async function connectBlackboard() {
  const already = await sessionWorks();
  if (already || (await connectBlackboardQuietly())) {
    sendToMain("bb:connected", { already });
    onConnect();
    return { success: true, opened: false };
  }
  await openBlackboardWindow();
  watchForLogin();
  return { success: true, opened: true };
}

function closeBlackboardWindow() {
  if (bbWindow && !bbWindow.isDestroyed()) {
    bbWindow.close();
  }
  bbWindow = null;
}

async function disconnectBlackboard() {
  closeBlackboardWindow();
  resetUserCache();
  onDisconnect();
  const bbSession = session.fromPartition(BB_PARTITION);
  await bbSession.clearStorageData();
  await bbSession.clearCache();
  removeTempDir();
  wipeBlackboardData(getDb());
  sendToMain("bb:disconnected", {});
}

function registerBlackboardHandlers(mainWindowGetter, options = {}) {
  getMainWindow = typeof mainWindowGetter === "function" ? mainWindowGetter : () => mainWindowGetter;
  if (typeof options.onDisconnect === "function") onDisconnect = options.onDisconnect;
  if (typeof options.onConnect === "function") onConnect = options.onConnect;
  if (typeof options.extractBufferText === "function") extractBufferText = options.extractBufferText;

  setPageFetcher(async (pathname) => {
    if (!bbWindow || bbWindow.isDestroyed()) return null;
    const wc = bbWindow.webContents;
    if (!isBlackboardUrl(wc.getURL()) || !/^\/learn\/api\//.test(String(pathname))) return null;
    try {
      return await wc.executeJavaScript(
        `fetch(${JSON.stringify(pathname)}, { credentials: "include", headers: { Accept: "application/json" } })
          .then(async (r) => ({ status: r.status, body: await r.text() }))`
      );
    } catch {
      return null;
    }
  });

  ipcMain.handle("bb:open", async (event) => {
    if (!isMainWindowSender(event)) return { success: false };
    return connectBlackboard();
  });

  ipcMain.handle("bb:open-url", async (event, url) => {
    if (!isMainWindowSender(event) || !isBlackboardUrl(url)) return { success: false };
    await openBlackboardWindow(String(url));
    return { success: true };
  });

  ipcMain.handle("bb:close", async (event) => {
    if (!isMainWindowSender(event) && !isTrustedBbSender(event)) return { success: false };
    closeBlackboardWindow();
    return { success: true };
  });

  ipcMain.handle("bb:disconnect", async (event) => {
    if (!isMainWindowSender(event)) return { success: false };
    await disconnectBlackboard();
    return { success: true };
  });

  ipcMain.handle("bb:getStatus", async () => ({
    loggedIn: await isLoggedIn(),
    windowOpen: bbWindow !== null && !bbWindow.isDestroyed(),
  }));

  ipcMain.handle("bb:list-courses", async (event) => {
    if (!isMainWindowSender(event)) return { ok: false, error: "untrusted" };
    if (!(await isLoggedIn())) return { ok: false, error: "not-logged-in" };
    try {
      const enrollments = await listEnrollments();
      return { ok: true, courses: enrollments.filter((e) => e.reason === "kept"), enrollments };
    } catch (err) {
      const error = err?.status === 401 || err?.status === 403 ? "not-logged-in" : err?.message || String(err);
      return { ok: false, error };
    }
  });

  const syncingIds = new Set();
  let syllabusChain = Promise.resolve();

  const readJsonSetting = (key) => {
    try {
      return JSON.parse(getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value || "{}") || {};
    } catch {
      return {};
    }
  };
  const writeJsonSetting = (key, value) => {
    try {
      getDb()
        .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')")
        .run(key, JSON.stringify(value));
    } catch {
      /* best effort */
    }
  };

  /** The slow part, one course at a time in hidden windows, after the course has already landed. Counts only leave here. */
  function queueSyllabus(bbCourseId, courseUuid, candidates) {
    syllabusChain = syllabusChain
      .then(async () => {
        const cache = readJsonSetting(SYLLABUS_CACHE_KEY);
        if (syllabusUnchanged(cache[bbCourseId], candidates.fingerprint)) {
          sendToMain("bb:syllabus", { bbCourseId, courseUuid, cached: true, source: cache[bbCourseId].source });
          return;
        }
        let found = null;
        try {
          found = await findSyllabus(bbCourseId, candidates.items, { extractBufferText, readLtiText, readCourseSyllabus });
        } catch {
          found = null;
        }
        if (found) {
          writeJsonSetting(SYLLABUS_CACHE_KEY, {
            ...readJsonSetting(SYLLABUS_CACHE_KEY),
            [bbCourseId]: { found: true, fingerprint: candidates.fingerprint, source: found.source, at: new Date().toISOString() },
          });
        }
        sendToMain("bb:syllabus", {
          bbCourseId,
          courseUuid,
          syllabus: found ? { source: found.source, title: found.title, text: found.text.slice(0, 200000) } : null,
        });
      })
      .catch(() => {});
  }

  /**
   * Finds or creates the linked course and sweeps Blackboard into it. Full the first time, on `force`,
   * or weekly; light (assignments, gradebook, announcements) otherwise. A full sync sends the syllabus
   * later on "bb:syllabus", so the course shows up first.
   */
  async function runSync({ bbCourseId, name, courseCode, term, fallbackName, force } = {}) {
    const id = String(bbCourseId || "");
    if (!COURSE_ID_RE.test(id)) return { ok: false, error: "Invalid Blackboard course id" };
    if (syncingIds.has(id)) return { ok: false, error: "A sync is already running." };
    if (!(await isLoggedIn())) return { ok: false, error: "not-logged-in" };
    syncingIds.add(id);
    let courseUuid = null;
    try {
      let info = { name, courseCode, term };
      if (!info.name) info = { ...info, ...(await getCourseInfo(id).catch(() => ({}))) };
      if (!info.name) info.name = fallbackName;
      const ensured = ensureCourseForBb(getDb(), { bbCourseId: id, ...info });
      courseUuid = ensured.courseUuid;
      const lastFull = readJsonSetting(LAST_FULL_KEY);
      const full = needsFull({ lastFullAt: lastFull[id], force: !!force });
      const payload = await syncCourse(id, (progress) => sendToMain("bb:sync-progress", { bbCourseId: id, courseUuid, ...progress }), { light: !full });
      const { candidates } = payload;
      delete payload.candidates;
      const result = applyBbSync(getDb(), courseUuid, payload);
      if (full && result.success) writeJsonSetting(LAST_FULL_KEY, { ...readJsonSetting(LAST_FULL_KEY), [id]: new Date().toISOString() });
      const summary = {
        ok: result.success,
        bbCourseId: id,
        courseUuid,
        created: ensured.created,
        full,
        syllabusPending: full && result.success,
        counts: result.counts ? { ...result.counts, scored: payload.scoredCount || 0 } : result.counts,
        gradeSource: payload.gradeSource,
        error: result.error,
        syllabus: null,
      };
      sendToMain("bb:sync-complete", summary);
      if (summary.syllabusPending) queueSyllabus(id, courseUuid, candidates);
      return summary;
    } catch (err) {
      const error = err?.status === 401 || err?.status === 403 ? "not-logged-in" : err?.message || String(err);
      sendToMain("bb:sync-complete", { ok: false, bbCourseId: id, courseUuid, error });
      return { ok: false, bbCourseId: id, courseUuid, error };
    } finally {
      syncingIds.delete(id);
    }
  }

  ipcMain.handle("bb:sync-course", async (event, data = {}) => {
    if (!isMainWindowSender(event)) return { ok: false, error: "untrusted" };
    return runSync(data);
  });

  return { openLogin: () => openBlackboardWindow() };
}

module.exports = {
  registerBlackboardHandlers,
  connectBlackboard,
  disconnectBlackboard,
  parseCourseFromUrl,
};

