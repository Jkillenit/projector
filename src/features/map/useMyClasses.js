import { useEffect, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { meetingKey, readMeeting } from "../courses/courseMeeting.js";
import { syllabusWeek } from "./syllabusWeek.js";

const parse = (raw, fallback) => {
  try {
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

/** This week from where each course meets (syllabus or fixed by hand). Organizations like Bama Bound are left out. */
async function weekFromSyllabi() {
  const rows = (await window.studyHub?.db?.courses?.getAll?.()) || [];
  const orgs = new Set(parse(await courseStore.getSetting("bb.orgs"), []));
  const courses = rows.filter((c) => !orgs.has(c.bb_course_id));
  const saved = await Promise.all(courses.map((c) => courseStore.getSetting(meetingKey(c.uuid))));
  return syllabusWeek(courses, Object.fromEntries(courses.map((c, i) => [c.uuid, readMeeting(saved[i])])));
}

/**
 * This week's classes. myBama first when it is connected (demo: made-up); otherwise from the syllabus
 * meetings saved on each course (status "syllabus"). `notConnected` when neither knows anything.
 */
export function useMyClasses() {
  const [state, setState] = useState({ status: "loading", meetings: [], noMeetingTime: [] });
  useEffect(() => {
    let live = true;
    const load = async () => {
      let res = await Promise.resolve(window.studyHub?.connections?.mybamaWeek?.() ?? { ok: false, notConnected: true }).catch(() => ({ ok: false }));
      if (res.notConnected) {
        const week = await weekFromSyllabi().catch(() => null);
        if (week && (week.meetings.length || week.noMeetingTime.length)) res = week;
      }
      if (!live) return;
      setState({
        status: res.source === "syllabus" ? "syllabus" : res.ok ? "ready" : res.notConnected ? "notConnected" : res.signedOut ? "signedOut" : "error",
        meetings: res.meetings || [],
        noMeetingTime: res.noMeetingTime || [],
        unknown: res.unknown || [],
        stale: !!res.stale,
        signedOut: !!res.signedOut,
      });
    };
    void load();
    return () => {
      live = false;
    };
  }, []);
  return state;
}
