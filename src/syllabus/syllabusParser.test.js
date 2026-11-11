import { describe, expect, it } from "vitest";
import { extractMeeting, parseSyllabus } from "./syllabusParser.js";

describe("extractMeeting", () => {
  it("reads an in-person class: days, times, building and room", () => {
    const text = `GBA 490 Strategic Management
Class meets: MWF 9:00-9:50 AM
Location: Bidgood Hall 116
Instructor: Dr. Smith`;
    expect(extractMeeting(text)).toEqual({
      mode: "in_person",
      days: "MWF",
      start: "09:00",
      end: "09:50",
      building: "Bidgood Hall",
      room: "116",
    });
  });

  it("reads a short building code and p.m. times with an en dash", () => {
    const text = `Lecture: TTh 2:00 p.m. – 3:15 p.m., ALSTON 203`;
    expect(extractMeeting(text)).toEqual({
      mode: "in_person",
      days: "TR",
      start: "14:00",
      end: "15:15",
      building: "ALSTON",
      room: "203",
    });
  });

  it("reads spelled-out days", () => {
    const text = `Meeting time: Monday/Wednesday 11:00 AM - 12:15 PM in Lloyd Hall 38`;
    expect(extractMeeting(text)).toMatchObject({ days: "MW", start: "11:00", end: "12:15", building: "Lloyd Hall", room: "38" });
  });

  it("reads an online class at set times", () => {
    const text = `Class meets online via Zoom, M W 10:00-11:15 AM`;
    expect(extractMeeting(text)).toEqual({ mode: "online_sync", days: "MW", start: "10:00", end: "11:15", building: "", room: "" });
  });

  it("reads a self-paced online class", () => {
    const text = `Course format: This course is asynchronous. There are no scheduled meetings.`;
    expect(extractMeeting(text)).toEqual({ mode: "online_async", days: "", start: null, end: null, building: "", room: "" });
  });

  it("reads a hybrid class with a room and online", () => {
    const text = `Class meets: TR 12:30-1:45 PM, Bidgood Hall 220 and online via Zoom`;
    expect(extractMeeting(text)).toMatchObject({ mode: "hybrid", days: "TR", start: "12:30", end: "13:45", building: "Bidgood Hall", room: "220" });
  });

  it("does not call a class online when Zoom is only for office hours", () => {
    const text = `Office hours: Zoom, by appointment
Assignments use online submission in Blackboard.
Classroom: Gorgas Library 205
Class meets: MWF 1:00-1:50 PM`;
    expect(extractMeeting(text)).toMatchObject({ mode: "in_person", days: "MWF", start: "13:00", end: "13:50", building: "Gorgas Library", room: "205" });
  });

  it("says unknown when nothing is found", () => {
    expect(extractMeeting("Grading: Exams 50%, Homework 50%")).toEqual({
      mode: "unknown",
      days: "",
      start: null,
      end: null,
      building: "",
      room: "",
    });
  });

  it("is returned by parseSyllabus as meeting", () => {
    expect(parseSyllabus("Location: Bidgood Hall 116\nClass meets: MWF 9:00-9:50 AM").meeting.mode).toBe("in_person");
  });
});
