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

/** A stable number from an id, so anything "random" per building is the same every visit. */
export function seedOf(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const FLOOR = 3.5; // meters per level; the brick texture puts one row of windows per FLOOR (#122)
const DECK = 3; // meters per parking deck
const SMALL = new Set(["house", "detached", "semidetached_house", "bungalow", "shed", "garage", "garages", "hut", "kiosk", "cabin", "carport", "roof", "toilets", "service"]);

/**
 * A building's height in whole meters: OSM `height`, else `building:levels` (× 3 m for parking decks, × 3.5 m otherwise).
 * Untagged, it guesses from `area` (footprint in m²) and type: sheds 1 level, houses 2, parking decks 3 to 5 decks,
 * other buildings 1 to 5 levels by footprint, plus a level on about half of them (seeded by `id`) so the skyline varies.
 * No footprint means 3 levels. Bad values (not a number, zero, negative, over 200 m) are skipped.
 */
export function heightOf(tags = {}, area = 0, id = "") {
  const ok = (n) => (Number.isFinite(n) && n > 0 && n < 200 ? n : null);
  const raw = String(tags.height ?? "");
  const deck = tags.building === "parking" || tags.parking === "multi-storey";
  const tagged = ok(parseFloat(raw) * (/ft|'/.test(raw) ? 0.3048 : 1)) ?? ok(parseFloat(tags["building:levels"]) * (deck ? DECK : FLOOR));
  return Math.round(tagged ?? guessHeight(tags.building, area, id, deck));
}

function guessHeight(type, area, id, deck) {
  if (!(area > 0)) return 3 * FLOOR;
  if (deck) return (area < 3000 ? 3 : area < 8000 ? 4 : 5) * DECK;
  if (SMALL.has(type)) return (/house|detached|bungalow|cabin/.test(type) ? 2 : 1) * FLOOR;
  const levels = area < 150 ? 1 : area < 600 ? 2 : area < 2500 ? 3 : area < 6000 ? 4 : 5;
  return (levels + (area >= 150 ? seedOf(id) % 2 : 0)) * FLOOR;
}

/** Area in m² of SVG path outlines in meters (outer rings, shoelace). */
export function ringsArea(rings) {
  return rings.reduce((sum, r) => sum + Math.abs(r.reduce((s, [x, y], i) => s + x * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * y, 0)) / 2, 0);
}

const PATHS = new Set(["footway", "path", "pedestrian", "cycleway", "steps"]);

/** Which campus-nature.json layer an OSM feature belongs in, or null. Buildings never go in one (a parking deck is a building, not a lot). */
export function natureLayer(t = {}) {
  if (t.building) return null;
  if (t.amenity === "university") return "campus"; // the campus edge, for green campus ground (#149)
  if (t.natural === "tree") return "trees";
  if (t.natural === "tree_row") return "treeRows";
  if (t.waterway === "river") return "river";
  if (t.natural === "water" || t.waterway === "riverbank") return "water";
  if (t.landuse === "forest" || t.natural === "wood" || t.natural === "scrub") return "wood";
  if (t.landuse === "grass" || t.landuse === "meadow" || t.leisure === "park") return "grass"; // parks like the Quad are lawns (#121)
  if (t.amenity === "parking") return "parking";
  if (t.leisure === "pitch") return "pitch";
  if (t.leisure === "track") return "track";
  if (t.highway) return PATHS.has(t.highway) ? "paths" : "roads";
  return null;
}

const LOOK_TAGS = { colour: "building:colour", roof: "roof:colour", roofShape: "roof:shape", material: "building:material" };

/** A building's colors and roof from its OSM tags, lowercased, or null when OSM has none. */
export function buildingLook(t = {}) {
  const look = {};
  for (const [k, tag] of Object.entries(LOOK_TAGS)) if (t[tag]) look[k] = String(t[tag]).trim().toLowerCase();
  return Object.keys(look).length ? look : null;
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

/** True for places with nowhere to walk to: online, Zoom, TBA. */
export const isOnline = (where) => /\b(online|virtual|zoom|teams|tba|tbd)\b/i.test(String(where || ""));

/** "Bidgood Hall 116" → "116"; "Room 1093, Shelby Hall" → "1093"; "Lloyd 38A" → "38A". Null when online or no room. */
export function roomOf(where) {
  if (isOnline(where)) return null;
  const raw = String(where || "");
  const m = raw.match(/\b(?:room|rm)\.?\s*(\d+[a-z]?)\b/i) || raw.match(/\b(\d+[a-z]?)\b/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * The building (or named area, like the Quad) a class or event place names, or null. Tries each part of the place:
 * exact name or alias, then with "the" or "hall" left off, then fuzzy (every word must hit). Online places never match.
 */
export function findBuilding(where, places) {
  const raw = String(where || "");
  if (isOnline(raw)) return null;
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
