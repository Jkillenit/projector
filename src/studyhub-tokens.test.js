import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./studyhub-bootstrap.css", import.meta.url), "utf8");
const start = css.indexOf(":root {");
const root = css.slice(start, css.indexOf("}", start));
const token = (name) => root.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

describe("design tokens", () => {
  it("uses one muted crimson accent", () => {
    expect(token("fd-accent")).toBe("#B05A6A");
    expect(token("fd-danger")).toBe("#E5686A");
    expect(token("fd-warn")).toBe("#E3BE72");
  });

  it("has a light theme that overrides the surface and text tokens", () => {
    const light = css.slice(css.indexOf('html[data-theme="light"]'));
    for (const name of ["fd-bg", "fd-panel-solid", "fd-text", "fd-accent"]) expect(light).toMatch(new RegExp("--" + name + ":"));
  });

  it("uses Geist for everything", () => {
    expect(token("fd-font-body")).toMatch(/^"Geist Sans"/);
    expect(token("fd-font-num")).toMatch(/^"Geist Mono"/); // mono is for numbers only
    expect(token("fd-font-mono")).toBe("var(--fd-font-body)");
    expect(token("fd-font-display")).toMatch(/^"Geist Sans"/);
    expect(css).not.toMatch(/Michroma|Manrope|Chakra Petch|JetBrains Mono/);
  });

  it("uses one corner radius", () => {
    expect(token("fd-radius")).toBe("8px");
    for (const size of ["xs", "sm", "md", "lg", "xl"]) expect(token("fd-radius-" + size)).toBe("var(--fd-radius)");
    const literals = [...css.matchAll(/border(?:-(?:top|bottom)-(?:left|right))?-radius:\s*([^;]+);/g)]
      .map((m) => m[1].trim())
      .filter((v) => !/^(0|50%|999px|inherit|var\(--fd-radius-[a-z]+\))( !important)?$/.test(v));
    expect(literals).toEqual([]);
  });

  it("drops the background grid", () => {
    expect(css).not.toMatch(/--fd-grid-line/);
  });

  it("leaves no old palette or HUD chrome behind", () => {
    expect(css).not.toMatch(/79,\s*216,\s*255|#4FD8FF|#4CF0E8|#FF4FD8/i);
    expect(css).not.toMatch(/\.fd-cut\b|\.fd-hex\b|\.fd-bracket\b|\.nv-scan\b|\.nv-sweep\b/);
  });

  it("drops the chamfer", () => {
    expect(token("fd-side")).toBe("#0D0E10");
    expect(token("fd-accent-2-soft")).toMatch(/^color-mix/);
    expect(token("fd-cut")).toBe("0");
  });
});

// WCAG contrast of the real token values, in both themes.
const lightStart = css.indexOf('html[data-theme="light"]');
const light = css.slice(lightStart, css.indexOf("}", lightStart));
const themes = { dark: token, light: (n) => light.match(new RegExp(`--${n}:\\s*([^;]+);`))?.[1].trim() ?? token(n) };
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => { const [r, g, b] = rgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

describe.each(["dark", "light"])("contrast, %s theme", (name) => {
  const t = themes[name];
  const surfaces = ["fd-bg", "fd-panel-solid"];
  it.each(surfaces)("body and secondary text read on %s", (surface) => {
    expect(ratio(t("fd-text"), t(surface))).toBeGreaterThanOrEqual(7);
    expect(ratio(t("fd-text-2"), t(surface))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t("fd-text-3"), t(surface))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t("fd-warn-text"), t(surface))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t("fd-danger-text"), t(surface))).toBeGreaterThanOrEqual(4.5);
  });
  it("the filled accent button text reads on the accent", () => {
    expect(ratio(t("fd-accent-ink"), t("fd-accent"))).toBeGreaterThanOrEqual(4.5);
  });
  it.each(Array.from({ length: 8 }, (_, i) => i + 1))("course color %i is visible on cards", (n) => {
    expect(ratio(t("course-" + n), t("fd-panel-solid"))).toBeGreaterThanOrEqual(3);
  });
});
