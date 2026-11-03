import { useState } from "react";
import { friendlyCourse } from "../dashboard/courseLabel.js";
import { BLACKBOARD_URL } from "../../constants/app.js";
import { AnnouncementsView } from "../mirror/AnnouncementsView.jsx";
import { AssignmentsView } from "../mirror/AssignmentsView.jsx";

const TABS = [
  ["assignments", "Assignments"],
  ["announcements", "Announcements"],
];

export function CourseScreen({ course, onBack }) {
  const [tab, setTab] = useState("assignments");
  return (
    <div className="fd-screen">
      <button type="button" className="fd-back" onClick={onBack}>Back</button>
      <h1 className="fd-title" title={friendlyCourse(course).raw}>{friendlyCourse(course).label}</h1>
      <p className="fd-meta">
        {[course.courseCode, course.instructor].filter(Boolean).join(" · ")}
        {" · "}
        <a href={BLACKBOARD_URL} target="_blank" rel="noopener noreferrer">Open in Blackboard</a>
      </p>
      <div className="fd-chip-row" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`fd-chip${tab === id ? " is-on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "assignments" ? <AssignmentsView courseUuid={course.uuid || course.id} /> : <AnnouncementsView courseUuid={course.uuid || course.id} />}
    </div>
  );
}
