/**
 * Hidden features and old layouts we keep for a while instead of deleting (#210, #213). All are off by default.
 * To turn one on for a demo: add ?flags=name before the # in the address (?flags=-name turns it off),
 * or save "name,name" under the browser storage key "al.flags".
 *
 * - classesFirstHome: Home's old order, with classes and homework first (#210).
 */
export const DEFAULTS = Object.freeze({ classesFirstHome: false });

const STORE_KEY = "al.flags";

/** "a,-b" → { a: true, b: false }. Names not in DEFAULTS are ignored. */
export function parseFlags(text) {
  const out = {};
  for (const raw of String(text ?? "").split(",")) {
    const word = raw.trim();
    const name = word.replace(/^-/, "");
    if (name && Object.hasOwn(DEFAULTS, name)) out[name] = !word.startsWith("-");
  }
  return out;
}

/** The flags in effect: defaults, then saved flags, then the address. */
export function flagsFrom({ search = "", stored = "" } = {}) {
  return { ...DEFAULTS, ...parseFlags(stored), ...parseFlags(new URLSearchParams(search).get("flags")) };
}

/** True when the named feature is on in this browser. Storage can be blocked, so it falls back to the defaults. */
export function flagOn(name) {
  let stored = "";
  try {
    stored = window.localStorage.getItem(STORE_KEY) || "";
  } catch {
    // private window or blocked storage
  }
  const search = typeof window !== "undefined" ? window.location.search : "";
  return !!flagsFrom({ search, stored })[name];
}
