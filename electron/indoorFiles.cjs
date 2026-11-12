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

// Photos at turns (#70): a bare name of a jpg, png or webp in the same folder. No folders, so nothing outside it.
const PHOTO = /^[\w-]+\.(jpe?g|png|webp)$/i;
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** One photo as a data URL: { ok, url } or { ok: false }. */
function readIndoorPhoto(dir, file) {
  const name = String(file || "");
  if (!PHOTO.test(name)) return { ok: false };
  try {
    const full = path.join(dir, name);
    if (fs.statSync(full).size > MAX_BYTES) return { ok: false };
    return { ok: true, url: `data:${MIME[name.split(".").pop().toLowerCase()]};base64,${fs.readFileSync(full).toString("base64")}` };
  } catch {
    return { ok: false };
  }
}

function registerIndoorHandlers(ipcMain, { dir, openPath }) {
  ipcMain.handle("indoor:list", () => readIndoorFolder(dir()));
  ipcMain.handle("indoor:photo", (_evt, file) => readIndoorPhoto(dir(), file));
  ipcMain.handle("indoor:openFolder", async () => {
    fs.mkdirSync(dir(), { recursive: true });
    const error = await openPath(dir());
    return error ? { ok: false, error } : { ok: true };
  });
}

module.exports = { readIndoorFolder, readIndoorPhoto, registerIndoorHandlers, MAX_BYTES };
