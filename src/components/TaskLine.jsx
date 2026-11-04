import { useEffect, useRef } from "react";
import { CodeTag, CourseDot, Icon, Pill } from "./ui/index.jsx";
import { useCourseStyle } from "../shell/CourseColors.jsx";
import { isDone } from "../features/mirror/assignmentState.js";
import { dueText, kindLabel, timeLeft } from "../features/frontdoor/homeView.js";

/**
 * One assignment in the Tonight row style. The row opens `href` (a route) or calls `onOpen`
 * (for example Open in Blackboard). `onToggle` adds a done checkbox. `highlight` scrolls it into view.
 * `a`: { uuid, title, kind, due_date, course_uuid, points_possible, score, completed, submitted }.
 */
export function TaskLine({ a, code, href, onOpen, onToggle, highlight, external }) {
  const ref = useRef(null);
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: "center" });
  }, [highlight]);
  const done = isDone(a);
  const missing = !done && a.due_date && Date.parse(a.due_date) < Date.now();
  const due = a.due_date ? dueText(a.due_date) : { text: "No due date" };
  const Main = href ? "a" : "button";
  return (
    <div ref={ref} className={`ui-row task-line${highlight ? " is-hl" : ""}${done ? " is-done" : ""}`} style={useCourseStyle(a.course_uuid)}>
      {onToggle ? (
        <input type="checkbox" className="task-check" checked={done} disabled={done && !a.completed} aria-label={`Mark ${a.title} ${done ? "not done" : "done"}`} onChange={() => onToggle(a)} />
      ) : (
        <CourseDot size={10} />
      )}
      <Main className="task-open" {...(href ? { href } : { type: "button", onClick: () => onOpen?.(a) })}>
        <span className="ui-row-main">
          <span className="ui-row-title">{a.title}</span>
          <span className="ui-meta">
            {code ? <CodeTag>{code}</CodeTag> : null}
            <span>{kindLabel(a.kind, a.title)}</span>
            {missing ? <Pill tone="accent" inline>Missing</Pill> : due.today && !done ? <Pill tone="accent" inline>{due.text}</Pill> : <span>{due.text}</span>}
            {a.score != null && a.points_possible ? <span className="num">{a.score}/{a.points_possible}</span> : null}
          </span>
        </span>
        {!done && a.due_date && !missing ? <span className="ui-left">{timeLeft(a.due_date)}</span> : null}
        <Icon name={external ? "arrow-up-right" : "chevron-right"} size={16} className="ui-chev" />
      </Main>
    </div>
  );
}
