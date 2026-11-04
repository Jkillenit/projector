import { syncedAgo } from "../today/syncedAgo.js";
import { Button } from "../../components/ui/index.jsx";

const STEP = { contents: "content", announcements: "announcements", grades: "grades", syllabus: "syllabus" };

function line(r) {
  if (r.error) return `${r.name}: sync failed`;
  if (!r.full) return `${r.name}: light sync · ${r.counts?.assignments ?? 0} due · ${r.counts?.grades ?? 0} grade items`;
  if (r.syllabus === "pending") return `${r.name}: ${r.counts?.assignments ?? 0} due · looking for the syllabus…`;
  if (r.syllabus === "cached") return `${r.name}: syllabus unchanged`;
  if (!r.syllabus) return `${r.name}: no syllabus found`;
  return `${r.name}: syllabus found (${r.syllabus}) · ${r.weights} weights · ${r.mapped} grade items mapped`;
}

const seconds = (ms) => `${Math.max(1, Math.round(ms / 1000))}s`;

function timingText(t) {
  if (!t?.land) return "";
  const syl = t.syllabus ? `, syllabus done after ${seconds(t.syllabus)}` : "";
  return `${t.kind === "full" ? "Full" : "Light"} sync: courses in ${seconds(t.land)}${syl}`;
}

/** Live mode only, in Settings: last sync, Sync now, progress and a counts-only report. `sync` is useStaySynced(). */
export function SyncBar({ sync }) {
  const { available, loggedIn, running, progress, lastSyncAt, error, report, toast, enrollments, timing, syncNow } = sync;
  if (!available || (!loggedIn && !running)) return null;
  return (
    <div className="stack" role="status">
      <div className="card-head">
        <span className="t-small t-muted" title={running ? progress?.hint : undefined}>
          {running
            ? `Syncing ${progress?.name || "your courses"}${progress?.total ? ` (${progress.index} of ${progress.total})` : ""}${STEP[progress?.step] ? ` · ${STEP[progress.step]}` : ""}…`
            : syncedAgo(lastSyncAt) || "Not synced yet"}
        </span>
        {!running && <Button variant="outline-sm" size="sm" onClick={syncNow}>Sync now</Button>}
      </div>
      {toast && <p className="t-small t-muted">{toast}</p>}
      {error && <p className="t-small set-error">{error}</p>}
      {!running && timing?.land && <p className="t-small t-faint">{timingText(timing)}</p>}
      {!running && enrollments.length > 0 && (
        <details className="set-details">
          <summary>Every course Blackboard returned</summary>
          <ul>{enrollments.map((e, i) => <li key={i} title={e.hint}>{e.name} · {e.line} → {e.reason}</li>)}</ul>
        </details>
      )}
      {report.length > 0 && (
        <details className="set-details">
          <summary>Report</summary>
          <ul>{report.map((r) => <li key={r.name} title={r.hint}>{line(r)}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
