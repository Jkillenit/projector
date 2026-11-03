import { useCourseColor } from "../../shell/CourseColors.jsx";
import { whenText } from "./dueSoon.js";

const GROUPS = [
  ["overdue", "Overdue"],
  ["today", "Today"],
  ["tomorrow", "Tomorrow"],
  ["week", "This week"],
];

function Row({ a, course, overdue, onOpen, onDone }) {
  const color = useCourseColor(a.course_uuid);
  return (
    <li className="fd-due-row" style={{ "--course": color }}>
      <span className="fd-due-main">
        <strong>{a.title}</strong>
        <span className="fd-chip-course" title={course?.hint}>{course?.code || "Course"}</span>
      </span>
      <span className={`fd-due-when${overdue ? " is-late" : ""}`}>{whenText(a.due_date)}</span>
      <span className="fd-due-actions">
        {overdue ? <button type="button" className="fd-btn-quiet" onClick={() => onDone(a)}>Mark done</button> : null}
        <button type="button" className="fd-btn-quiet" onClick={() => onOpen(a)}>Open</button>
      </span>
    </li>
  );
}

/** Open work from every class: Overdue (only when there is some), Today, Tomorrow, This week. No filled button here. */
export function DueSoon({ due, cards, onOpen, onDone }) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const shown = GROUPS.filter(([key]) => due[key].length);
  return (
    <section className="fd-panel" aria-label="Due soon">
      <h2 className="fd-h2">Due soon</h2>
      {shown.length ? (
        shown.map(([key, label]) => (
          <div key={key} className="fd-due-group">
            <h3 className="fd-due-label">{label}</h3>
            <ul className="fd-due-list">
              {due[key].map((a) => (
                <Row key={a.uuid} a={a} course={byId.get(a.course_uuid)} overdue={key === "overdue"} onOpen={onOpen} onDone={onDone} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p className="fd-meta">Nothing due in the next 7 days. Good time to get ahead.</p>
      )}
    </section>
  );
}
