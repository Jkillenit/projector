import { useEffect, useMemo, useState } from "react";
import { courseStore } from "../../db/courseStore.js";
import { plainDate, plainDue } from "../../lib/dates.js";
import { groupAssignments } from "../mirror/assignmentState.js";
import { computeCourseGrade } from "../grades/courseGrade.js";
import { useCourseGrade } from "../grades/useCourseGrade.js";
import { formatPct } from "../today/priority.js";

/** Current grade, next due, missing count and the 3 latest announcements. `go(tab)` jumps to a tab. */
export function OverviewTab({ courseUuid, go }) {
  const { data } = useCourseGrade(courseUuid);
  const [rows, setRows] = useState(null);
  const [news, setNews] = useState([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [a, n] = await Promise.all([courseStore.getAssignments(courseUuid), courseStore.getAnnouncements(courseUuid)]);
      if (alive) { setRows(Array.isArray(a) ? a : []); setNews((Array.isArray(n) ? n : []).slice(0, 3)); }
    };
    void load();
    const events = ["studyhub-mirror-changed", "studyhub-bb-synced"];
    events.forEach((e) => window.addEventListener(e, load));
    return () => { alive = false; events.forEach((e) => window.removeEventListener(e, load)); };
  }, [courseUuid]);

  const g = useMemo(() => (data ? computeCourseGrade(data) : null), [data]);
  const groups = useMemo(() => groupAssignments(rows || []), [rows]);
  if (!g || !rows) return <div className="sh-skeleton-pulse" style={{ height: 200 }} />;
  const next = groups.todo[0];

  return (
    <div className="fd-gr">
      <div className="fd-ov-stats">
        <button type="button" className="fd-panel fd-ov-stat" onClick={() => go("grades")}>
          <span className="fd-meta">Current grade</span>
          <span className="fd-gr-big fd-num">{g.current == null ? "—" : `${formatPct(g.current)}%`}{g.letter ? <span className="fd-gr-letter">{g.letter}</span> : null}</span>
          <span className="fd-meta">{g.basis || "No grades in yet"}</span>
        </button>
        <button type="button" className="fd-panel fd-ov-stat" onClick={() => go("assignments")}>
          <span className="fd-meta">Next due</span>
          <strong className="fd-ov-next">{next ? next.title : "Nothing due"}</strong>
          <span className="fd-meta">{next?.due_date ? plainDue(next.due_date) : "You are clear"}</span>
        </button>
        <button type="button" className="fd-panel fd-ov-stat" onClick={() => go("assignments")}>
          <span className="fd-meta">Missing</span>
          <span className={`fd-gr-big fd-num${groups.missing.length ? " fd-tone-danger" : ""}`}>{groups.missing.length}</span>
          <span className="fd-meta">{groups.missing.length === 1 ? "item past due" : "items past due"}</span>
        </button>
      </div>
      <section className="fd-panel" aria-label="Latest announcements">
        <h2 className="fd-h2">Latest announcements</h2>
        {news.length ? (
          <ul className="fd-rows">
            {news.map((a) => (
              <li key={a.uuid}>
                <span className="fd-row-main">
                  <strong>{a.title}</strong>
                  <span className="fd-meta">{plainDate(a.posted_at || a.created_at)}{a.read ? "" : " · New"}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fd-meta">No announcements yet.</p>
        )}
        <button type="button" className="fd-link" onClick={() => go("announcements")}>See all announcements</button>
      </section>
    </div>
  );
}
