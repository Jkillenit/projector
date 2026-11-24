import { findBuilding } from "./campusMap.js";
import { locationOf } from "./locations.js";

/**
 * Campus resources at this place: their `locationId` points here (#209), or their `location` text names it.
 * Unchecked location text ("TODO verify") never matches.
 */
export function resourcesAt(place, resources, places) {
  if (!place) return [];
  const byText = (r) => r.location && !/todo/i.test(r.location) && findBuilding(r.location, places)?.id === place.id;
  return (resources || []).filter((r) => locationOf(r.locationId)?.placeId === place.id || byText(r));
}

/** "Mon 6:00 PM" for this week, "6:00 PM" for today. */
export function whenAt(iso, range) {
  const opts = range === "today" ? { hour: "numeric", minute: "2-digit" } : { weekday: "short", hour: "numeric", minute: "2-digit" };
  return new Date(iso).toLocaleString("en-US", opts);
}
