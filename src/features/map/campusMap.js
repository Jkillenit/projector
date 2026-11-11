import { fuzzyScore } from "../../lib/fuzzy.js";

/**
 * Campus map math, shared by the app and scripts/build-campus-map.mjs.
 * Map units are meters from ORIGIN: x grows east, y grows south (SVG direction).
 */
export const ORIGIN = { lat: 33.211, lon: -87.542 };
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

/** [x, y] in meters, rounded to 0.1 m. Good to well under a meter across campus. */
export function project(lat, lon) {
  const x = (Number(lon) - ORIGIN.lon) * M_PER_DEG_LON;
  const y = (ORIGIN.lat - Number(lat)) * M_PER_DEG_LAT;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

/** The reverse of project: [x, y] meters → { lat, lon }, to 6 decimals (about 10 cm). */
export function unproject([x, y]) {
  const r = (n) => Math.round(n * 1e6) / 1e6;
  return { lat: r(ORIGIN.lat - y / M_PER_DEG_LAT), lon: r(ORIGIN.lon + x / M_PER_DEG_LON) };
}

/** Links that open the student's own map app at a place. Only the destination goes in the link, nothing about the student. */
export function directionLinks({ lat, lon }, name = "") {
  const ll = `${lat},${lon}`;
  return [
    { id: "waze", label: "Waze", url: `https://waze.com/ul?ll=${ll}&navigate=yes` },
    { id: "google", label: "Google Maps", url: `https://www.google.com/maps/dir/?api=1&destination=${ll}` },
    { id: "apple", label: "Apple Maps", url: `https://maps.apple.com/?daddr=${ll}${name ? `&q=${encodeURIComponent(name)}` : ""}` },
  ];
}

/** Douglas-Peucker: drops points closer than `tolerance` meters to the line, so outlines stay small. */
export function simplify(points, tolerance = 1) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  if (ax === bx && ay === by) {
    // A closed outline: split at the point farthest from the start, or the start-to-end line has no length.
    let at = 1;
    for (let i = 1; i < points.length - 1; i++) if (Math.hypot(points[i][0] - ax, points[i][1] - ay) > Math.hypot(points[at][0] - ax, points[at][1] - ay)) at = i;
    return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
  }
  const len = Math.hypot(bx - ax, by - ay) || 1;
  let far = 0;
  let at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
    if (d > far) [far, at] = [d, i];
  }
  if (far <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
}

/** SVG path data for one outline (closed) or line (open), whole meters. */
export function toPath(points, closed) {
  const r = (n) => Math.round(n);
  return points.map(([x, y], i) => `${i ? "L" : "M"}${r(x)} ${r(y)}`).join("") + (closed ? "Z" : "");
}

/**
 * A building's height in whole meters from its OSM tags: `height`, else `building:levels` × 3.5 m, else 3 levels.
 * Bad values (not a number, zero, negative, over 200 m) are skipped.
 */
export function heightOf(tags = {}) {
  const ok = (n) => (Number.isFinite(n) && n > 0 && n < 200 ? n : null);
  const raw = String(tags.height ?? "");
  const h = ok(parseFloat(raw) * (/ft|'/.test(raw) ? 0.3048 : 1)) ?? ok(parseFloat(tags["building:levels"]) * 3.5) ?? 10.5;
  return Math.round(h);
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
// Words that say which room or floor, not which building: "Bidgood Hall 116", "Room 1093", "1st Floor Lobby".
// "Outside of BB Comer", "Near the Quad": the building comes after these.
const LEAD_IN = /^(outside( of)?|in front of|near|behind|across from|at) /;
const NOT_BUILDING = /\b(room|rm|suite|ste|floor|fl|lobby|auditorium|ballroom|basement|level)\b.*$|\b\d+[a-z]?\b|\b\d+(st|nd|rd|th)\b/g;

/** "Bidgood Hall 116" → ["bidgood hall"]; "Room 1093, Shelby Hall" → ["shelby hall"]. Each part of the place, room numbers removed. */
export function placeParts(where) {
  return String(where || "")
    .split(/[,;()]| - /)
    .map((p) => norm(p).replace(NOT_BUILDING, " ").replace(/\s+/g, " ").trim().replace(LEAD_IN, ""))
    .filter((p) => p.length > 1);
}

/**
 * The building (or named area, like the Quad) a class or event place names, or null. Tries each part of the place:
 * exact name or alias, then with "the" or "hall" left off, then fuzzy (every word must hit). Online places never match.
 */
export function findBuilding(where, places) {
  const raw = String(where || "");
  if (/\b(online|virtual|zoom|teams|tba|tbd)\b/i.test(raw)) return null;
  const parts = placeParts(raw);
  const names = (b) => [b.name, ...(b.alt || [])].map(norm);
  const bare = (s) => s.replace(/^the /, "").replace(/ (hall|building|center|bldg)$/, "");
  const exactly = (q) => places.find((b) => names(b).includes(q)) || places.find((b) => names(b).some((n) => bare(n) === bare(q)));
  for (const q of parts) {
    // "uasc lawn" → "uasc": the words after the building often name a spot at it.
    const words = q.split(" ");
    for (let n = words.length; n > 0; n--) {
      const hit = exactly(words.slice(0, n).join(" "));
      if (hit) return hit;
      if (words.slice(0, n - 1).join(" ").length < 3) break;
    }
  }
  let best = null;
  let bestScore = 0;
  for (const q of parts) {
    for (const b of places) {
      const score = Math.max(...names(b).map((n) => fuzzyScore(q, n)));
      // On a tie the shorter name wins: it is the plainer match ("Lloyd Hall" over "Lloyd Hall Annex").
      if (score > bestScore || (score === bestScore && score > 0 && b.name.length < best.name.length)) [best, bestScore] = [b, score];
    }
  }
  return bestScore >= 2 ? best : null;
}
