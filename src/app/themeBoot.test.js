import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The inline script in index.html sets the stored theme before the first paint, so dark users never see a light flash.
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const boot = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function themeAfterBoot(stored, prefersLight = false) {
  const document = { documentElement: { dataset: { theme: "light" } } };
  const localStorage = { getItem: (k) => (k === "fd.theme" ? stored : null) };
  const matchMedia = (q) => ({ matches: q.includes("light") ? prefersLight : !prefersLight });
  new Function("document", "localStorage", "matchMedia", boot)(document, localStorage, matchMedia);
  return document.documentElement.dataset.theme;
}

describe("first-paint theme", () => {
  it("has an inline boot script", () => expect(boot).toBeTruthy());
  it("uses a stored dark theme", () => expect(themeAfterBoot('"dark"')).toBe("dark"));
  it("uses a stored light theme", () => expect(themeAfterBoot('"light"')).toBe("light"));
  it("defaults to light with nothing stored", () => expect(themeAfterBoot(null)).toBe("light"));
  it("follows the system for 'system'", () => {
    expect(themeAfterBoot('"system"', false)).toBe("dark");
    expect(themeAfterBoot('"system"', true)).toBe("light");
  });
  it("survives broken storage", () => expect(themeAfterBoot("{not json")).toBe("light"));
});
