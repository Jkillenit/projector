import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./ui.css", import.meta.url), "utf8");
const values = (prop) => [...css.matchAll(new RegExp(`(?<![-\w])${prop}:\s*([^;}]+)[;}]`, "g"))].map((m) => m[1].trim());

describe("ui.css follows the design system", () => {
  it("rounds corners only with radius tokens", () => {
    const ok = (p) => /^(var\(--r-(sm|md|lg|full)\)|50%|0)$/.test(p);
    expect(values("border-radius").filter((v) => !v.split(/\s+/).every(ok))).toEqual([]);
  });
  it("uses only shadow tokens", () => {
    expect(values("box-shadow").filter((v) => !/^(var\(--shadow-[123]\)|var\(--ring\)|none)$/.test(v))).toEqual([]);
  });
  it("never sets text smaller than 12px", () => {
    expect(values("font-size").filter((v) => /px$/.test(v) && parseFloat(v) < 12)).toEqual([]);
  });
});
