import { describe, expect, it } from "vitest";
import { PALETTE_SIZE, colorIndexes, courseColor } from "./courseColor.js";

describe("colorIndexes", () => {
  it("gives every course its own color and keeps it when the list order changes", () => {
    const a = colorIndexes(["mkt300", "ac310", "fi302"]);
    const b = colorIndexes(["fi302", "mkt300", "ac310"]);
    expect(a).toEqual(b);
    expect(new Set(Object.values(a)).size).toBe(3);
  });

  it("puts organizations after the classes and wraps past the palette", () => {
    const ids = Array.from({ length: PALETTE_SIZE + 1 }, (_, i) => `c${i}`);
    const idx = colorIndexes([...ids, "org"], ["org"]);
    expect(idx.org).toBe((ids.length % PALETTE_SIZE) + 1);
    expect(idx.c0).toBe(idx[`c${PALETTE_SIZE}`]);
  });

  it("falls back to grey for an unknown course", () => {
    expect(courseColor({ a: 3 }, "a")).toBe("var(--course-3)");
    expect(courseColor({ a: 3 }, "zzz")).toBe("var(--fd-text-3)");
  });
});
