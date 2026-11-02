import { openInBlackboard } from "../mirror/openInBlackboard.js";

/** Runs a Today item's action (see priority.js `action`): Blackboard links open Blackboard, everything else opens the course. */
export function runTodayAction(action, onOpenCourse) {
  if (!action) return;
  if (action.type === "blackboard") openInBlackboard(action.url);
  else onOpenCourse(action.courseUuid);
}
