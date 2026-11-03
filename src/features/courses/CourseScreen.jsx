import { useState } from "react";
import { friendlyCourse } from "../dashboard/courseLabel.js";
import { BLACKBOARD_URL } from "../../constants/app.js";
import { useCourseColor } from "../../shell/CourseColors.jsx";
import { GradesTab } from "../grades/GradesTab.jsx";
import { AnnouncementsView } from "../mirror/AnnouncementsView.jsx";
import { AssignmentsView } from "../mirror/AssignmentsView.jsx";
import { ContentTab } from "./ContentTab.jsx";
import { OverviewTab } from "./OverviewTab.jsx";

const TABS = [
  ["overview", "Overview"],
  ["assignments", "Assignments"],
  ["grades", "Grades"],
  ["announcements", "Announcements"],
  ["content", "Content"],
];

/** `tab` opens a specific tab first (for example "grades"). */
export function CourseScreen({ course, onBack, tab: firstTab = "overview" }) {
  const [tab, setTab] = useState(firstTab);
  const id = course.uuid || course.id;
  const color = useCourseColor(course.id);
  return (
    <div className="fd-screen" style={{ "--course": color }}>
      <button type="button" className="fd-back" onClick={onBack}>Back</button>
      <h1 className="fd-title fd-course-title" title={friendlyCourse(course).raw}>
        <span className="fd-dot" aria-hidden />
        {friendlyCourse(course).label}
      </h1>
      <p className="fd-meta">
        {[course.instructor].filter(Boolean).join(" · ")}
        {course.instructor ? " · " : ""}
        <a href={BLACKBOARD_URL} target="_blank" rel="noopener noreferrer">Open in Blackboard</a>
      </p>
      <div className="fd-chip-row" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`fd-chip${tab === key ? " is-on" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" ? <OverviewTab courseUuid={id} go={setTab} /> : null}
      {tab === "assignments" ? <AssignmentsView courseUuid={id} /> : null}
      {tab === "grades" ? <GradesTab courseUuid={id} /> : null}
      {tab === "announcements" ? <AnnouncementsView courseUuid={id} /> : null}
      {tab === "content" ? <ContentTab courseUuid={id} /> : null}
    </div>
  );
}
