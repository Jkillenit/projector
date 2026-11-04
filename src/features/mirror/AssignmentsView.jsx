import { useCallback, useEffect, useState } from "react";
import { Card, Icon, Skeleton } from "../../components/ui/index.jsx";
import { TaskLine } from "../../components/TaskLine.jsx";
import { courseStore } from "../../db/courseStore.js";
import { groupAssignments } from "./assignmentState.js";
import { openInBlackboard } from "./openInBlackboard.js";

function Group({ label, items, open: startOpen, code, highlight, onToggle }) {
  return (
    <details className="asg-group" open={startOpen || items.some((a) => a.uuid === highlight)}>
      <summary className="asg-summary">
        <Icon name="chevron-right" size={16} className="asg-caret" />
        <span className="t-heading">{label}</span>
        <span className="num t-faint">{items.length}</span>
      </summary>
      {items.length ? (
        <div className="rows-tight">
          {items.map((a) => <TaskLine key={a.uuid} a={a} code={code} highlight={a.uuid === highlight} onToggle={onToggle} onOpen={(x) => openInBlackboard(x.url)} external />)}
        </div>
      ) : (
        <p className="t-small t-muted asg-empty">Nothing here.</p>
      )}
    </details>
  );
}

/** To do, Missing and Done, each with a count and collapsible. Rows open in Blackboard; the box marks done. */
export function AssignmentsView({ courseUuid, code, highlight }) {
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    const res = await courseStore.getAssignments(courseUuid);
    setRows((Array.isArray(res) ? res : []).map((r) => ({ ...r, course_uuid: courseUuid })));
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

  const toggle = async (a) => {
    await courseStore.setAssignmentCompleted(a.uuid, !a.completed);
  };

  if (rows === null) return <Card><Skeleton height={56} /><Skeleton height={56} /><Skeleton height={56} /></Card>;
  if (!rows.length) return <Card><p className="t-muted">No assignments yet. They show up after the next sync.</p></Card>;
  const groups = groupAssignments(rows);

  return (
    <Card className="asg">
      <Group label="To do" items={groups.todo} open code={code} highlight={highlight} onToggle={toggle} />
      <Group label="Missing" items={groups.missing} open code={code} highlight={highlight} onToggle={toggle} />
      <Group label="Done" items={groups.done} code={code} highlight={highlight} onToggle={toggle} />
    </Card>
  );
}
