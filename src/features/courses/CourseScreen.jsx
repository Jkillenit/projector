import { Button, CourseDot } from "../../components/ui/index.jsx";
import { BLACKBOARD_URL } from "../../constants/app.js";
import { useCourseStyle } from "../../shell/CourseColors.jsx";
import { routeHref } from "../../shell/useRoute.js";
import { GradesTab } from "../grades/GradesTab.jsx";
import { AnnouncementsView } from "../mirror/AnnouncementsView.jsx";
import { AssignmentsView } from "../mirror/AssignmentsView.jsx";
import { openInBlackboard } from "../mirror/openInBlackboard.js";
import { ContentTab } from "./ContentTab.jsx";
import { OverviewTab } from "./OverviewTab.jsx";

const TABS = [
  ["overview", "Overview"],
  ["assignments", "Assignments"],
  ["grades", "Grades"],
  ["announcements", "Announcements"],
  ["content", "Content"],
];

/** "202640-SS.GBA-490-911-12345" → "GBA-490-911". Empty when the id has no section. */
export function sectionCode(id) {
  const m = String(id || "").match(/([A-Z]{2,5})[-_ ]?(\d{3,4}[A-Z]?)[-_ ](\d{1,4})\b/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

/** One course: color-washed header with tabs, then the tab. `item` highlights an assignment. */
export function CourseScreen({ course, tab = "overview", item, label, actions }) {
  const id = course.uuid || course.id;
  const active = TABS.some(([k]) => k === tab) ? tab : "overview";
  const meta = [sectionCode(course.courseCode), course.term].filter(Boolean).join(" · ");
  const bbUrl = window.studyHub?.mode === "live" && course.bbCourseId ? `${BLACKBOARD_URL}/ultra/courses/${course.bbCourseId}/outline` : null;
  return (
    <div style={useCourseStyle(course.id)}>
      <header className="course-head">
        <div className="course-head-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href={routeHref("home")}>Home</a>
            <span aria-hidden> / </span>
            <span aria-current="page">{label}</span>
          </nav>
          <div className="course-title-row">
            <CourseDot size={14} />
            <h1 className="t-display" title={course.name}>{label}</h1>
            {meta ? <span className="course-section num">{meta}</span> : null}
            <Button className="course-bb" size="md" external onClick={() => openInBlackboard(bbUrl)}>Open in Blackboard</Button>
          </div>
          <nav className="course-tabs" aria-label="Course sections">
            {TABS.map(([key, text]) => (
              <a key={key} className="course-tab" href={routeHref("course", [course.id, key])} aria-current={active === key ? "page" : undefined}>
                {text}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <div className="page course-body">
        {active === "overview" ? <OverviewTab courseUuid={id} courseId={course.id} code={label} actions={actions} /> : null}
        {active === "assignments" ? <AssignmentsView courseUuid={id} code={label} highlight={item} /> : null}
        {active === "grades" ? <GradesTab courseUuid={id} /> : null}
        {active === "announcements" ? <AnnouncementsView courseUuid={id} /> : null}
        {active === "content" ? <ContentTab courseUuid={id} /> : null}
      </div>
    </div>
  );
}
