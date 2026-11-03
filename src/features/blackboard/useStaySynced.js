import { useCallback, useEffect, useRef, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { friendlyCourse } from "../dashboard/courseLabel.js";
import { courseTermState, shouldSync } from "./syncRules.js";

const POLL_MS = 15000;
const APPLY_WAIT_MS = 60000;
const PARALLEL = 3;
const LAST_SYNC_KEY = "bb.lastSync";
const LAST_SYNC_AT_KEY = "bb.lastSyncAt";

/** Resolves with the "studyhub-bb-synced" detail for one course once it has landed in the database. */
function waitForLanded(bbCourseId) {
  let cancel = () => {};
  const promise = new Promise((resolve) => {
    const done = (detail) => {
      clearTimeout(timer);
      window.removeEventListener("studyhub-bb-synced", onSynced);
      resolve(detail);
    };
    const onSynced = (e) => e.detail?.bbCourseId === bbCourseId && e.detail?.phase === "course" && done(e.detail);
    const timer = setTimeout(() => done(null), APPLY_WAIT_MS);
    window.addEventListener("studyhub-bb-synced", onSynced);
    cancel = () => done(null);
  });
  return { promise, cancel };
}

/** Old-term Blackboard courses already in the database go away, so the sidebar shows this term only. */
async function pruneEnded(enrollments) {
  const ended = new Set(enrollments.filter((e) => e.term.ended).map((e) => e.bbCourseId));
  if (!ended.size) return 0;
  let removed = 0;
  for (const c of await courseStore.loadAllCourses()) {
    if (c.bbCourseId && ended.has(c.bbCourseId)) {
      await courseStore.deleteCourse(c.id || c.uuid);
      removed += 1;
    }
  }
  if (removed) window.dispatchEvent(new CustomEvent("projector-courses-pruned"));
  return removed;
}

/**
 * Live mode only. Syncs this term's courses when the student signs in, when the app starts, every
 * 30 minutes and on `syncNow()`, three courses at a time, one run at a time. The first sync of a
 * course is full; later ones are light (the main process decides). `report` holds counts only.
 */
export function useStaySynced() {
  const bb = window.studyHub?.blackboard;
  const [state, setState] = useState({ loggedIn: false, running: false, progress: null, lastSyncAt: null, error: "", report: [], now: Date.now(), toast: "", enrollments: [], timing: null });
  const runningRef = useRef(false);
  const lastTryRef = useRef(null);
  const wasLoggedInRef = useRef(null);
  const reportRef = useRef(new Map());
  const timingRef = useRef(null);
  const patch = useCallback((p) => setState((s) => ({ ...s, ...p })), []);
  const publishReport = useCallback(() => patch({ report: [...reportRef.current.values()] }), [patch]);

  const run = useCallback(
    async (reason, loggedIn) => {
      if (!bb || !shouldSync({ loggedIn, running: runningRef.current, reason, lastTryAt: lastTryRef.current })) return;
      runningRef.current = true;
      lastTryRef.current = Date.now();
      const startedAt = Date.now();
      reportRef.current = new Map();
      timingRef.current = { land: null, syllabus: null, kind: "light", startedAt };
      patch({ running: true, error: "", progress: { name: "", index: 0, total: 0, step: "" }, report: [], timing: null });
      let error = "";
      let anyOk = false;
      try {
        const listed = await bb.listCourses();
        if (!listed?.ok) throw new Error(listed?.error === "not-logged-in" ? "Sign in to Blackboard again." : listed?.error || "Could not list courses.");
        const all = (listed.enrollments || listed.courses || []).map((e) => ({ ...e, term: courseTermState(e) }));
        const courses = all.filter((e) => e.reason === "kept" && e.term.keep);
        patch({
          enrollments: all.map((e) => ({
            name: friendlyCourse(e).label || e.name,
            hint: friendlyCourse(e).raw,
            line: [e.termId || "no term", e.available || "availability ?", e.role].join(" · "),
            reason: e.reason !== "kept" ? e.reason : e.term.keep ? `kept: ${e.term.reason}` : e.term.reason,
          })),
        });
        await pruneEnded(all);

        const byId = new Map(courses.map((c) => [c.bbCourseId, friendlyCourse(c)]));
        let done = 0;
        let started = 0;
        const off = bb.onSyncProgress?.((p) => {
          const f = byId.get(p.bbCourseId);
          if (f) setState((s) => (s.progress ? { ...s, progress: { ...s.progress, name: f.code || f.label, hint: f.raw, step: p.step } } : s));
        });
        let abort = false;
        const one = async (c) => {
          const friendly = friendlyCourse(c);
          const name = friendly.code || friendly.label;
          started += 1;
          patch({ progress: { name, hint: friendly.raw, index: Math.min(started, courses.length), total: courses.length, step: "" } });
          const waiting = waitForLanded(c.bbCourseId);
          const res = await bb.syncCourse({ bbCourseId: c.bbCourseId, name: c.name, courseCode: c.courseCode, term: c.termId, force: reason === "manual" });
          done += 1;
          if (!res?.ok) {
            waiting.cancel();
            if (res?.error === "not-logged-in") {
              abort = true;
              throw new Error("Sign in to Blackboard again.");
            }
            reportRef.current.set(c.bbCourseId, { name, hint: friendly.raw, error: true });
            return publishReport();
          }
          await waiting.promise;
          anyOk = true;
          const perCourse = { ...(JSON.parse((await courseStore.getSetting(LAST_SYNC_KEY)) || "{}") || {}), [c.bbCourseId]: new Date().toISOString() };
          await courseStore.setSetting(LAST_SYNC_KEY, JSON.stringify(perCourse));
          if (res.full) timingRef.current.kind = "full";
          reportRef.current.set(c.bbCourseId, { name, hint: friendly.raw, full: !!res.full, syllabus: res.syllabusPending ? "pending" : null, counts: res.counts });
          publishReport();
        };
        let next = 0;
        const worker = async () => {
          while (!abort && next < courses.length) await one(courses[next++]);
        };
        try {
          await Promise.all(Array.from({ length: Math.min(PARALLEL, courses.length) }, worker));
        } finally {
          off?.();
        }
      } catch (err) {
        error = err?.message || "Sync failed.";
      }
      timingRef.current.land = Date.now() - startedAt;
      const lastSyncAt = anyOk ? new Date().toISOString() : null;
      if (lastSyncAt) await courseStore.setSetting(LAST_SYNC_AT_KEY, lastSyncAt);
      runningRef.current = false;
      setState((s) => ({ ...s, running: false, progress: null, error, lastSyncAt: lastSyncAt || s.lastSyncAt, timing: { ...timingRef.current } }));
      window.dispatchEvent(new CustomEvent("studyhub-mirror-changed"));
    },
    [bb, patch, publishReport]
  );

  // The syllabus lands last, in the background: fill in each course's report line as it arrives.
  useEffect(() => {
    const onSyllabus = (e) => {
      const d = e.detail || {};
      if (d.phase !== "syllabus") return;
      const entry = reportRef.current.get(d.bbCourseId);
      if (!entry) return;
      reportRef.current.set(d.bbCourseId, { ...entry, syllabus: d.syllabusStatus === "cached" ? "cached" : d.source || null, weights: d.weights ?? 0, mapped: d.mapped ?? 0 });
      publishReport();
      if (timingRef.current && ![...reportRef.current.values()].some((r) => r.syllabus === "pending")) {
        timingRef.current.syllabus = Date.now() - timingRef.current.startedAt;
        setState((s) => (s.running ? s : { ...s, timing: { ...timingRef.current } }));
      }
    };
    window.addEventListener("studyhub-bb-synced", onSyllabus);
    return () => window.removeEventListener("studyhub-bb-synced", onSyllabus);
  }, [publishReport]);

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

  // Connect (new sign in, or already connected): no window stays open, just a note and a sync.
  useEffect(() => {
    if (!bb?.onConnected) return undefined;
    let timer;
    const off = bb.onConnected((p) => {
      patch({ toast: p?.already ? "Blackboard is already connected. Syncing now." : "Signed in to Blackboard. Syncing now." });
      clearTimeout(timer);
      timer = setTimeout(() => patch({ toast: "" }), 5000);
      wasLoggedInRef.current = true;
      patch({ loggedIn: true });
      void run("login", true);
    });
    return () => {
      off?.();
      clearTimeout(timer);
    };
  }, [bb, run, patch]);

  const syncNow = useCallback(() => run("manual", true), [run]);
  return { available: !!bb?.getStatus, ...state, syncNow };
}
