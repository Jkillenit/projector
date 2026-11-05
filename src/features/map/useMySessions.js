import { useCallback, useEffect, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { SESSIONS_KEY, parseSessions } from "./mySessions.js";

/** Sessions the student added, saved in local settings (the demo keeps them in its own storage). Never sent anywhere. */
export function useMySessions() {
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    let live = true;
    courseStore.getSetting(SESSIONS_KEY).then((raw) => live && setSessions(parseSessions(raw)));
    return () => {
      live = false;
    };
  }, []);
  const save = useCallback(async (next) => {
    setSessions(next);
    await courseStore.setSetting(SESSIONS_KEY, JSON.stringify(next));
  }, []);
  const add = useCallback((s) => save([...sessions, s]), [sessions, save]);
  const remove = useCallback((id) => save(sessions.filter((s) => s.id !== id)), [sessions, save]);
  return { sessions, add, remove };
}
