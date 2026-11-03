import { useCallback, useEffect, useState } from "react";
import { courseStore } from "../../db/courseStore.js";

const RELOAD_EVENTS = ["studyhub-mirror-changed", "studyhub-bb-synced", "studyhub-target-changed"];
const json = async (key, fallback) => {
  try {
    return JSON.parse(await courseStore.getSetting(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

/** What one course's grade needs from the database. Reloads after a sync or an edit. */
export function useCourseGrade(courseUuid) {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const [today, graded, scale, overall, drops, target] = await Promise.all([
      courseStore.loadTodayData(courseUuid),
      courseStore.getBbGradeItems(courseUuid),
      courseStore.getGradingScale(courseUuid),
      json(`bb.overall.${courseUuid}`, null),
      json(`grades.drops.${courseUuid}`, {}),
      courseStore.getTargetGrade(courseUuid),
    ]);
    setData({ now: today?.now, snapshot: today?.courses?.[0] || { uuid: courseUuid, components: [], assignments: [] }, graded: Array.isArray(graded) ? graded : [], scale, overall, drops, target });
  }, [courseUuid]);

  useEffect(() => {
    setData(null);
    void load();
    RELOAD_EVENTS.forEach((n) => window.addEventListener(n, load));
    return () => RELOAD_EVENTS.forEach((n) => window.removeEventListener(n, load));
  }, [load]);

  const setDrops = useCallback(
    async (drops) => {
      setData((d) => d && { ...d, drops });
      await courseStore.setSetting(`grades.drops.${courseUuid}`, JSON.stringify(drops));
    },
    [courseUuid]
  );

  return { data, reload: load, setDrops };
}
