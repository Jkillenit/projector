import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const { fetchSourceRows, fetchSourceEvents, fetchCalendarEvents, registerSourceHandlers, BASE, CALENDAR } = createRequire(import.meta.url)("./publicFeeds.cjs");

const answer = (body, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body });
const rows = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ Id: String(from + i) }));
const ipc = () => {
  const handlers = {};
  return { handlers, handle: (ch, fn) => (handlers[ch] = fn) };
};

describe("public feeds", () => {
  it("pages through The SOURCE with GET only and no cookies, then stops on a short page", async () => {
    const calls = [];
    const fake = async (url, opts) => {
      calls.push({ url, opts });
      return answer({ value: calls.length === 1 ? rows(100) : rows(30, 100) });
    };
    expect(await fetchSourceRows(fake)).toHaveLength(130);
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.url.startsWith(BASE) && c.opts.method === "GET" && c.opts.credentials === "omit")).toBe(true);
    expect(calls[1].url).toContain("skip=100");
  });

  it("asks The SOURCE only for approved events that have not ended", async () => {
    let url = "";
    await fetchSourceEvents(async (u) => ((url = u), answer({ value: [] })), new Date("2026-11-04T12:00:00Z"));
    expect(url).toContain("status=Approved");
    expect(url).toContain(`endsAfter=${encodeURIComponent("2026-11-04T12:00:00.000Z")}`);
  });

  it("pages through UA's calendar until the last page", async () => {
    const urls = [];
    const fake = async (u) => {
      urls.push(u);
      const current = urls.length;
      return answer({ events: [{ event: { id: current } }], page: { current, total: 3 } });
    };
    expect((await fetchCalendarEvents(fake)).map((e) => e.id)).toEqual([1, 2, 3]);
    expect(urls.every((u) => u.startsWith(CALENDAR) && u.includes("days=14"))).toBe(true);
  });

  it("throws on a bad answer", async () => {
    await expect(fetchSourceRows(async () => answer({}, false))).rejects.toThrow("503");
    await expect(fetchSourceRows(async () => answer({}))).rejects.toThrow("unexpected");
    await expect(fetchCalendarEvents(async () => answer({}))).rejects.toThrow("unexpected");
  });

  it("keeps the last good club list, and reports a plain error with none", async () => {
    const down = ipc();
    registerSourceHandlers(down, async () => answer({}, false));
    expect(await down.handlers["source:clubs"]()).toMatchObject({ ok: false, rows: [], error: expect.any(String) });

    const up = ipc();
    let ok = true;
    registerSourceHandlers(up, async () => (ok ? answer({ value: rows(3) }) : answer({}, false)));
    expect((await up.handlers["source:clubs"]()).rows).toHaveLength(3);
    ok = false;
    expect((await up.handlers["source:clubs"]()).rows).toHaveLength(3); // fresh cache, no refetch
  });

  it("still returns events when one of the two sources is down", async () => {
    const half = ipc();
    registerSourceHandlers(half, async (u) => (u.startsWith(CALENDAR) ? answer({}, false) : answer({ value: [{ id: "e1" }] })));
    const res = await half.handlers["campus:events"]();
    expect(res).toMatchObject({ ok: true, sourceRows: [{ id: "e1" }], calendarRows: [], down: ["UA's calendar"] });
  });
});
