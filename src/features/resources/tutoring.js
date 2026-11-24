import seed from "../../demo/tutoring.json";
import { findBuilding, isOnline, roomOf } from "../map/campusMap.js";
import { PLACES } from "../map/places.js";
import { routeHref } from "../../shell/useRoute.js";

/**
 * Course-specific tutoring (#208). A session is shaped like what the Tutoring booking connection
 * (electron/connections/services.json, not built yet) will read: { id, course, title, where, days, start, end, signUp }.
 * Demo mode uses the made-up seed in src/demo/tutoring.json. Live mode has none until the connection is built.
 * The place comes from the session's own `where` text, matched to a UA building. Never typed in by hand.
 */
const isLive = typeof window !== "undefined" && window.studyHub?.mode === "live";
const SESSIONS = isLive ? [] : seed;

/** "math126", "Math-126", "MATH 126" → "MATH 126". Null when it is not a subject plus a number. */
export function courseKey(code) {
  const m = String(code ?? "").trim().match(/^([a-z]{2,4})[\s-]*(\d{3}[a-z]?)$/i);
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
}

/**
 * Adds where each session is on the map: `place` (a building or null), `room`, `mapHref`, and `locationNote`.
 * A place we cannot match gets "Location not checked yet" and no pin. A wrong pin is worse than none.
 */
export function placeTutoring(sessions, places) {
  return (sessions || []).map((s) => {
    if (isOnline(s.where)) return { ...s, place: null, room: null, mapHref: null, locationNote: "Online" };
    const place = findBuilding(s.where, places);
    return {
      ...s,
      place: place || null,
      room: place ? roomOf(s.where) : null,
      mapHref: place ? routeHref("map", [], { place: place.id }) : null,
      locationNote: place ? null : "Location not checked yet",
    };
  });
}

/** Every course that has tutoring, once each: the guide's list when a class number fits none of the student's (#211). */
export function tutoringCourses({ sessions = SESSIONS } = {}) {
  return [...new Set(sessions.map((s) => courseKey(s.course)).filter(Boolean))];
}

/** Tutoring for one course, placed on the map. Empty when the course has none. */
export function tutoringFor(courseCode, { sessions = SESSIONS, places = PLACES } = {}) {
  const key = courseKey(courseCode);
  if (!key) return [];
  return placeTutoring(
    sessions.filter((s) => courseKey(s.course) === key),
    places,
  );
}
