import { useCallback, useEffect, useRef, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { currentTermCourses, shouldSync } from "./syncRules.js";

const POLL_MS = 15000;
const APPLY_WAIT_MS = 60000;
const LAST_SYNC_KEY = "bb.lastSync";
const LAST_SYNC_AT_KEY = "bb.lastSyncAt";

/** Resolves with the "studyhub-bb-synced" detail for one course (after the syllabus and grades are applied). */
function waitForApplied(bbCourseId) {
  let cancel = () => {};
  const promise = new Promise((resolve) => {
    const done = (detail) => {
      clearTimeout(timer);
      window.removeEventListener("studyhub-bb-synced", onSynced);
      resolve(detail);
    };
    const onSynced = (e) => e.detail?.bbCourseId === bbCourseId && done(e.detail);
    const timer = setTimeout(() => done(null), APPLY_WAIT_MS);
    window.addEventListener("studyhub-bb-synced", onSynced);
    cancel = () => done(null);
  });
  return { promise, cancel };
}

/**
 * Live mode only. Syncs the current term when the student signs in, when the app starts, every
 * 30 minutes and on `syncNow()`. One run at a time. `report` holds counts only, never grades.
 */
export function useStaySynced() {
  const bb = window.studyHub?.blackboard;
  const [state, setState] = useState({ loggedIn: false, running: false, progress: null, lastSyncAt: null, error: "", report: [], now: Date.now() });
  const runningRef = useRef(false);
  const lastTryRef = useRef(null);
  const wasLoggedInRef = useRef(null);
  const patch = useCallback((p) => setState((s) => ({ ...s, ...p })), []);

  const run = useCallback(
    async (reason, loggedIn) => {
      if (!bb || !shouldSync({ loggedIn, running: runningRef.current, reason, lastTryAt: lastTryRef.current })) return;
      runningRef.current = true;
      lastTryRef.current = Date.now();
      patch({ running: true, error: "", progress: { name: "", index: 0, total: 0, step: "" }, report: [] });
      const report = [];
      let error = "";
      try {
        const listed = await bb.listCourses();
        if (!listed?.ok) throw new Error(listed?.error === "not-logged-in" ? "Sign in to Blackboard again." : listed?.error || "Could not list courses.");
        const courses = currentTermCourses(listed.courses || []);
        const off = bb.onSyncProgress?.((p) => setState((s) => (s.progress ? { ...s, progress: { ...s.progress, step: p.step } } : s)));
        try {
          for (const [index, c] of courses.entries()) {
            patch({ progress: { name: c.courseCode || c.name, index: index + 1, total: courses.length, step: "contents" } });
            const waiting = waitForApplied(c.bbCourseId);
            const res = await bb.syncCourse({ bbCourseId: c.bbCourseId, name: c.name, courseCode: c.courseCode, term: c.termId });
            if (!res?.ok) {
              waiting.cancel();
              if (res?.error === "not-logged-in") throw new Error("Sign in to Blackboard again.");
              report.push({ name: c.courseCode || c.name, error: true });
              continue;
            }
            const applied = await waiting.promise;
            const perCourse = { ...(JSON.parse((await courseStore.getSetting(LAST_SYNC_KEY)) || "{}") || {}), [c.bbCourseId]: new Date().toISOString() };
            await courseStore.setSetting(LAST_SYNC_KEY, JSON.stringify(perCourse));
            report.push({
              name: c.courseCode || c.name,
              syllabus: res.syllabus ? res.syllabus.source : null,
              weights: applied?.weights ?? 0,
              mapped: applied?.mapped ?? 0,
            });
          }
        } finally {
          off?.();
        }
      } catch (err) {
        error = err?.message || "Sync failed.";
      }
      const lastSyncAt = report.some((r) => !r.error) ? new Date().toISOString() : null;
      if (lastSyncAt) await courseStore.setSetting(LAST_SYNC_AT_KEY, lastSyncAt);
      runningRef.current = false;
      setState((s) => ({ ...s, running: false, progress: null, error, report, lastSyncAt: lastSyncAt || s.lastSyncAt }));
      window.dispatchEvent(new CustomEvent("studyhub-mirror-changed"));
    },
    [bb, patch]
  );

  // Poll the sign in state: a false → true change is a login; otherwise the 30 minute timer.
  useEffect(() => {
    if (!bb?.getStatus) return undefined;
    let alive = true;
    void courseStore.getSetting(LAST_SYNC_AT_KEY).then((v) => alive && v && patch({ lastSyncAt: v }));
    const check = async () => {
      const status = await bb.getStatus().catch(() => null);
      if (!alive) return;
      const loggedIn = !!status?.loggedIn;
      const was = wasLoggedInRef.current;
      wasLoggedInRef.current = loggedIn;
      patch({ loggedIn, now: Date.now() });
      await run(was === null ? "start" : loggedIn && !was ? "login" : "tick", loggedIn);
    };
    void check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [bb, run, patch]);

  const syncNow = useCallback(() => run("manual", true), [run]);
  return { available: !!bb?.getStatus, ...state, syncNow };
}
