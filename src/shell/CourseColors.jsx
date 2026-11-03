import { createContext, useContext, useMemo } from "react";
import { colorIndexes, courseColor } from "../features/dashboard/courseColor.js";

const Ctx = createContext({});

/** Gives every screen the same color for the same course. `last` ids (organizations) are colored after the classes. */
export function CourseColorProvider({ ids, last, children }) {
  const value = useMemo(() => colorIndexes(ids, last), [ids, last]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** CSS color for one course id, for example `style={{ "--course": useCourseColor(id) }}`. */
export const useCourseColor = (id) => courseColor(useContext(Ctx), id);
export const useCourseColors = () => useContext(Ctx);
export { courseColor };
