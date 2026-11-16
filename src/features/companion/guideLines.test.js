import { describe, expect, it } from "vitest";
import { HELLO_LINES, guideHello } from "./guideLines.js";

describe("guideHello", () => {
  it("greets by first name", () => {
    expect(guideHello("Maya", new Date(2026, 10, 15, 9))).toMatch(/^Hi Maya\. /);
  });

  it("still greets without a name", () => {
    expect(guideHello("  ", new Date(2026, 10, 15))).toMatch(/^Hi\. /);
    expect(guideHello(null, new Date(2026, 10, 15))).toMatch(/^Hi\. /);
  });

  it("keeps one line all day and changes the next day", () => {
    const morning = guideHello("Maya", new Date(2026, 10, 15, 7));
    expect(guideHello("Maya", new Date(2026, 10, 15, 23, 59))).toBe(morning);
    expect(guideHello("Maya", new Date(2026, 10, 16, 7))).not.toBe(morning);
  });

  it("goes through every line", () => {
    const seen = new Set(Array.from({ length: HELLO_LINES.length }, (_, i) => guideHello("", new Date(2026, 0, 1 + i))));
    expect(seen.size).toBe(HELLO_LINES.length);
  });

  it("never talks about grades", () => {
    for (const line of HELLO_LINES) expect(line).not.toMatch(/grade|score|gpa|%/i);
  });
});
