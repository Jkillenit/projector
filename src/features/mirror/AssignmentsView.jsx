import { useCallback, useEffect, useState } from "react";
import { dueLabel } from "../dashboard/dateLabels.js";
import { groupAssignments, isDone } from "./assignmentState.js";
import { KindTag } from "../dashboard/KindTag.jsx";
import { openInBlackboard } from "./openInBlackboard.js";
import { courseStore } from "../../db/courseStore.js";

function AssignmentRow({ a, onToggle, onDelete }) {
  const done = isDone(a);
  const overdue = !done && a.due_date && Date.parse(a.due_date) < Date.now();
  const scored = a.score != null && a.points_possible;
  return (
    <li className={`sh-today-row sh-asg-row${done ? " sh-asg-row--done" : ""}`}>
      <input
        type="checkbox"
        className="sh-today-check"
        aria-label={`Mark ${a.title} ${done ? "not done" : "done"}`}
        checked={done}
        disabled={done && !a.completed}
        onChange={() => onToggle(a)}
      />
      <span className="sh-today-row-main">
        <span className="sh-today-row-title">
          <KindTag kind={a.kind} />
          {a.title}
        </span>
        <span className="sh-today-row-sub">
          {a.source === "manual" ? "ADDED BY YOU" : "BLACKBOARD"}
          {a.points_possible ? ` · ${a.points_possible} PTS` : ""}
          {scored ? ` · SCORED ${a.score}/${a.points_possible}` : ""}
        </span>
      </span>
      <span className={`sh-today-when${overdue ? " sh-today-when--overdue" : ""}`}>
        {a.due_date ? dueLabel(a.due_date) : "—"}
      </span>
      {a.url ? (
        <button type="button" className="sh-asg-action" onClick={() => openInBlackboard(a.url)} title="Open in Blackboard">
          OPEN
        </button>
      ) : null}
      {a.source === "manual" ? (
        <button type="button" className="sh-asg-action sh-asg-action--danger" onClick={() => onDelete(a)} title="Delete">
          ✕
        </button>
      ) : null}
    </li>
  );
}

function AssignmentGroups({ groups, onToggle, onDelete }) {
  const list = (items) => (
    <ul className="sh-today-list">
      {items.map((a) => (
        <AssignmentRow key={a.uuid} a={a} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
  return (
    <>
      {[["TO DO", groups.todo], ["MISSING", groups.missing]].map(([label, items]) =>
        items.length ? (
          <div key={label} className="sh-mirror-group">
            <div className="sh-hub-section-label">
              {label} · {items.length}
            </div>
            {list(items)}
          </div>
        ) : null
      )}
      {groups.done.length ? (
        <details className="sh-mirror-group">
          <summary className="sh-hub-section-label">DONE · {groups.done.length}</summary>
          {list(groups.done)}
        </details>
      ) : null}
    </>
  );
}

export function AssignmentsView({ courseUuid }) {
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    const res = await courseStore.getAssignments(courseUuid);
    setRows(Array.isArray(res) ? res : []);
  }, [courseUuid]);

  useEffect(() => {
    void load();
    const onChange = (e) => {
      if (!e.detail?.courseUuid || e.detail.courseUuid === courseUuid) void load();
    };
    window.addEventListener("studyhub-bb-synced", onChange);
    window.addEventListener("studyhub-mirror-changed", onChange);
    return () => {
      window.removeEventListener("studyhub-bb-synced", onChange);
      window.removeEventListener("studyhub-mirror-changed", onChange);
    };
  }, [courseUuid, load]);

  const notify = () => window.dispatchEvent(new CustomEvent("studyhub-mirror-changed", { detail: { courseUuid } }));

  const toggle = async (a) => {
    await courseStore.setAssignmentCompleted(a.uuid, !a.completed);
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    await courseStore.deleteAssignment(a.uuid);
    notify();
  };

  if (rows === null) return <div className="sh-skeleton-pulse" style={{ height: 200 }} />;

  return (
    <div className="main-content sh-mirror-view">
      <div className="sh-mirror-head">
        <div className="sh-section-label">Assignments</div>
      </div>
      {!rows.length ? (
        <p className="sh-today-empty">No assignments yet. Nothing is due here.</p>
      ) : (
        <AssignmentGroups groups={groupAssignments(rows)} onToggle={toggle} onDelete={remove} />
      )}
    </div>
  );
}
