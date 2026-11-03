import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { FULL_EVERY_MS, needsFull, syllabusUnchanged } = createRequire(import.meta.url)("./syncMode.cjs");

describe("needsFull", () => {
  const now = 1_000_000_000_000;
  it("is full on the first sync and when forced", () => {
    expect(needsFull({ lastFullAt: null, now })).toBe(true);
    expect(needsFull({ lastFullAt: new Date(now).toISOString(), force: true, now })).toBe(true);
  });

  it("is light until a week has passed", () => {
    expect(needsFull({ lastFullAt: new Date(now - FULL_EVERY_MS + 1000).toISOString(), now })).toBe(false);
    expect(needsFull({ lastFullAt: new Date(now - FULL_EVERY_MS).toISOString(), now })).toBe(true);
  });
});

describe("syllabusUnchanged", () => {
  it("skips only when one was found and the source items match", () => {
    expect(syllabusUnchanged({ found: true, fingerprint: "a" }, "a")).toBe(true);
    expect(syllabusUnchanged({ found: true, fingerprint: "a" }, "b")).toBe(false);
    expect(syllabusUnchanged({ found: false, fingerprint: "a" }, "a")).toBe(false);
    expect(syllabusUnchanged(undefined, "a")).toBe(false);
  });
});
