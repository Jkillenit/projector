import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const jsx = (dir = SRC) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? jsx(p) : p.endsWith(".jsx") ? [p] : [];
  });

const css = readFileSync(new URL("./ui.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const values = (prop) => [...css.matchAll(new RegExp(String.raw`(?<![-\w])${prop}:\s*([^;}]+)[;}]`, "g"))].map((m) => m[1].trim());
/** Flat "selector { body }" rules (media query wrappers are skipped, their inner rules still match). */
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));

describe("ui.css follows the design system", () => {
  it("rounds corners only with radius tokens", () => {
    const ok = (p) => /^(var\(--r-(sm|md|lg|full)\)|50%|0)$/.test(p);
    expect(values("border-radius").filter((v) => !v.split(/\s+/).every(ok))).toEqual([]);
  });
  it("puts a shadow only on overlays (drawer, palette, sheets, dialogs), never on resting cards", () => {
    expect(values("box-shadow").filter((v) => !/^(var\(--shadow-3\)|none)$/.test(v))).toEqual([]);
  });

  it("does not animate on hover: no transitions, and no transform in a :hover rule", () => {
    expect(values("transition").filter((v) => v !== "none !important")).toEqual([]);
    expect(rules.filter((r) => r.sel.includes(":hover") && /transform|animation/.test(r.body)).map((r) => r.sel)).toEqual([]);
  });

  it("has no colored left stripes", () => {
    expect(values("border-left")).toEqual([]);
    expect(values("border-left-color")).toEqual([]);
  });

  it("has no skeleton placeholders", () => {
    expect(css).not.toMatch(/skel/i);
  });
  it("never sets text smaller than 12px", () => {
    expect(values("font-size").filter((v) => /px$/.test(v) && parseFloat(v) < 12)).toEqual([]);
  });

  it("never lets a state outline (selected, pressed, highlighted) replace the keyboard focus ring", () => {
    const offenders = rules
      .filter((r) => /(^|;|\s)outline:\s*(?!none)/.test(r.body) && !/:focus/.test(r.sel) && !r.sel.startsWith(".dev-"))
      .filter((r) => !r.sel.includes(":not(:focus-visible)"))
      .map((r) => r.sel);
    expect(offenders).toEqual([]);
  });

  it("lets auto-fill grid columns shrink below their minimum on narrow or zoomed screens", () => {
    const bad = css.match(/repeat\(auto-(fill|fit),\s*minmax\(\d+px/g) || [];
    expect(bad).toEqual([]);
  });

  it("keeps focused and new Ask answers out from under the sticky dock", () => {
    expect(css).toMatch(/\.app-scroll:has\(\.ask-dock\)\s*\{[^}]*scroll-padding-bottom:/);
  });

  it("keeps the phone layout clear of the notch in landscape (viewport-fit=cover)", () => {
    expect(css).toMatch(/env\(safe-area-inset-left\)/);
    expect(css).toMatch(/env\(safe-area-inset-right\)/);
  });
});

describe("screens follow the design system", () => {
  it("use no em dashes, emoji or decorative text arrows", () => {
    const bad = /—|→|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
    expect(jsx().filter((f) => bad.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});
