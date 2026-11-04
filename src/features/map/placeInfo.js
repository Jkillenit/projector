import { findBuilding } from "./campusMap.js";

/** Campus resources whose `location` names this place. Unchecked locations ("TODO verify") never match. */
export function resourcesAt(place, resources, places) {
  if (!place) return [];
  return (resources || []).filter((r) => r.location && !/todo/i.test(r.location) && findBuilding(r.location, places)?.id === place.id);
}

/** "Mon 6:00 PM" for this week, "6:00 PM" for today. */
export function whenAt(iso, range) {
  const opts = range === "today" ? { hour: "numeric", minute: "2-digit" } : { weekday: "short", hour: "numeric", minute: "2-digit" };
  return new Date(iso).toLocaleString("en-US", opts);
}
