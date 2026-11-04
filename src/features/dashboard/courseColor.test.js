import { describe, expect, it } from "vitest";
import { GRAY_SLOT, assignColors, getCourseColor, isShell } from "./courseColor.js";

describe("assignColors", () => {
  it("gives courses the palette in list order and skips gray", () => {
    expect(assignColors(["a", "b", "c", "d", "e"])).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 6 });
  });

  it("keeps a saved color when the list order changes", () => {
    const first = assignColors(["a", "b"]);
    expect(assignColors(["c", "b", "a"], first)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("puts shells on gray and wraps past the palette", () => {
    const keys = ["a", "b", "c", "d", "e", "f"];
    const out = assignColors([...keys, "orient"], {}, ["orient"]);
    expect(out.orient).toBe(GRAY_SLOT);
    expect(out.f).toBe(1);
  });

  it("knows orientation shells", () => {
    expect(isShell("Bama Bound Orientation")).toBe(true);
    expect(isShell("Marketing Principles")).toBe(false);
  });

  it("hands back CSS variables with a gray fallback", () => {
    expect(getCourseColor(3).dot).toBe("var(--c3-dot)");
    expect(getCourseColor(undefined).wash).toBe("var(--c5-wash)");
  });
});
