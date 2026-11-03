import { useCallback, useEffect, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { friendlyCourse } from "../dashboard/courseLabel.js";
import { computeCourseGrade } from "../grades/courseGrade.js";
import { gradeTrend } from "../grades/gradesView.js";
import { groupAssignments } from "../mirror/assignmentState.js";
import { groupDue } from "./dueSoon.js";

const RELOAD_EVENTS = ["studyhub-mirror-changed", "studyhub-bb-synced", "studyhub-target-changed"];
const json = async (key, fallback) => {
  try {
    return JSON.parse(await courseStore.getSetting(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

/**
 * Everything Home shows about the student's classes, read once: one card per course (grade, trend, next due,
 * missing), the due-soon groups, and the facts the "Picked for you" rules use. `skip` is a set of course ids
 * to leave out (organizations). Grades stay in this window.
 */
export function useHomeData(skip = []) {
  const [state, setState] = useState({ loaded: false, cards: [], due: null, facts: [], syncedAt: null });
  const skipKey = [...skip].sort().join(",");

  const load = useCallback(async () => {
    const today = await courseStore.loadTodayData();
    const hidden = new Set(skipKey ? skipKey.split(",") : []);
    const courses = (today.courses || []).filter((c) => !hidden.has(c.bbCourseId));
    const per = await Promise.all(
      courses.map(async (c) => {
        const [graded, scale, overall, drops, rows] = await Promise.all([
          courseStore.getBbGradeItems(c.uuid),
          courseStore.getGradingScale(c.uuid),
          json(`bb.overall.${c.uuid}`, null),
          json(`grades.drops.${c.uuid}`, {}),
          courseStore.getAssignments(c.uuid),
        ]);
        const g = computeCourseGrade({ snapshot: c, graded: graded || [], overall, scale, drops, target: c.targetGrade, now: today.now });
        const mine = (rows || []).map((r) => ({ ...r, course_uuid: c.uuid }));
        const groups = groupAssignments(mine);
        const f = friendlyCourse(c);
        return {
          card: { id: c.uuid, code: f.code || f.label, title: f.title, hint: f.raw, current: g.current, letter: g.letter, basis: g.basis, trend: gradeTrend(c.components, graded), next: groups.todo[0] || null, missing: groups.missing.length },
          rows: mine,
          fact: { id: c.uuid, code: f.code || f.label, current: g.current, target: g.target, items: (c.assignments || []).filter((a) => a.score == null) },
        };
      })
    );
    setState({ loaded: true, cards: per.map((p) => p.card), due: groupDue(per.flatMap((p) => p.rows)), facts: per.map((p) => p.fact), syncedAt: today.syncedAt });
  }, [skipKey]);

  useEffect(() => {
    void load();
    RELOAD_EVENTS.forEach((n) => window.addEventListener(n, load));
    return () => RELOAD_EVENTS.forEach((n) => window.removeEventListener(n, load));
  }, [load]);

  return state;
}
