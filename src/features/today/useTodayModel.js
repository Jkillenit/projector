import { useCallback, useEffect, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { blockedFromMemory, gameDaysFromMemory } from "./blocked.js";
import { buildTodayView } from "./todayView.js";

const RELOAD_EVENTS = [
  "studyhub-mirror-changed",
    "studyhub-target-changed",
  "studyhub-exam-scope-changed",
  "fd-facts-changed",
];

/** Loads the Today snapshot, grading scales and blocked days, and keeps the view fresh when they change. */
export function useTodayModel(refreshKey = 0) {
  const [state, setState] = useState({ loaded: false, view: null });

  const load = useCallback(async () => {
    const [data, memory] = await Promise.all([courseStore.loadTodayData(), courseStore.facts()]);
    const pairs = await Promise.all((data.courses || []).map(async (c) => [c.uuid, await courseStore.getGradingScale(c.uuid)]));
    const blockedDays = blockedFromMemory(memory);
    const gameDays = gameDaysFromMemory(memory);
    setState({ loaded: true, view: buildTodayView(data, { scales: Object.fromEntries(pairs), blockedDays, gameDays }) });
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const onChange = () => void load();
    RELOAD_EVENTS.forEach((name) => window.addEventListener(name, onChange));
    return () => RELOAD_EVENTS.forEach((name) => window.removeEventListener(name, onChange));
  }, [load]);

  return { ...state, reload: load };
}
