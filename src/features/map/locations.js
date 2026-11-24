import { isOnline } from "./campusMap.js";
import { routeHref } from "../../shell/useRoute.js";

/**
 * One place that says "this thing is at this pin" (#207). Resources and clubs carry an optional `locationId` from here.
 *
 * - `placeId`: a building or area id in campus.json (a test checks that every row resolves).
 * - `label`: what the screen shows. `room`: null until someone checks it.
 * - `verified`: false until a teammate checks the row against the office's own UA page. Screens say
 *   "Location not checked yet" for unverified rows. Never add a building you are not sure of: no pin beats a wrong pin.
 */
export const LOCATIONS = {
  "gorgas-library": { placeId: "w130596789", label: "Gorgas Library", room: null, verified: false },
  "student-center": { placeId: "w200167122", label: "Student Center (the Ferg)", room: null, verified: false },
  "student-services-center": { placeId: "w200167121", label: "Student Services Center", room: null, verified: false },
  "rec-center": { placeId: "w100746389", label: "Student Recreation Center", room: null, verified: false },
  "lloyd-hall": { placeId: "w233695042", label: "Lloyd Hall", room: null, verified: false },
  "houser-hall": { placeId: "w643481722", label: "Houser Hall", room: null, verified: false },
};

/** The registry row for an id, or null. */
export function locationOf(id) {
  return (id && Object.hasOwn(LOCATIONS, id) && LOCATIONS[id]) || null;
}

/**
 * Where "Show on map" goes. A registry id opens its pin (`#/map?place=…`). Other place text opens a map search
 * (`#/map?q=…`), which picks the building if it can. Null when there is nowhere to walk to: empty, online or unchecked.
 */
export function mapHref(where) {
  const loc = locationOf(where);
  if (loc) return routeHref("map", [], { place: loc.placeId });
  const text = String(where ?? "").trim();
  if (!text || isOnline(text) || /todo/i.test(text)) return null;
  return routeHref("map", [], { q: text });
}

/**
 * What a "Show on map" link needs (#209): `{ href, note }`, or null when there is no place at all.
 * - A registry id wins over place text. An unchecked row still links, with "Location not checked yet".
 * - Online places get no link and the note "Online".
 */
export function mapLink({ locationId, where, online } = {}) {
  const loc = locationOf(locationId);
  if (loc) return { href: mapHref(locationId), note: loc.verified ? null : "Location not checked yet" };
  if (online || isOnline(where)) return { href: null, note: "Online" };
  const href = mapHref(where);
  return href ? { href, note: null } : null;
}
