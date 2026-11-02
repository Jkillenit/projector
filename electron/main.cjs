const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");

const { registerDbHandlers } = require("./dbHandlers.cjs");
const { registerMirrorHandlers } = require("./dbMirrorHandlers.cjs");
const { registerBlackboardHandlers } = require("./blackboardWindow.cjs");
const { registerMaintenanceHandlers } = require("./maintenance.cjs");

if (!app.requestSingleInstanceLock()) {
  app.exit(0);
}

let mainWindow = null;
let windowChromeHandlersRegistered = false;

ipcMain.handle("projector:open-external", async (_evt, url) => {
  const value = String(url || "");
  if (!/^https:\/\//i.test(value)) return { ok: false, error: "Only https links can be opened." };
  await shell.openExternal(value);
  return { ok: true };
});

function registerWindowChromeHandlersOnce() {
  if (windowChromeHandlersRegistered) return;
  windowChromeHandlersRegistered = true;
  ipcMain.on("window-minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.on("window-maximize", (event) => {
    const w = BrowserWindow.fromWebContents(event.sender);
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  ipcMain.on("window-close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMain.handle("window-is-maximized", (event) => {
    const w = BrowserWindow.fromWebContents(event.sender);
    return !!w && w.isMaximized();
  });
}

function attachWindowStateEvents(win) {
  win.on("maximize", () => win.webContents.send("window-maximized"));
  win.on("unmaximize", () => win.webContents.send("window-unmaximized"));
}

function createWindow() {
  /** @type {import('electron').BrowserWindowConstructorOptions} */
  const opts = {
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: "#060608",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
  if (process.platform === "darwin") {
    opts.titleBarStyle = "hidden";
  }
  const win = new BrowserWindow(opts);
  mainWindow = win;

  if (process.platform === "darwin") {
    try {
      win.setWindowButtonVisibility(false);
    } catch {
      /* older Electron / edge cases */
    }
  }

  registerWindowChromeHandlersOnce();
  attachWindowStateEvents(win);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
      if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    }
  });

  win.once("ready-to-show", () => win.show());

  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  registerDbHandlers();
  registerMirrorHandlers();
  registerMaintenanceHandlers(() => mainWindow);
  createWindow();
  registerBlackboardHandlers(() => mainWindow);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("second-instance", () => {
  if (!app.isReady()) return;
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
