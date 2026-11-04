import { createContext, useContext, useMemo } from "react";
import { assignColors, courseStyle, getCourseColor } from "../features/dashboard/courseColor.js";
import { loadJson, saveJson } from "../lib/storage.js";

const KEY = "fd.courseColors";
const Ctx = createContext({});

/**
 * Gives every screen the same color for the same course. `courses`: [{ id, key, gray }] in sidebar order,
 * where `key` is the Blackboard course id. Slots are saved by key so a course keeps its color between syncs.
 */
export function CourseColorProvider({ courses, children }) {
  const value = useMemo(() => {
    const saved = loadJson(KEY, {});
    const slots = assignColors(courses.map((c) => c.key), saved, courses.filter((c) => c.gray).map((c) => c.key));
    saveJson(KEY, { ...saved, ...slots });
    return Object.fromEntries(courses.map((c) => [c.id, slots[c.key]]));
  }, [courses]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** { dot, text, tint, wash } for one course id. */
export const useCourseColor = (id) => getCourseColor(useContext(Ctx)[id]);
/** Inline style with --course, --course-text, --course-tint and --course-wash set. */
export const useCourseStyle = (id) => courseStyle(useCourseColor(id));
/** Look up colors for many courses at once: `const colorOf = useColorLookup(); colorOf(id).dot`. */
export function useColorLookup() {
  const slots = useContext(Ctx);
  return (id) => getCourseColor(slots[id]);
}
