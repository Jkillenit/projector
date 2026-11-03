import { syncedAgo } from "../today/syncedAgo.js";
import { useStaySynced } from "./useStaySynced.js";

const STEP = { contents: "content", announcements: "announcements", grades: "grades", syllabus: "syllabus" };

function line(r) {
  if (r.error) return `${r.name}: sync failed`;
  const syl = r.syllabus ? `syllabus found (${r.syllabus})` : "no syllabus found";
  return `${r.name}: ${syl} · ${r.weights} weights · ${r.mapped} grade items mapped`;
}

/** Live mode only: "Synced 5m ago · Sync now", progress while it runs, and a counts-only report. */
export function SyncBar() {
  const { available, loggedIn, running, progress, lastSyncAt, error, report, toast, enrollments, syncNow } = useStaySynced();
  if (!available || (!loggedIn && !running)) return null;
  return (
    <div className="fd-syncbar" role="status">
      <span title={running ? progress?.hint : undefined}>
        {running
          ? `Syncing ${progress?.name || "your courses"}${progress?.total ? ` (${progress.index} of ${progress.total})` : ""}${STEP[progress?.step] ? ` · ${STEP[progress.step]}` : ""}…`
          : syncedAgo(lastSyncAt) || "Not synced yet"}
      </span>
      {!running && (
        <button type="button" className="fd-btn fd-btn--small" onClick={syncNow}>
          Sync now
        </button>
      )}
      {toast && <span role="status">{toast}</span>}
      {error && <span className="fd-syncbar-error">{error}</span>}
      {!running && enrollments.length > 0 && (
        <details>
          <summary>Every course Blackboard returned</summary>
          <ul>{enrollments.map((e, i) => <li key={i} title={e.hint}>{e.name} · {e.line} → {e.reason}</li>)}</ul>
        </details>
      )}
      {!running && report.length > 0 && (
        <details>
          <summary>Report</summary>
          <ul>{report.map((r) => <li key={r.name} title={r.hint}>{line(r)}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
