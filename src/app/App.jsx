import { useCallback, useEffect, useMemo, useState } from "react";
import resources from "../demo/resources.json";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";
import { TitleBar } from "../components/TitleBar.jsx";
import { SyncBar } from "../features/blackboard/SyncBar.jsx";
import { CourseScreen } from "../features/courses/CourseScreen.jsx";
import { useUserCourses } from "../features/courses/useUserCourses.js";
import { CalendarView } from "../features/dashboard/CalendarView.jsx";
import { friendlyCourse } from "../features/dashboard/courseLabel.js";
import { FrontDoorScreen } from "../features/frontdoor/FrontDoorScreen.jsx";
import { GradesScreen } from "../features/grades/GradesScreen.jsx";
import { AskScreen } from "../features/guide/AskScreen.jsx";
import { applySyllabusText } from "../features/import/syllabusImport.js";
import { ClubsScreen } from "../features/clubs/ClubsScreen.jsx";
import { ResourceDetail } from "../features/resources/ResourceDetail.jsx";
import { ResourcesScreen } from "../features/resources/ResourcesScreen.jsx";
import { SettingsScreen } from "../features/settings/SettingsScreen.jsx";
import { WelcomeScreen } from "../features/welcome/WelcomeScreen.jsx";
import { loadJson, saveJson } from "../lib/storage.js";
import { useProfile } from "../platform/profile.js";
import { AppRail } from "../shell/AppRail.jsx";
import { CommandPalette } from "../shell/CommandPalette.jsx";
import { ShellProvider } from "../shell/ShellContext.jsx";

const THEME_KEY = "fd.theme";
const SCREENS = [
  ["home", "Home"],
  ["ask", "Ask"],
  ["resources", "Resources"],
  ["clubs", "Clubs"],
  ["calendar", "Calendar"],
  ["grades", "Grades"],
  ["settings", "Settings"],
];

function useTheme() {
  const [theme, setTheme] = useState(() => loadJson(THEME_KEY, "dark"));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.bsTheme = theme;
    saveJson(THEME_KEY, theme);
  }, [theme]);
  return [theme, setTheme];
}

function Shell({ profile, onProfile, theme, onTheme, mode }) {
  const { courses, loaded, reloadCourse } = useUserCourses();
  const [view, setView] = useState("home");
  const [courseId, setCourseId] = useState(null);
  const [resourceId, setResourceId] = useState(null);
  const [askSeed, setAskSeed] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const go = useCallback((next) => {
    setView(next);
    setCourseId(null);
    setResourceId(null);
  }, []);
  const openCourse = useCallback((id) => setCourseId(id), []);
  const openResource = useCallback((id) => {
    setView("resources");
    setCourseId(null);
    setResourceId(id);
  }, []);
  const ask = useCallback((text) => {
    setAskSeed(text);
    go("ask");
  }, [go]);

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

  // Live mode: a finished Blackboard sync reloads that course and reads the syllabus weights.
  useEffect(() => {
    const bb = window.studyHub?.blackboard;
    if (!bb?.onSyncComplete) return undefined;
    const offSync = bb.onSyncComplete(async (res) => {
      if (!res?.courseUuid) return;
      await reloadCourse(res.courseUuid);
      let applied = { status: res.syllabus ? "none" : "missing" };
      if (res.ok && res.syllabus?.text) applied = await applySyllabusText(res.courseUuid, res.syllabus.text).catch(() => ({ status: "none" }));
      window.dispatchEvent(
        new CustomEvent("studyhub-bb-synced", {
          detail: { bbCourseId: res.bbCourseId, courseUuid: res.courseUuid, ok: res.ok, syllabusStatus: applied.status, weights: applied.count ?? 0, mapped: applied.mapped ?? 0 },
        })
      );
    });
    // Disconnect wiped everything mirrored from Blackboard: start over from a clean screen.
    const offGone = bb.onDisconnected?.(() => window.location.reload());
    return () => {
      offSync?.();
      offGone?.();
    };
  }, [reloadCourse]);

  const railCourses = useMemo(() => courses.map((c) => { const f = friendlyCourse(c); return { id: c.id, code: f.code || f.label, title: f.label, hint: f.raw }; }), [courses]);
  const activeCourse = courseId ? courses.find((c) => c.id === courseId || c.uuid === courseId) : null;

  const paletteItems = useMemo(
    () => [
      ...SCREENS.map(([id, label]) => ({ key: `go-${id}`, group: "screens", icon: "›", primary: label, sub: "Screen", run: () => go(id) })),
      ...courses.map((c) => ({ key: `course-${c.id}`, group: "courses", icon: "◎", primary: friendlyCourse(c).label, sub: "Course", run: () => openCourse(c.id) })),
      ...resources.map((r) => ({ key: `res-${r.id}`, group: "resources", icon: "§", primary: r.name, sub: `Resource · ${r.tags.slice(0, 4).join(", ")}`, run: () => openResource(r.id) })),
    ],
    [courses, go, openCourse, openResource]
  );

  let screen;
  if (!loaded) screen = <div className="sh-skeleton-pulse" style={{ height: 200, margin: 24 }} aria-busy="true" />;
  else if (activeCourse) screen = <CourseScreen course={activeCourse} onBack={() => setCourseId(null)} />;
  else if (view === "home") screen = <FrontDoorScreen profile={profile} mode={mode} onOpenCourse={openCourse} onOpenResource={openResource} onNavigate={go} onAsk={ask} />;
  else if (view === "ask") screen = <AskScreen profile={profile} seed={askSeed} onOpenResource={openResource} onNavigate={go} />;
  else if (view === "resources") screen = resourceId ? <ResourceDetail resourceId={resourceId} onBack={() => setResourceId(null)} /> : <ResourcesScreen onOpenResource={openResource} />;
  else if (view === "clubs") screen = <ClubsScreen profile={profile} onGoSettings={() => go("settings")} />;
  else if (view === "calendar") screen = <div className="fd-screen"><h1 className="fd-title">Calendar</h1><CalendarView userCourses={courses} /></div>;
  else if (view === "grades") screen = <div className="fd-screen"><GradesScreen onOpenCourse={openCourse} /></div>;
  else screen = <SettingsScreen profile={profile} onProfile={onProfile} theme={theme} onTheme={onTheme} userCourses={courses} mode={mode} />;

  return (
    <div className="sh-app-root sh-app-shell">
      <AppRail view={view} courseId={courseId} courses={railCourses} onNavigate={go} onOpenCourse={openCourse} onSearch={() => setPaletteOpen(true)} />
      <div className="sh-frame-main">
        <TitleBar />
        <SyncBar />
        <main className="fd-main">
          <ErrorBoundary resetKey={`${view}-${courseId}-${resourceId}`} onReset={() => go("home")}>
            {screen}
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
    </div>
  );
}

export function App() {
  const { profile, loaded, update, chooseDemoStudent } = useProfile();
  const [theme, setTheme] = useTheme();
  const mode = window.studyHub?.mode === "live" ? "live" : "demo";

  if (!loaded) return null;
  if (mode === "demo" && !profile.studentId) return <WelcomeScreen onPick={chooseDemoStudent} />;
  return (
    <ShellProvider>
      <Shell key={profile.studentId || "live"} profile={profile} onProfile={update} theme={theme} onTheme={setTheme} mode={mode} />
    </ShellProvider>
  );
}
