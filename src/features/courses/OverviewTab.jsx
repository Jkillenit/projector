import { useEffect, useMemo, useState } from "react";
import { Card, Skeleton, TextLink } from "../../components/ui/index.jsx";
import { TaskLine } from "../../components/TaskLine.jsx";
import { courseStore } from "../../db/courseStore.js";
import { plainDate } from "../../lib/dates.js";
import { routeHref } from "../../shell/useRoute.js";
import { groupAssignments } from "../mirror/assignmentState.js";

const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Next 3 due items, the latest announcement and quick links to the other tabs. */
export function OverviewTab({ courseUuid, courseId, code }) {
  const [rows, setRows] = useState(null);
  const [news, setNews] = useState([]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [a, n] = await Promise.all([courseStore.getAssignments(courseUuid), courseStore.getAnnouncements(courseUuid)]);
      if (alive) {
        setRows((Array.isArray(a) ? a : []).map((r) => ({ ...r, course_uuid: courseUuid })));
        setNews(Array.isArray(n) ? n : []);
      }
    };
    void load();
    const events = ["studyhub-mirror-changed", "studyhub-bb-synced"];
    events.forEach((e) => window.addEventListener(e, load));
    return () => {
      alive = false;
      events.forEach((e) => window.removeEventListener(e, load));
    };
  }, [courseUuid]);

  const groups = useMemo(() => groupAssignments(rows || []), [rows]);
  if (!rows) return <Card><Skeleton height={56} /><Skeleton height={56} /></Card>;
  const latest = news[0];
  const href = (tab, query) => routeHref("course", [courseId, tab], query);

  return (
    <div className="split">
      <div className="split-main">
        <Card aria-labelledby="ov-next">
          <div className="card-head">
            <h2 id="ov-next" className="t-heading">Next up</h2>
            <TextLink href={href("assignments")} arrow>All assignments</TextLink>
          </div>
          {groups.todo.length ? (
            <div className="rows-tight">
              {groups.todo.slice(0, 3).map((a) => <TaskLine key={a.uuid} a={a} code={code} href={href("assignments", { item: a.uuid })} />)}
            </div>
          ) : (
            <p className="t-muted">Nothing due. You are clear.</p>
          )}
          {groups.missing.length ? <TextLink href={href("assignments")} arrow>{groups.missing.length} missing</TextLink> : null}
        </Card>
      </div>
      <div className="split-side">
        <Card aria-labelledby="ov-news">
          <div className="card-head">
            <h2 id="ov-news" className="t-heading">Latest announcement</h2>
            <TextLink href={href("announcements")} arrow>All</TextLink>
          </div>
          {latest ? (
            <div className="ann-preview">
              <span className="ann-title">{latest.title}</span>
              <span className="ann-date num">{plainDate(latest.posted_at || latest.created_at)}</span>
              <p className="clamp-3 t-small">{plain(latest.body) || "No text."}</p>
            </div>
          ) : (
            <p className="t-muted">No announcements yet.</p>
          )}
        </Card>
        <Card aria-label="Quick links">
          <div className="quick-links">
            <TextLink href={href("grades")} arrow>Grades and what you need</TextLink>
            <TextLink href={href("content")} arrow>Course content</TextLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
