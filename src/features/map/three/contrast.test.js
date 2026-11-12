import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(new URL("../../../styles/tokens.css", import.meta.url), "utf8");

// #69: text in the 3D map and the walkthrough, including labels over 3D, is at least 4.5 to 1 in both themes.
const darkAt = tokens.indexOf(':root[data-theme="dark"]');
const grab = (part) => {
  const out = {};
  for (const m of part.matchAll(/--([\w-]+):\s*([^;]+);/g)) if (!(m[1] in out)) out[m[1]] = m[2].trim();
  return out;
};
const light = grab(tokens.slice(0, darkAt));
const themes = { light, dark: { ...light, ...grab(tokens.slice(darkAt)) } };

const rgba = (v) => {
  if (v.startsWith("#")) return [0, 2, 4].map((i) => parseInt(v.slice(1).substr(i, 2), 16)).concat(1);
  const n = v.match(/[\d.]+/g).map(Number);
  return [n[0], n[1], n[2], n[3] ?? 1];
};
const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lum = (c) => {
  const [r, g, b] = c.slice(0, 3).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [text, background, minimum]. Backgrounds with alpha sit on --surface (the card).
const PAIRS = [
  ["text", "surface", 4.5], // step text
  ["muted", "surface", 4.5], // step numbers, OSM credit over the 3D view
  ["faint", "surface", 4.5], // "About 180 feet"
  ["muted", "surface-2", 4.5], // "Loading 3D…" over the 3D view
  ["text", "accent-panel", 4.5], // the current step
  ["accent-text", "surface", 3], // the current step's border and the focus ring
];

describe("3D map and walkthrough contrast", () => {
  for (const [name, t] of Object.entries(themes)) {
    it(`meets the minimums in ${name}`, () => {
      const card = rgba(t.surface);
      for (const [fg, bg, min] of PAIRS) {
        const back = over(rgba(t[bg]), card);
        expect(ratio(over(rgba(t[fg]), back), back), `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
      }
    });
  }

  it("catches a pair that fails", () => {
    expect(ratio(rgba("#777777"), rgba("#888888"))).toBeLessThan(1.5);
    expect(ratio(rgba("#000000"), rgba("#FFFFFF"))).toBeCloseTo(21);
  });
});
