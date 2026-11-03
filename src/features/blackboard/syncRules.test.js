import { describe, expect, it } from "vitest";
import { SYNC_EVERY_MS, courseTermState, shouldSync, termCode } from "./syncRules.js";

const now = 1_000_000_000;
const base = { loggedIn: true, running: false, now };

describe("shouldSync", () => {
  it("never runs when signed out or already running", () => {
    for (const reason of ["start", "login", "manual", "tick"]) {
      expect(shouldSync({ ...base, loggedIn: false, reason })).toBe(false);
      expect(shouldSync({ ...base, running: true, reason })).toBe(false);
    }
  });

  it("start, login and manual always go", () => {
    for (const reason of ["start", "login", "manual"]) expect(shouldSync({ ...base, reason, lastTryAt: now })).toBe(true);
  });

  it("the timer waits 30 minutes from the last try", () => {
    expect(shouldSync({ ...base, reason: "tick", lastTryAt: null })).toBe(true);
    expect(shouldSync({ ...base, reason: "tick", lastTryAt: now - SYNC_EVERY_MS + 1 })).toBe(false);
    expect(shouldSync({ ...base, reason: "tick", lastTryAt: now - SYNC_EVERY_MS })).toBe(true);
  });
});

describe("termCode", () => {
  it("reads the prefix format", () => {
    expect(termCode("202640-SS.GBA-490-910-12345")).toBe("202640");
    expect(termCode("202640-ST-260-004")).toBe("202640");
  });

  it("reads the suffix format", () => {
    expect(termCode("41874.202640")).toBe("202640");
  });

  it("returns null when there is no term", () => {
    expect(termCode("MIS430-001")).toBe(null);
    expect(termCode("41874")).toBe(null);
    expect(termCode("")).toBe(null);
  });
});

describe("courseTermState", () => {
  const now = new Date(2026, 10, 2);

  it("keeps the current and upcoming terms, from either ID format", () => {
    expect(courseTermState({ courseCode: "202640-SS.GBA-490-910" }, now).keep).toBe(true);
    expect(courseTermState({ courseCode: "41874.202640" }, now).keep).toBe(true);
    expect(courseTermState({ courseCode: "202710-MKT-300-001" }, now).keep).toBe(true);
  });

  it("skips ended terms, from either ID format", () => {
    expect(courseTermState({ courseCode: "202540-SS.OM-300-001" }, now)).toMatchObject({ keep: false, ended: true });
    expect(courseTermState({ courseCode: "30211.202610" }, now)).toMatchObject({ keep: false, ended: true });
    expect(courseTermState({ courseCode: "202620-RUS-252-001" }, now).keep).toBe(false);
  });

  it("without a term, falls back to dates, then availability, never to keep by default", () => {
    expect(courseTermState({ courseCode: "MIS430", endDate: "2026-12-15T00:00:00Z" }, now).keep).toBe(true);
    expect(courseTermState({ courseCode: "MIS405", endDate: "2025-05-01T00:00:00Z" }, now)).toMatchObject({ keep: false, ended: true });
    expect(courseTermState({ courseCode: "XC", available: "Yes" }, now).keep).toBe(true);
    expect(courseTermState({ courseCode: "XC", available: "Term" }, now).keep).toBe(false);
    expect(courseTermState({ courseCode: "XC" }, now).keep).toBe(false);
  });
});
