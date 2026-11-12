import { describe, expect, it } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const { readIndoorFolder, registerIndoorHandlers, MAX_BYTES } = createRequire(import.meta.url)("./indoorFiles.cjs");

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "indoor-"));

describe("indoor files on this computer (#63)", () => {
  it("reads only *.indoor.json, sorted, and says which files are broken without quoting them", () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, "b.indoor.json"), JSON.stringify({ name: "B Hall" }));
    fs.writeFileSync(path.join(dir, "a.indoor.json"), "{ secret room list");
    fs.writeFileSync(path.join(dir, "notes.txt"), "skip me");
    const out = readIndoorFolder(dir);
    expect(out.map((f) => f.file)).toEqual(["a.indoor.json", "b.indoor.json"]);
    expect(out[0].error).toMatch(/could not be read/);
    expect(out[0].error).not.toMatch(/secret/);
    expect(out[1].data).toEqual({ name: "B Hall" });
  });

  it("skips files that are too big", () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, "big.indoor.json"), Buffer.alloc(MAX_BYTES + 1, 32));
    expect(readIndoorFolder(dir)).toEqual([{ file: "big.indoor.json", error: "This file is too big (over 5 MB)." }]);
  });

  it("is empty when the folder is not there yet", () => {
    expect(readIndoorFolder(path.join(tempDir(), "missing"))).toEqual([]);
  });

  it("opens the folder, making it first", async () => {
    const dir = path.join(tempDir(), "indoor");
    const handlers = {};
    const opened = [];
    registerIndoorHandlers({ handle: (ch, fn) => (handlers[ch] = fn) }, { dir: () => dir, openPath: async (p) => (opened.push(p), "") });
    expect(await handlers["indoor:openFolder"]()).toEqual({ ok: true });
    expect(fs.existsSync(dir)).toBe(true);
    expect(opened).toEqual([dir]);
    expect(await handlers["indoor:list"]()).toEqual([]);
  });
});
