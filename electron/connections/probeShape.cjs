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

/** The shape of a JSON value: keys and types only, never values. Arrays show their first item's shape and a count. */
function shapeOf(value, depth = 0) {
  if (depth > 6) return "…";
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length ? [`${value.length} items`, shapeOf(value[0], depth + 1)] : [];
  if (typeof value === "object") return Object.fromEntries(Object.keys(value).slice(0, 60).map((k) => [k, shapeOf(value[k], depth + 1)]));
  return typeof value;
}

module.exports = { safePath, shapeOf };
