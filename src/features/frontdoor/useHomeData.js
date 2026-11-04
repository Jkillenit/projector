import { useCallback, useEffect, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { getCourseLabel } from "../dashboard/courseLabel.js";
import { isShell } from "../dashboard/courseColor.js";
import { categoryStanding, computeCourseGrade } from "../grades/courseGrade.js";
import { letterFor } from "../grades/gradeMath.js";
import { isDone } from "../mirror/assignmentState.js";
import { ITEM_TYPES, rankToday } from "../today/priority.js";
import { countDueThisWeek } from "../../shell/useUpcoming.js";
import { weekCells } from "./homeView.js";

const RELOAD_EVENTS = ["studyhub-mirror-changed", "studyhub-bb-synced", "studyhub-target-changed"];
const json = async (key, fallback) => {
  try {
    return JSON.parse(await courseStore.getSetting(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

/**
 * Everything Home shows, read once: ranked tasks, this week's due dates, each course's standing and
 * the facts the help picks use. `skip` holds Blackboard ids to leave out (organizations). Grades stay
 * in this window; nothing here is sent anywhere.
 */
export function useHomeData(skip = []) {
  const [state, setState] = useState({ loaded: false });
  const skipKey = [...skip].sort().join(",");

  const load = useCallback(async () => {
    const today = await courseStore.loadTodayData();
    const hidden = new Set(skipKey ? skipKey.split(",") : []);
    const courses = (today.courses || []).filter((c) => !hidden.has(c.bbCourseId) && !isShell(c.name));
    const now = today.now ? new Date(today.now) : new Date();
    const per = await Promise.all(
      courses.map(async (c) => {
        const [graded, scale, overall, drops, rows] = await Promise.all([
          courseStore.getBbGradeItems(c.uuid),
          courseStore.getGradingScale(c.uuid),
          json(`bb.overall.${c.uuid}`, null),
          json(`grades.drops.${c.uuid}`, {}),
          courseStore.getAssignments(c.uuid),
        ]);
        const items = Array.isArray(graded) ? graded : [];
        const g = computeCourseGrade({ snapshot: c, graded: items, overall, scale, drops, target: c.targetGrade, now: today.now });
        const { st } = categoryStanding({ rows: g.rows, graded: items, open: c.assignments || [] });
        const current = st.current ?? g.current;
        const code = getCourseLabel(c);
        return {
          course: { id: c.uuid, code, current, letter: letterFor(current, scale), doneW: st.doneW, graded: items.filter((i) => i.score != null).map((i) => ({ name: i.name, at: i.graded_at || i.synced_at })) },
          rows: (Array.isArray(rows) ? rows : []).map((r) => ({ ...r, course_uuid: c.uuid })),
          fact: { id: c.uuid, code, current, target: g.target, items: (c.assignments || []).filter((a) => a.score == null) },
        };
      })
    );
    const codeOf = new Map(per.map((p) => [p.course.id, p.course.code]));
    const urlOf = new Map(per.flatMap((p) => p.rows.map((r) => [r.uuid, r.url])));
    const tasks = rankToday({ ...today, courses }, { now: today.now })
      .filter((i) => i.type !== ITEM_TYPES.GRADE_RISK)
      .map((i) => {
        const uuid = i.id.split(":")[1];
        return { uuid, courseUuid: i.courseUuid, code: codeOf.get(i.courseUuid), title: i.title, kind: i.kind, dueDate: i.dueDate, url: urlOf.get(uuid) || i.action?.url || null };
      });
    const open = per.flatMap((p) => p.rows).filter((r) => !isDone(r));
    const counts = countDueThisWeek(open, now);
    setState({
      loaded: true,
      now,
      syncedAt: today.syncedAt,
      tasks,
      week: weekCells(open, now),
      dueCount: Object.values(counts).reduce((s, n) => s + n, 0),
      courses: per.map((p) => p.course),
      facts: per.map((p) => p.fact),
    });
  }, [skipKey]);

  useEffect(() => {
    void load();
    RELOAD_EVENTS.forEach((n) => window.addEventListener(n, load));
    return () => RELOAD_EVENTS.forEach((n) => window.removeEventListener(n, load));
  }, [load]);

  return state;
}
