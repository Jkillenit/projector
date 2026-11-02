import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./studyhub-bootstrap.css", import.meta.url), "utf8");
const start = css.indexOf(":root {");
const root = css.slice(start, css.indexOf("}", start));
const token = (name) => root.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

describe("design tokens", () => {
  it("uses one muted crimson accent", () => {
    expect(token("fd-accent")).toBe("#C95A6E");
    expect(token("fd-danger")).toBe("#E5686A");
    expect(token("fd-warn")).toBe("#E3BE72");
  });

  it("has a light theme that overrides the surface and text tokens", () => {
    const light = css.slice(css.indexOf('html[data-theme="light"]'));
    for (const name of ["fd-bg", "fd-panel-solid", "fd-text", "fd-accent"]) expect(light).toMatch(new RegExp("--" + name + ":"));
  });

  it("uses Geist for everything", () => {
    expect(token("fd-font-body")).toMatch(/^"Geist Sans"/);
    expect(token("fd-font-mono")).toMatch(/^"Geist Mono"/);
    expect(token("fd-font-display")).toMatch(/^"Geist Sans"/);
    expect(css).not.toMatch(/Michroma|Manrope|Chakra Petch|JetBrains Mono/);
  });

  it("uses the small radius scale", () => {
    expect(token("fd-radius-sm")).toBe("6px");
    expect(token("fd-radius-md")).toBe("10px");
    expect(token("fd-radius-lg")).toBe("14px");
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
    expect(token("fd-side")).toBe("#0B0A0B");
    expect(token("fd-accent-2-soft")).toMatch(/^color-mix/);
    expect(token("fd-cut")).toBe("0");
  });
});
