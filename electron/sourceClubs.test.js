import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const { fetchSourceRows, registerSourceHandlers, BASE } = createRequire(import.meta.url)("./sourceClubs.cjs");

const answer = (value, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => ({ value }) });
const rows = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ Id: String(from + i) }));

describe("The SOURCE club fetch", () => {
  it("pages through the list with GET only and no cookies, then stops on a short page", async () => {
    const calls = [];
    const fake = async (url, opts) => {
      calls.push({ url, opts });
      return answer(calls.length === 1 ? rows(100) : rows(30, 100));
    };
    const out = await fetchSourceRows(fake);
    expect(out).toHaveLength(130);
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.url.startsWith(BASE) && c.opts.method === "GET" && c.opts.credentials === "omit")).toBe(true);
    expect(calls[1].url).toContain("skip=100");
  });

  it("throws on a bad answer", async () => {
    await expect(fetchSourceRows(async () => answer([], false))).rejects.toThrow("503");
    await expect(fetchSourceRows(async () => ({ ok: true, json: async () => ({}) }))).rejects.toThrow("unexpected");
  });

  it("keeps the last good list when a later fetch fails, and reports a plain error with none", async () => {
    const handlers = {};
    const ipc = { handle: (ch, fn) => (handlers[ch] = fn) };
    registerSourceHandlers(ipc, async () => answer([], false));
    expect(await handlers["source:clubs"]()).toMatchObject({ ok: false, rows: [] });

    let up = true;
    registerSourceHandlers(ipc, async () => (up ? answer(rows(3)) : answer([], false)));
    expect((await handlers["source:clubs"]()).rows).toHaveLength(3);
    up = false;
    expect((await handlers["source:clubs"]()).rows).toHaveLength(3); // fresh cache, no refetch
  });
});
