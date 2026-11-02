import { useCallback, useEffect, useState } from "react";
import interests from "../demo/interests.json";
import students from "../demo/students.json";
import { courseStore } from "../db/courseStore.js";
import { PROFILE_KEY } from "./demoBridge.js";

export const INTEREST_OPTIONS = interests.map((i) => i.name);
const CHANGED = "fd-profile-changed";
const EMPTY = { studentId: null, name: "", classYear: "Freshman", major: "", interests: [], freeTimes: [] };

export function profileFromStudent(s) {
  return { studentId: s.id, name: s.name, classYear: s.class_year, major: s.major, interests: [...s.interests], freeTimes: s.free_times };
}

async function read() {
  try {
    return { ...EMPTY, ...(JSON.parse(await courseStore.getSetting(PROFILE_KEY)) || {}) };
  } catch {
    return EMPTY;
  }
}

/** What the guide and Clubs match against. */
export const toStudent = (profile) => ({ ...profile, free_times: profile.freeTimes });

/** The student's profile, saved in the app's own settings (the database in Live mode, demo storage in Demo mode). */
export function useProfile() {
  const [state, setState] = useState({ profile: EMPTY, loaded: false });

  useEffect(() => {
    let alive = true;
    const load = () => read().then((profile) => alive && setState({ profile, loaded: true }));
    void load();
    window.addEventListener(CHANGED, load);
    return () => {
      alive = false;
      window.removeEventListener(CHANGED, load);
    };
  }, []);

  const update = useCallback(async (patch) => {
    const next = { ...(await read()), ...patch };
    await courseStore.setSetting(PROFILE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CHANGED));
  }, []);

  const chooseDemoStudent = useCallback((id) => update(profileFromStudent(students.find((s) => s.id === id))), [update]);

  return { ...state, update, chooseDemoStudent };
}
