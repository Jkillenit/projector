import { describe, expect, it } from "vitest";
import { fromCalendarEvents, fromSourceEvents, groupByDay, mergeEvents } from "./campusEvents.js";

const NOW = new Date("2026-11-04T18:00:00Z");

// Trimmed copies of real rows (Nov 4, 2026).
const sourceRow = {
  id: "12953914",
  organizationName: "AlabamaHockeyACHA",
  name: "Pie A Player",
  location: "Quad ",
  startsOn: "2026-11-04T20:00:00+00:00",
  endsOn: "2026-11-04T22:00:00+00:00",
  theme: "Athletics",
  categoryNames: ["Fundraising, Philanthropy, Service"],
  visibility: "Public",
  status: "Approved",
};
const calendarRow = {
  id: 53196252378716,
  title: "WellBAMA Health Screening",
  status: "live",
  private: false,
  experience: "inperson",
  location: "",
  location_name: "Bruno Business Library",
  room_number: "1st Floor Lobby",
  localist_url: "https://calendar.ua.edu/event/wellbama-health-screening-4322",
  departments: [{ name: "Wellness and Work-Life" }],
  filters: { event_target_audience: [{ name: "Students" }, { name: "Faculty & Staff" }], event_topic: [{ name: "Health & Wellness" }] },
  geo: { latitude: "33.211057", longitude: "-87.54923" },
  event_instances: [{ event_instance: { start: "2026-11-05T07:30:00-06:00", end: "2026-11-05T13:00:00-06:00" } }],
};

describe("campus events", () => {
  it("reads The SOURCE events and links to the event page", () => {
    const [e] = fromSourceEvents([sourceRow, { ...sourceRow, id: "2", status: "Pending" }, { ...sourceRow, id: "3", visibility: "Private" }]);
    expect(e).toMatchObject({ id: "source-ev-12953914", title: "Pie A Player", where: "Quad", online: false, host: "AlabamaHockeyACHA", url: "https://ua.campuslabs.com/engage/event/12953914" });
    expect(fromSourceEvents([{ ...sourceRow, location: "Zoom link in description" }])[0].online).toBe(true);
    expect(fromSourceEvents(null)).toEqual([]);
  });

  it("reads UA's calendar, joins building and room, and marks virtual events online", () => {
    const [e] = fromCalendarEvents([calendarRow], NOW);
    expect(e).toMatchObject({ title: "WellBAMA Health Screening", where: "Bruno Business Library, 1st Floor Lobby", online: false, host: "Wellness and Work-Life", source: "calendar", geo: { lat: 33.211057, lon: -87.54923 } });
    expect(fromCalendarEvents([{ ...calendarRow, experience: "virtual" }], NOW)[0]).toMatchObject({ where: "Online", online: true, geo: null });
  });

  it("leaves out staff-only, private, unpublished and finished calendar events", () => {
    const staff = { ...calendarRow, filters: { event_target_audience: [{ name: "Faculty & Staff" }] } };
    const past = { ...calendarRow, event_instances: [{ event_instance: { start: "2026-11-01T10:00:00Z", end: "2026-11-01T11:00:00Z" } }] };
    expect(fromCalendarEvents([staff, { ...calendarRow, private: true }, { ...calendarRow, status: "pending" }, past], NOW)).toEqual([]);
  });

  it("picks the next instance of a repeating event that has not ended", () => {
    const repeating = {
      ...calendarRow,
      event_instances: [
        { event_instance: { start: "2026-11-03T10:00:00Z", end: "2026-11-03T11:00:00Z" } },
        { event_instance: { start: "2026-11-06T10:00:00Z", end: "2026-11-06T11:00:00Z" } },
      ],
    };
    expect(fromCalendarEvents([repeating], NOW)[0].start).toBe("2026-11-06T10:00:00Z");
  });

  it("merges both lists soonest first, drops repeats and anything outside the window", () => {
    const ev = (id, title, start, end = start) => ({ id, title, start, end });
    const calendar = [ev("c1", "Open Mic Night", "2026-11-06T23:00:00Z"), ev("c2", "Far Away", "2026-12-30T10:00:00Z")];
    const source = [ev("s1", "open mic night!", "2026-11-06T23:30:00Z"), ev("s2", "Happening Now", "2026-11-04T17:00:00Z", "2026-11-04T19:00:00Z"), ev("s3", "Over", "2026-11-04T10:00:00Z")];
    expect(mergeEvents([calendar, source], { now: NOW }).map((e) => e.id)).toEqual(["s2", "c1"]);
  });

  it("groups events by local day: Today, Tomorrow, then the date", () => {
    const now = new Date(2026, 10, 4, 15, 0);
    const at = (day, hour) => ({ id: `${day}-${hour}`, start: new Date(2026, 10, day, hour).toISOString() });
    const groups = groupByDay([at(3, 9), at(4, 18), at(5, 10), at(5, 19), at(6, 12)], now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Tomorrow", "Fri, Nov 6"]);
    expect(groups[0].events).toHaveLength(2); // still-running event from yesterday counts as today
    expect(groups[1].events.map((e) => e.id)).toEqual(["5-10", "5-19"]);
  });
});
