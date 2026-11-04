import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const tokens = readFileSync(join(SRC, "styles/tokens.css"), "utf8");
const dark = tokens.slice(0, tokens.indexOf(':root[data-theme="light"]'));
const light = tokens.slice(tokens.indexOf(':root[data-theme="light"]'));
const token = (css, name) => css.match(new RegExp(`--${name}:\s*([^;]+);`))?.[1].trim();

const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });

describe("design tokens", () => {
  it("has the approved dark palette", () => {
    expect(token(dark, "bg")).toBe("#111113");
    expect(token(dark, "surface")).toBe("#18181B");
    expect(token(dark, "accent")).toBe("#B83A4F");
    expect(token(dark, "faint")).toBe("#8B8B94");
    expect(token(dark, "c1-dot")).toBe("#D9A54A");
  });

  it("has a light theme with the same names", () => {
    for (const name of ["bg", "surface", "text", "muted", "faint", "accent", "accent-text"]) expect(token(light, name), name).toBeTruthy();
  });

  it("uses Geist for words and Geist Mono for numbers", () => {
    expect(token(dark, "font-sans")).toMatch(/^"Geist Sans"/);
    expect(token(dark, "font-mono")).toMatch(/^"Geist Mono"/);
  });

  it("keeps hex colors inside tokens.css", () => {
    const offenders = files(SRC)
      .filter((f) => /\.(css|jsx?)$/.test(f) && !f.endsWith("tokens.css") && !/\.test\.js$/.test(f) && !f.includes(`${join("src", "demo")}`))
      .filter((f) => /#[0-9A-Fa-f]{6}\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("uses no gradient except the course header wash", () => {
    const css = readFileSync(join(SRC, "styles/ui.css"), "utf8");
    expect(css.match(/gradient\(/g)).toHaveLength(1);
    expect(css).toMatch(/linear-gradient\(180deg, var\(--course-wash\), transparent\)/);
  });
});
