import { interestsOf } from "../clubs/sourceClubs.js";
import { dayKey } from "./calendarWeek.js";

/**
 * Campus events on the Calendar (#215). Pure. `match`: the student's interests the event fits.
 * `why`: the reason to show, like "Matches your interest in coding", or null.
 */
export function tagEvents(events, interests) {
  const mine = interests || [];
  return (events || []).map((e) => {
    const match = interestsOf(e.text || e.title || "").filter((i) => mine.includes(i));
    return { ...e, match, why: match.length ? `Matches your interest in ${match.join(" and ")}` : null };
  });
}

/** Events by local day ("2026-11-02"), soonest first within each day. */
export function eventsByDay(events) {
  const days = new Map();
  for (const e of [...(events || [])].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))) {
    const key = dayKey(new Date(e.start));
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(e);
  }
  return new Map([...days.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
