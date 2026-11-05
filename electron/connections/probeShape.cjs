/**
 * Probe helpers: describe a service's data without keeping any of it (rule 3).
 * Used only when PROJECTOR_PROBE=1, to learn where myBama keeps the class schedule.
 */

/** "https://x.ua.edu/api/student/12345678/schedule?term=202640" → "x.ua.edu/api/student/:n/schedule". No query, no long numbers or ids. */
function safePath(url) {
  try {
    const u = new URL(String(url || ""));
    const path = u.pathname
      .split("/")
      .map((part) => (/^\d{3,}$/.test(part) || /^[0-9a-f-]{16,}$/i.test(part) || /@/.test(part) ? ":n" : part))
      .join("/");
    return `${u.hostname}${path}`;
  } catch {
    return "";
  }
}

// Class schedule fields whose *format* we need ("9:99 AA" or "9999"). Only these get a masked pattern; never names or ids.
const PATTERN_KEYS = /^(class(Start|End)Time|classStartDate|classBuilding|classRoomCode|classType|dayIndex|week(Start|End)Date|dateToday|woaText)$/;
// Calendar numbers for this week's dates (not personal), kept as-is so we can tell whether months start at 0 or 1.
const NUMBER_KEYS = /^(startEnd(Year|Month|Day)|workStartDay)$/;

/** "9:00 AM" → "9:99 AA", "BIDG" → "AAAA", "Bidgood Hall" → "Aaaaaaa Aaaa". Letters and digits masked, at most 24 characters. */
const mask = (s) => String(s).slice(0, 24).replace(/[A-Z]/g, "A").replace(/[a-z]/g, "a").replace(/\d/g, "9");

/**
 * The shape of a JSON value: keys and types, never values. Arrays show their first item's shape and a count.
 * The only exceptions are the schedule format keys above (masked pattern) and this week's date numbers.
 */
function shapeOf(value, depth = 0, key = "") {
  if (depth > 6) return "…";
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length ? [`${value.length} items`, shapeOf(value[0], depth + 1, key)] : [];
  if (typeof value === "object") return Object.fromEntries(Object.keys(value).slice(0, 60).map((k) => [k, shapeOf(value[k], depth + 1, k)]));
  if (typeof value === "string" && PATTERN_KEYS.test(key)) return `string like "${mask(value)}"`;
  if (typeof value === "number" && NUMBER_KEYS.test(key)) return `number ${value}`;
  return typeof value;
}

/** Query parameter names only, never their values. */
function queryKeys(url) {
  try {
    return [...new URL(String(url || "")).searchParams.keys()];
  } catch {
    return [];
  }
}

module.exports = { safePath, shapeOf, queryKeys, mask };
