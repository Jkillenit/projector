const fs = require("fs");
const path = require("path");

// Real indoor files live only on this computer (rule 14), in <userData>/indoor. Nothing here touches the network.
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Every *.indoor.json in `dir`: [{ file, data }] or [{ file, error }]. Errors are plain words and never quote the
 * file, so nothing from it reaches a log. The renderer runs checkIndoor on `data`.
 */
function readIndoorFolder(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => n.toLowerCase().endsWith(".indoor.json"))
    .sort()
    .map((file) => {
      const full = path.join(dir, file);
      try {
        if (fs.statSync(full).size > MAX_BYTES) return { file, error: "This file is too big (over 5 MB)." };
        return { file, data: JSON.parse(fs.readFileSync(full, "utf8")) };
      } catch {
        return { file, error: "This file could not be read. Is it saved as JSON?" };
      }
    });
}

function registerIndoorHandlers(ipcMain, { dir, openPath }) {
  ipcMain.handle("indoor:list", () => readIndoorFolder(dir()));
  ipcMain.handle("indoor:openFolder", async () => {
    fs.mkdirSync(dir(), { recursive: true });
    const error = await openPath(dir());
    return error ? { ok: false, error } : { ok: true };
  });
}

module.exports = { readIndoorFolder, registerIndoorHandlers, MAX_BYTES };
