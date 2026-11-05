import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const { WEEK_DATA, mondayOf, weekUrl, hhmm, ymd, fromWeekAtAGlance } = createRequire(import.meta.url)("./mybamaWeek.cjs");

// Made-up answer in the shape the probe found (2026-11-04). No real student data.
const answer = {
  success: true,
  courseInformationHeader: { name: "Pat Example", bannerId: "A00000000", term: "Fall 2026" },
  studentProfileName: "Pat Example",
  appData: { student_preferred_name: "Pat" },
  classList: [
    { classSubCode: "MIS", classCourseNumber: "430", classCourseDisplay: "MIS 430", classCrn: "11111", classSeqNumber: "001", classType: "Class", startEndYear: 2026, startEndMonth: 10, startEndDay: 4, classStartTime: "1400", classEndTime: "1515", classBuilding: "Alston Hall", classRoomCode: "20" },
    { classSubCode: "MIS", classCourseNumber: "430", classCourseDisplay: "MIS 430", classCrn: "11111", classSeqNumber: "001", classType: "Class", startEndYear: 2026, startEndMonth: 10, startEndDay: 2, classStartTime: "1400", classEndTime: "1515", classBuilding: "Alston Hall", classRoomCode: "20" },
    { classSubCode: "GBA", classCourseNumber: "490", classCourseDisplay: "GBA 490", classCrn: "22222", classSeqNumber: "002", classType: "Class", startEndYear: 2026, startEndMonth: 10, startEndDay: 2, classStartTime: "0900", classEndTime: "0950", classBuilding: "Bidgood Hall", classRoomCode: "116" },
    { classSubCode: "", classCourseNumber: "", startEndYear: 2026, startEndMonth: 10, startEndDay: 3, classStartTime: "0800" },
  ],
  coursesWithOutMeetingTimes: [{ woatSubCode: "MKT", woatCourseNumber: "300", woatCourseDisplay: "MKT 300", woatCrn: "33333", woaText: "WEB" }],
  weekInfo: { weekStartDate: "11/02/2026", workStartDay: 1 },
};

describe("myBama Week at a Glance", () => {
  it("asks for the Monday of this week as MM/DD/YYYY", () => {
    const wed = new Date(2026, 10, 4, 15);
    expect(mondayOf(wed).getDate()).toBe(2);
    expect(mondayOf(new Date(2026, 10, 8)).getDate()).toBe(2); // Sunday belongs to the week before
    expect(weekUrl(wed)).toBe(`${WEEK_DATA}?start_date_in=11%2F02%2F2026`);
  });

  it("reads Banner's 0-based months and 24-hour times", () => {
    expect(ymd(2026, 10, 2)).toBe("2026-11-02");
    expect(ymd(2026, 12, 1)).toBeNull();
    expect(hhmm("0900")).toBe("09:00");
    expect(hhmm("1515")).toBe("15:15");
    expect(hhmm("9:00")).toBeNull();
    expect(hhmm("2500")).toBeNull();
  });

  it("keeps class meetings in order and courses with no meeting time, and drops the student's name and id", () => {
    const week = fromWeekAtAGlance(answer, "2026-11-02");
    expect(week.meetings.map((m) => `${m.date} ${m.start} ${m.course}`)).toEqual(["2026-11-02 09:00 GBA 490", "2026-11-02 14:00 MIS 430", "2026-11-04 14:00 MIS 430"]);
    expect(week.meetings[0]).toMatchObject({ building: "Bidgood Hall", room: "116", end: "09:50", crn: "22222" });
    expect(week.noMeetingTime).toEqual([{ course: "MKT 300", title: "MKT 300", crn: "33333", note: "WEB" }]);
    expect(JSON.stringify(week)).not.toMatch(/Pat|A00000000/);
  });

  it("returns null for anything that is not a schedule (like a sign-in page)", () => {
    expect(fromWeekAtAGlance(null)).toBeNull();
    expect(fromWeekAtAGlance({ success: false, classList: [] })).toBeNull();
    expect(fromWeekAtAGlance({ hello: "world" })).toBeNull();
  });
});
