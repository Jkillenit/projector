import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import resources from "../../demo/resources.json";
import organizations from "../../demo/organizations.json";
import { courseStore } from "../../db/courseStore.js";
import { toStudent } from "../../platform/profile.js";
import { AskBar } from "../../shell/AskBar.jsx";
import { orgsAsResources, pickForYou } from "../guide/matcher.js";
import { openInBlackboard } from "../mirror/openInBlackboard.js";
import { runTodayAction } from "../today/runAction.js";
import { syncedAgo } from "../today/syncedAgo.js";
import { useTodayModel } from "../today/useTodayModel.js";
import { OverdueStrip } from "../today/components/OverdueStrip.jsx";
import { TonightList } from "../today/components/TonightList.jsx";
import { friendlyCourse } from "../dashboard/courseLabel.js";
import { lastVisitOrDefault, newGradesSince, scoreText } from "./newGrades.js";

const VISIT_KEY = "fd.lastVisit";
const POOL = [...resources, ...orgsAsResources(organizations)];

function DataStatus({ mode, syncedAt }) {
  if (mode === "demo") return <p className="fd-meta">Demo data, last updated {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>;
  return <p className="fd-meta">{syncedAgo(syncedAt) || "Not synced yet"}</p>;
}

/** Live mode only: one clear card when Blackboard needs a sign in. Never a silent failure. */
function SignInCard() {
  const bb = window.studyHub?.blackboard;
  const [loggedIn, setLoggedIn] = useState(true);
  const [everSynced, setEverSynced] = useState(false);
  useEffect(() => {
    if (!bb?.getStatus) return undefined;
    const check = () => bb.getStatus().then((s) => setLoggedIn(!!s?.loggedIn)).catch(() => setLoggedIn(false));
    void check();
    void courseStore.getSetting("bb.lastSync").then((v) => setEverSynced(!!v));
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [bb]);
  if (!bb || loggedIn) return null;
  return (
    <div className="fd-note fd-note--warn" role="status">
      <strong>{everSynced ? "Sign in to Blackboard again" : "Connect Blackboard"}</strong>
      <p>{everSynced ? "Your Blackboard sign in ran out. Sign in to see new grades and due dates." : "Connect once to see your classes here."}</p>
      <button type="button" className="fd-btn fd-btn--small" onClick={() => bb.open()}>
        {everSynced ? "Sign in to Blackboard" : "Connect Blackboard"}
      </button>
    </div>
  );
}

export function FrontDoorScreen({ profile, mode, onOpenCourse, onOpenResource, onNavigate, onAsk }) {
  const { loaded, view } = useTodayModel();
  const [recent, setRecent] = useState([]);
  const [lastVisit, setLastVisit] = useState(null);

  const loadGrades = useCallback(async () => {
    const dash = await courseStore.getDashboard();
    setRecent(dash?.recentGrades || []);
  }, []);

  useEffect(() => {
    void loadGrades();
    window.addEventListener("studyhub-mirror-changed", loadGrades);
    window.addEventListener("studyhub-bb-synced", loadGrades);
    return () => {
      window.removeEventListener("studyhub-mirror-changed", loadGrades);
      window.removeEventListener("studyhub-bb-synced", loadGrades);
    };
  }, [loadGrades]);

  // The marker moves forward once there is data to look at (the first sync in live mode), so the
  // first visit shows the last 14 days. This visit keeps comparing with the old marker.
  const syncedAt = view?.syncedAt;
  const visitRead = useRef(false);
  useEffect(() => {
    if (visitRead.current || (mode !== "demo" && !syncedAt)) return;
    visitRead.current = true;
    void courseStore.getSetting(VISIT_KEY).then((saved) => {
      setLastVisit(lastVisitOrDefault(saved));
      void courseStore.setSetting(VISIT_KEY, new Date().toISOString());
    });
  }, [mode, syncedAt]);

  const fresh = useMemo(() => (lastVisit ? newGradesSince(recent, lastVisit) : []), [recent, lastVisit]);
  const weak = view?.standing?.courses?.find((r) => r.state === "warn");
  const picks = useMemo(() => pickForYou(toStudent(profile), POOL, { weakCourse: weak?.label }), [profile, weak?.label]);
  const run = useCallback((action) => runTodayAction(action, onOpenCourse), [onOpenCourse]);
  const openOverdue = useCallback((item) => (item.url ? openInBlackboard(item.url) : onOpenCourse(item.courseUuid)), [onOpenCourse]);

  return (
    <div className="fd-screen fd-home">
      <header>
        <h1 className="fd-title">{profile.name ? `Hi ${profile.name}` : "Welcome"}</h1>
        {view ? <DataStatus mode={mode} syncedAt={view.syncedAt} /> : null}
      </header>

      <SignInCard />

      {!loaded || !view ? (
        <div className="sh-skeleton-pulse" style={{ height: 160 }} aria-busy="true" />
      ) : (
        <div className="fd-home-grid">
          <div className="fd-col">
            <TonightList items={view.tonight} hasCourses={view.hasCourses} synced={view.synced} onRun={run} />
            <OverdueStrip items={view.overdue} onMarkSubmitted={(uuid) => void courseStore.setAssignmentCompleted(uuid, true)} onOpen={openOverdue} />
          </div>
          <div className="fd-col">
            <section className="fd-panel" aria-label="New grades">
              <h2 className="fd-h2">New grades</h2>
              {fresh.length ? (
                <ul className="fd-rows">
                  {fresh.map((g) => (
                    <li key={`${g.course_uuid}-${g.name}-${g.graded_at}`}>
                      <span className="fd-new-dot" aria-label="New" />
                      <span className="fd-row-main">
                        <strong>{g.name}</strong>
                        <span className="fd-meta" title={friendlyCourse({ courseCode: g.course_code, name: g.course_name }).raw}>{friendlyCourse({ courseCode: g.course_code, name: g.course_name }).label}</span>
                      </span>
                      <span className="fd-score">{scoreText(g)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fd-meta">No new grades since your last visit.</p>
              )}
            </section>

            <section className="fd-panel" aria-label="Picked for you">
              <h2 className="fd-h2">Picked for you</h2>
              <ul className="fd-rows">
                {picks.map(({ resource, why }) => (
                  <li key={resource.id} className="fd-pick">
                    <span className="fd-row-main">
                      <strong>{resource.name}</strong>
                      <span className="fd-why">{why}</span>
                    </span>
                    <button type="button" className="fd-btn fd-btn--small" onClick={() => (resource.id.startsWith("org-") ? onNavigate("clubs") : onOpenResource(resource.id))}>
                      {resource.id.startsWith("org-") ? "See clubs" : "How to get in"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      <AskBar onAsk={onAsk} />
    </div>
  );
}
