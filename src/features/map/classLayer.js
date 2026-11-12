import { localDayKey } from "../../lib/dates.js";
import { findBuilding } from "./campusMap.js";
import { findRoom } from "./indoor/indoorData.js";

/**
 * Class meetings (from myBama, src/features/connections) on the map. A meeting is
 * { course, title, date: "2026-11-02", start: "09:00", end: "09:50", building, room }.
 */

/**
 * Where "Walk me there" goes for a meeting (#68): { building, room, label } when we have the inside of its building
 * and find the room, else { reason } in plain words. The meeting's own room (myBama) comes first.
 */
export function walkTo(m, indoor) {
  const found = findRoom([m.building, m.room].filter(Boolean).join(" "), indoor, m.room);
  if (!found.room) return { reason: found.reason };
  return { building: found.building.building, room: found.room.id, label: `Walk me to ${found.room.name || `Room ${found.room.id}`}` };
}

/** Today's meetings, or the rest of this week's from today on. Soonest first. */
export function classesInRange(meetings, range, now = new Date()) {
  const today = localDayKey(now);
  return (meetings || [])
    .filter((m) => (range === "today" ? m.date === today : m.date >= today))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/** Meetings grouped by the building they are in; meetings we cannot place are listed, not guessed. */
export function classPins(meetings, places) {
  const byPlace = new Map();
  const unplaced = [];
  for (const m of meetings) {
    const place = findBuilding([m.building, m.room].filter(Boolean).join(" "), places);
    if (!place) {
      unplaced.push(m);
      continue;
    }
    if (!byPlace.has(place.id)) byPlace.set(place.id, { key: `class-${place.id}`, place, xy: place.c, classes: [] });
    byPlace.get(place.id).classes.push(m);
  }
  return { pins: [...byPlace.values()], unplaced };
}

const clock = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** "9:00 to 9:50 AM" style, with the weekday for this week: "Mon 9:00 AM to 9:50 AM". */
export function classWhen(m, range) {
  const day = range === "today" ? "" : `${new Date(`${m.date}T12:00`).toLocaleDateString("en-US", { weekday: "short" })} `;
  return `${day}${clock(m.start)}${m.end ? ` to ${clock(m.end)}` : ""}`;
}

/** "GBA 490 · Bidgood Hall 116" */
export const classWhere = (m) => [m.course, [m.building, m.room].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
