import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";
import { TitleBar } from "../components/TitleBar.jsx";
import { useStaySynced } from "../features/blackboard/useStaySynced.js";
import { CampusScreen } from "../features/campus/CampusScreen.jsx";
import { EventsScreen } from "../features/campus/EventsScreen.jsx";
import { CourseScreen } from "../features/courses/CourseScreen.jsx";
import { useOrgIds } from "../features/courses/useOrgIds.js";
import { useUserCourses } from "../features/courses/useUserCourses.js";
import { CalendarScreen } from "../features/dashboard/CalendarView.jsx";
import { friendlyCourse, getCourseLabel } from "../features/dashboard/courseLabel.js";
import { isShell } from "../features/dashboard/courseColor.js";
import { UiGallery } from "../features/dev/UiGallery.jsx";
import { FrontDoorScreen } from "../features/frontdoor/FrontDoorScreen.jsx";
import { AskScreen } from "../features/guide/AskScreen.jsx";
import { applySyllabusText } from "../features/import/syllabusImport.js";
import { SettingsScreen } from "../features/settings/SettingsScreen.jsx";
import { WelcomeScreen } from "../features/welcome/WelcomeScreen.jsx";
import { loadJson, saveJson } from "../lib/storage.js";
import { useProfile } from "../platform/profile.js";
import { CommandPalette } from "../shell/CommandPalette.jsx";
import { CourseColorProvider } from "../shell/CourseColors.jsx";
import { Drawer, TopBar } from "../shell/TopBar.jsx";
import { Sidebar, SyncBox } from "../shell/Sidebar.jsx";
import { useRoute } from "../shell/useRoute.js";
import { useUpcoming } from "../shell/useUpcoming.js";

// The map carries the campus outlines (about 300 KB), so it loads only when opened.
const MapScreen = lazy(() => import("../features/map/MapScreen.jsx").then((m) => ({ default: m.MapScreen })));

const THEME_KEY = "fd.theme";

/** "dark" (default), "light" or "system" (follows the OS). */
function useTheme() {
  const [theme, setTheme] = useState(() => loadJson(THEME_KEY, "dark"));
  useEffect(() => {
    saveJson(THEME_KEY, theme);
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    const apply = () => {
      const resolved = theme === "system" ? (mq?.matches ? "light" : "dark") : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    if (theme !== "system") return undefined;
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, [theme]);
  return [theme, setTheme];
}

/** Live mode: a finished Blackboard sync reloads that course and reads the syllabus weights. */
function useSyncEvents(reloadCourse, reloadAll) {
  useEffect(() => {
    const bb = window.studyHub?.blackboard;
    if (!bb?.onSyncComplete) return undefined;
    const offSync = bb.onSyncComplete(async (res) => {
      if (!res?.courseUuid) return;
      await reloadCourse(res.courseUuid);
      // The course (assignments, grades, announcements) has landed; its syllabus arrives later on onSyllabus.
      window.dispatchEvent(
        new CustomEvent("studyhub-bb-synced", {
          detail: { bbCourseId: res.bbCourseId, courseUuid: res.courseUuid, ok: res.ok, phase: "course", syllabusStatus: res.syllabusPending ? "pending" : "none" },
        })
      );
    });
    const offSyllabus = bb.onSyllabus?.(async (res) => {
      if (!res?.courseUuid) return;
      let applied = { status: res.cached ? "cached" : res.syllabus ? "none" : "missing" };
      if (res.syllabus?.text) applied = await applySyllabusText(res.courseUuid, res.syllabus.text).catch(() => ({ status: "none" }));
      await reloadCourse(res.courseUuid);
      window.dispatchEvent(
        new CustomEvent("studyhub-bb-synced", {
          detail: { bbCourseId: res.bbCourseId, courseUuid: res.courseUuid, ok: true, phase: "syllabus", syllabusStatus: applied.status, source: res.syllabus?.source || res.source || null, weights: applied.count ?? 0, mapped: applied.mapped ?? 0 },
        })
      );
    });
    // Old-term courses were removed from the database: re-read the list.
    const onPruned = () => void reloadAll();
    window.addEventListener("projector-courses-pruned", onPruned);
    // Disconnect wiped everything mirrored from Blackboard: start over from a clean screen.
    const offGone = bb.onDisconnected?.(() => window.location.reload());
    return () => {
      offSync?.();
      offSyllabus?.();
      offGone?.();
      window.removeEventListener("projector-courses-pruned", onPruned);
    };
  }, [reloadCourse, reloadAll]);
}

function Shell({ profile, onProfile, onPickStudent, theme, onTheme, mode }) {
  const { courses, loaded, reloadCourse, reloadAll } = useUserCourses();
  const [route, navigate] = useRoute();
  const [askSeed, setAskSeed] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Grades start hidden every session; the choice is kept in memory only.
  const [gradesShown, setGradesShown] = useState(false);
  const sync = useStaySynced();
  const expired = mode === "live" && sync.available && sync.checked && !sync.loggedIn && !sync.running;
  const signIn = useCallback(() => window.studyHub?.blackboard?.open?.(), []);
  useSyncEvents(reloadCourse, reloadAll);

  const ask = useCallback((text, { prefill = false } = {}) => {
    setAskSeed({ text, prefill, at: Date.now() });
    navigate("ask");
  }, [navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    setDrawerOpen(false);
  }, [route]);

  // Blackboard marks organizations (clubs, "Bama Bound"); the sync saves their ids.
  const orgIds = useOrgIds();
  const upcoming = useUpcoming();
  const sideCourses = useMemo(() => {
    const items = courses.map((c) => ({ id: c.id, label: getCourseLabel(c), hint: friendlyCourse(c).raw, gray: orgIds.includes(c.bbCourseId) || isShell(c.name), count: upcoming.counts[c.id] || 0, key: c.bbCourseId || c.id }));
    return [...items.filter((c) => !c.gray), ...items.filter((c) => c.gray)];
  }, [courses, orgIds, upcoming.counts]);

  const courseId = route.name === "course" ? route.parts[0] : null;
  const activeCourse = courseId ? courses.find((c) => c.id === courseId || c.uuid === courseId) : null;
  const actions = useMemo(
    () => ({
      navigate,
      ask,
      openCourse: (id, tab = "overview", item) => navigate("course", [id, tab], { item }),
      openResource: (id) => navigate("campus", ["r", id]),
    }),
    [navigate, ask]
  );

  let screen;
  if (!loaded) screen = <div className="page" aria-busy="true" />;
  else if (route.name === "course" && activeCourse) screen = <CourseScreen key={activeCourse.id} course={activeCourse} tab={route.parts[1] || "overview"} item={route.query.item} label={getCourseLabel(activeCourse)} actions={actions} />;
  else if (route.name === "ask") screen = <AskScreen profile={profile} seed={askSeed} actions={actions} />;
  else if (route.name === "campus") screen = <CampusScreen profile={profile} section={route.parts[0]} resourceId={route.parts[0] === "r" ? route.parts[1] : null} actions={actions} />;
  else if (route.name === "events") screen = <EventsScreen profile={profile} />;
  else if (route.name === "map") screen = <Suspense fallback={<div className="page" aria-busy="true" />}><MapScreen query={route.query.q} placeId={route.query.place} /></Suspense>;
  else if (route.name === "calendar") screen = <CalendarScreen day={route.query.day} actions={actions} />;
  else if (route.name === "settings") screen = <SettingsScreen profile={profile} onProfile={onProfile} onPickStudent={onPickStudent} theme={theme} onTheme={onTheme} userCourses={courses} mode={mode} sync={sync} />;
  else if (route.name === "dev") screen = <UiGallery />;
  else screen = <FrontDoorScreen profile={profile} mode={mode} expired={expired} onSignIn={signIn} gradesShown={gradesShown} onGradesShown={setGradesShown} actions={actions} />;

  const paletteActions = [
    { key: "a-grades", label: gradesShown ? "Hide grades" : "Show grades", run: () => setGradesShown((v) => !v) },
    ...(mode === "live" ? [{ key: "a-signin", label: "Sign in again", run: signIn }] : []),
    { key: "a-theme", label: "Switch theme", run: () => onTheme(theme === "light" ? "dark" : "light") },
    { key: "a-settings", label: "Open settings", run: () => navigate("settings") },
  ];
  const syncBox = <SyncBox mode={mode} studentName={profile.name} sync={sync} expired={expired} onSettings={() => navigate("settings")} />;
  const sidebar = <Sidebar route={route} courses={sideCourses} onSearch={() => setPaletteOpen(true)} syncBox={syncBox} />;

  return (
    <CourseColorProvider courses={sideCourses}>
      <div className="app">
        <div className="app-side">{sidebar}</div>
        <div className="app-main">
          <TitleBar />
          <TopBar onSearch={() => setPaletteOpen(true)} onMenu={() => setDrawerOpen(true)} />
          <main className="app-scroll" id="main">
            <ErrorBoundary resetKey={window.location.hash} onReset={() => navigate("home")}>
              <div key={`${route.name}/${route.parts.join("/")}`} className="ui-fade">{screen}</div>
            </ErrorBoundary>
          </main>
        </div>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>{sidebar}</Drawer>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} courses={sideCourses} upcoming={upcoming.rows} profile={profile} paletteActions={paletteActions} actions={actions} />
      </div>
    </CourseColorProvider>
  );
}

export function App() {
  const { profile, loaded, update, chooseDemoStudent } = useProfile();
  const [theme, setTheme] = useTheme();
  const mode = window.studyHub?.mode === "live" ? "live" : "demo";

  if (!loaded) return null;
  if (mode === "demo" && !profile.studentId) return <WelcomeScreen onPick={chooseDemoStudent} />;
  return <Shell key={profile.studentId || "live"} profile={profile} onProfile={update} onPickStudent={chooseDemoStudent} theme={theme} onTheme={setTheme} mode={mode} />;
}
