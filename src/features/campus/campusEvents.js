/** Rows from The SOURCE events and UA's calendar (electron/publicFeeds.cjs) → one list of upcoming events. */

export const SOURCE_EVENT_URL = "https://ua.campuslabs.com/engage/event/";
export const CALENDAR_URL = "https://calendar.ua.edu";
export const EVENT_DAYS = 14;
const ONLINE = /\b(online|virtual|zoom|teams|webinar)\b/i;

/** The SOURCE: approved, public student org events. */
export function fromSourceEvents(rows) {
  return (rows || [])
    .filter((r) => r && r.id && r.name && r.startsOn && r.status === "Approved" && r.visibility === "Public")
    .map((r) => {
      const where = String(r.location || "").trim();
      return {
        id: `source-ev-${r.id}`,
        title: String(r.name).trim(),
        start: r.startsOn,
        end: r.endsOn || r.startsOn,
        where,
        online: ONLINE.test(where),
        host: String(r.organizationName || "").trim(),
        url: SOURCE_EVENT_URL + encodeURIComponent(r.id),
        source: "the-source",
        text: [r.name, r.organizationName, r.theme, ...(r.categoryNames || [])].join(" "),
      };
    });
}

const staffOnly = (audiences) => audiences.length > 0 && audiences.every((a) => /faculty|staff/i.test(a) && !/student/i.test(a));

/** UA's calendar (Localist): live, public events open to students. Uses each event's next instance that has not ended. */
export function fromCalendarEvents(rows, now = new Date()) {
  return (rows || []).flatMap((r) => {
    if (!r || !r.id || !r.title || r.status !== "live" || r.private) return [];
    const audiences = (r.filters?.event_target_audience || []).map((a) => a.name);
    if (staffOnly(audiences)) return [];
    const next = (r.event_instances || []).map((i) => i.event_instance).find((i) => i?.start && Date.parse(i.end || i.start) >= now.getTime());
    if (!next) return [];
    const online = r.experience === "virtual" || ONLINE.test(r.location_name || r.location || ""); // some list "in person" but say Online
    const place = [r.location_name, r.room_number].map((s) => String(s || "").trim()).filter(Boolean).join(", ");
    const topics = (r.filters?.event_topic || []).map((t) => t.name);
    return [{
      id: `calendar-ev-${r.id}`,
      title: String(r.title).trim(),
      start: next.start,
      end: next.end || next.start,
      where: online ? "Online" : place || String(r.location || "").trim(),
      online,
      host: r.departments?.[0]?.name || "",
      url: /^https:\/\//i.test(r.localist_url || "") ? r.localist_url : null,
      source: "calendar",
      // UA's calendar gives the venue's coordinates, which pin more exactly than matching the building name.
      geo: !online && r.geo?.latitude && r.geo?.longitude ? { lat: Number(r.geo.latitude), lon: Number(r.geo.longitude) } : null,
      text: [r.title, ...topics, ...(r.tags || []), ...(r.keywords || [])].join(" "),
    }];
  });
}

const dayOf = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const keyOf = (e) => `${e.title.toLowerCase().replace(/[^a-z0-9]/g, "")}|${dayOf(e.start)}`;

/**
 * Events that have not ended and start within `days`, soonest first. The same title on the same day counts once;
 * the earlier list wins, so pass the list with more detail first.
 */
export function mergeEvents(lists, { now = new Date(), days = EVENT_DAYS } = {}) {
  const until = now.getTime() + days * 86400000;
  const seen = new Set();
  return lists
    .flat()
    .filter((e) => Date.parse(e.end) >= now.getTime() && Date.parse(e.start) <= until)
    .filter((e) => !seen.has(keyOf(e)) && seen.add(keyOf(e)))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** Events (already sorted) in day groups labeled "Today", "Tomorrow", then "Fri, Nov 6". */
export function groupByDay(events, now = new Date()) {
  const label = (iso) => {
    const d = new Date(iso);
    const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    if (days <= 0) return "Today"; // events that started earlier and are still on count as today
    if (days === 1) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };
  const groups = [];
  for (const e of events) {
    const name = label(e.start);
    if (groups.at(-1)?.label !== name) groups.push({ label: name, events: [] });
    groups.at(-1).events.push(e);
  }
  return groups;
}

/** Just the time, "6:00 PM". */
export const eventTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

