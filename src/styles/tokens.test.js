import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const tokens = readFileSync(join(SRC, "styles/tokens.css"), "utf8");
const light = tokens.slice(0, tokens.indexOf(':root[data-theme="dark"]'));
const dark = tokens.slice(tokens.indexOf(':root[data-theme="dark"]'));
const token = (css, name) => css.match(new RegExp(`--${name}:\s*([^;]+);`))?.[1].trim();

const channels = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
const lum = (h) => {
  const [r, g, b] = channels(h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });

describe("design tokens", () => {
  it("has the approved light palette as the default", () => {
    expect(token(light, "bg")).toBe("#F7F5F2");
    expect(token(light, "surface")).toBe("#FFFFFF");
    expect(token(light, "accent")).toBe("#9E1B32");
    expect(token(light, "new-text")).toBe("#7A4E00");
    expect(tokens.indexOf(':root[data-theme="dark"]')).toBeGreaterThan(tokens.indexOf(":root,"));
  });

  it("has a dark theme with the same names", () => {
    for (const name of ["bg", "surface", "text", "muted", "faint", "accent", "accent-text", "accent-fill-hover", "new", "new-text", "border-input", "shadow-3"]) expect(token(dark, name), name).toBeTruthy();
  });

  it.each([["light"], ["dark"]])("%s text passes 4.5:1 and input borders 3:1", (theme) => {
    const css = theme === "light" ? light : dark;
    for (const bg of ["bg", "surface", "surface-2"])
      for (const fg of ["text", "text-2", "muted", "faint", "accent-text", "new-text", "good-text"])
        expect(ratio(token(css, fg), token(css, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    for (const fill of ["accent", "accent-fill-hover"]) expect(ratio(token(light, "on-fill"), token(css, fill)), fill).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token(css, "border-input"), token(css, "surface-input"))).toBeGreaterThanOrEqual(3);
  });

  it("uses Atkinson Hyperlegible Next for words and the system monospace for codes, never Inter, Geist or Space Grotesk", () => {
    expect(token(light, "font-sans")).toMatch(/^"Atkinson Hyperlegible Next Variable"/);
    expect(token(light, "font-mono")).toMatch(/^ui-monospace/);
    expect(tokens).not.toMatch(/\b(Inter|Geist|Space Grotesk)\b/i);
  });

  it("keeps corners crisp: no radius token over 8px except the dot/toggle --r-full", () => {
    for (const name of ["r-sm", "r-md", "r-lg"]) expect(parseFloat(token(light, name)), name).toBeLessThanOrEqual(8);
  });

  it("has one shadow, for overlays only", () => {
    expect(tokens.match(/--shadow-\d/g)).toEqual(["--shadow-3", "--shadow-3"]);
  });

  it("keeps hex colors inside tokens.css", () => {
    const offenders = files(SRC)
      .filter((f) => /\.(css|jsx?)$/.test(f) && !f.endsWith("tokens.css") && !/\.test\.js$/.test(f) && !f.includes(`${join("src", "demo")}`))
      .filter((f) => /#[0-9A-Fa-f]{6}\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("uses no gradients", () => {
    expect(readFileSync(join(SRC, "styles/ui.css"), "utf8")).not.toMatch(/gradient\(/);
  });
});
