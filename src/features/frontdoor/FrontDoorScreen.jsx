import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import resources from "../../demo/resources.json";
import { courseStore } from "../../db/courseStore.js";
import { AskBar } from "../../shell/AskBar.jsx";
import { openInBlackboard } from "../mirror/openInBlackboard.js";
import { syncedAgo } from "../today/syncedAgo.js";
import { useOrgIds } from "../courses/useOrgIds.js";
import { CourseCards } from "./CourseCards.jsx";
import { DueSoon } from "./DueSoon.jsx";
import { coursePicks } from "./coursePicks.js";
import { greeting } from "./dueSoon.js";
import { useHomeData } from "./useHomeData.js";
import { friendlyCourse } from "../dashboard/courseLabel.js";
import { lastVisitOrDefault, newGradesSince, scoreText } from "./newGrades.js";

const VISIT_KEY = "fd.lastVisit";

function DataStatus({ mode, syncedAt }) {
  if (mode === "demo") return <span className="fd-meta">Demo data, updated today</span>;
  return <span className="fd-meta">{syncedAgo(syncedAt) || "Not synced yet"}</span>;
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
    <div className="fd-banner" role="status">
      <span>{everSynced ? "Your Blackboard sign in ran out." : "Connect Blackboard to see your classes."}</span>
      <button type="button" className="fd-btn-quiet" onClick={() => bb.open()}>
        {everSynced ? "Sign in again" : "Connect"}
      </button>
    </div>
  );
}

export function FrontDoorScreen({ profile, mode, onOpenCourse, onOpenResource, onAsk }) {
  const orgIds = useOrgIds();
  const { loaded, cards, due, facts, syncedAt } = useHomeData(orgIds);
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
  const picks = useMemo(() => coursePicks(facts, resources), [facts]);
  const openItem = useCallback((a) => (a.url ? openInBlackboard(a.url) : onOpenCourse(a.course_uuid)), [onOpenCourse]);
  const done = useCallback((a) => void courseStore.setAssignmentCompleted(a.uuid, true), []);

  return (
    <div className="fd-screen fd-home">
      <header className="fd-home-head">
        <h1 className="fd-title">{profile.name ? `${greeting()}, ${profile.name}` : greeting()}</h1>
        {loaded ? <DataStatus mode={mode} syncedAt={syncedAt} /> : null}
      </header>

      <SignInCard />

      {!loaded ? (
        <div className="sh-skeleton-pulse" style={{ height: 160 }} aria-busy="true" />
      ) : (
        <div className="fd-home-grid">
          <div className="fd-col">
            <DueSoon due={due} cards={cards} onOpen={openItem} onDone={done} />
            <CourseCards cards={cards} onOpen={onOpenCourse} />
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
              {picks.length ? (
                <ul className="fd-rows">
                  {picks.map(({ key, text, resource }) => (
                    <li key={key} className="fd-pick">
                      <span className="fd-row-main">{text}</span>
                      <button type="button" className="fd-btn-quiet" onClick={() => onOpenResource(resource.id)}>How to get in</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fd-meta">Nothing in your classes needs help right now.</p>
              )}
            </section>
          </div>
        </div>
      )}

      <AskBar onAsk={onAsk} />
    </div>
  );
}
