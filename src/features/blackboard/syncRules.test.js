import { describe, expect, it } from "vitest";
import { SYNC_EVERY_MS, currentTermCourses, shouldSync } from "./syncRules.js";

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

describe("currentTermCourses", () => {
  it("keeps the latest term only", () => {
    const list = [{ courseCode: "202540-A-1" }, { courseCode: "202640-B-2" }, { courseCode: "202640-C-3" }];
    expect(currentTermCourses(list).map((c) => c.courseCode)).toEqual(["202640-B-2", "202640-C-3"]);
  });

  it("keeps everything when no code has a term", () => {
    const list = [{ courseCode: "MIS430" }, { courseCode: "" }];
    expect(currentTermCourses(list)).toEqual(list);
  });
});
